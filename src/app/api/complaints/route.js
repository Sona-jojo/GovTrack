import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";
import { z } from "zod";

const nullableText = z.string().optional().nullable();

const optionalLatitude = z.preprocess(
    (value) => {
        if (value === null || value === undefined || value === "") return undefined;
        if (typeof value === "string") return Number(value);
        return value;
    },
    z.number().min(-90).max(90).optional(),
);

const optionalLongitude = z.preprocess(
    (value) => {
        if (value === null || value === undefined || value === "") return undefined;
        if (typeof value === "string") return Number(value);
        return value;
    },
    z.number().min(-180).max(180).optional(),
);

const complaintSchema = z.object({
    local_body_id: z.string().uuid(),
    category: z.string().min(1),
    sub_category: nullableText,
    description: z.string().min(5),
    priority: z.enum(["low", "high", "urgent"]).default("low"),
    reporter_name: nullableText,
    reporter_phone: nullableText,
    reporter_email: z.string().email().optional().nullable().or(z.literal("")),
    is_anonymous: z.boolean().default(false),
    latitude: optionalLatitude,
    longitude: optionalLongitude,
    location_text: nullableText,
    district: nullableText,
    panchayath: nullableText,
});

const ACTIVE_STATUSES = [
    "pending",
    "submitted",
    "under_review",
    "assigned",
    "inspection_scheduled",
    "in_progress",
    "partially_resolved",
    "on_hold",
];

function normalizeText(value) {
    return (value || "").toString().trim().toLowerCase();
}

function hasCoordinates(lat, lng) {
    return typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng);
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function distanceInMeters(lat1, lng1, lat2, lng2) {
    const earthRadius = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
}

function isLocationMatch(existing, incoming) {
    const incomingLat = incoming.latitude;
    const incomingLng = incoming.longitude;
    const existingLat = typeof existing.latitude === "number" ? existing.latitude : Number(existing.latitude);
    const existingLng = typeof existing.longitude === "number" ? existing.longitude : Number(existing.longitude);

    if (hasCoordinates(incomingLat, incomingLng) && hasCoordinates(existingLat, existingLng)) {
        return distanceInMeters(incomingLat, incomingLng, existingLat, existingLng) <= 100;
    }

    const incomingLocationText = normalizeText(incoming.location_text);
    const existingLocationText = normalizeText(existing.location_text);
    return Boolean(incomingLocationText && existingLocationText && incomingLocationText === existingLocationText);
}

function isSubCategoryMatch(existing, incoming) {
    const incomingSubCategory = normalizeText(incoming.sub_category);
    const existingSubCategory = normalizeText(existing.sub_category);

    if (!incomingSubCategory && !existingSubCategory) return true;
    return incomingSubCategory === existingSubCategory;
}

// POST — Create complaint (public, no auth required)
export async function POST(request) {
    try {
        const body = await request.json();
        const parsed = complaintSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(
                "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", "),
                422,
            );
        }

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // Use service role key for server-side insert (bypasses RLS for tracking ID generation)
        const supabase = createServerClient(url, serviceKey || anonKey, {
            cookies: {
                getAll() { return []; },
                setAll() { },
            },
        });

        const duplicateCandidatesQuery = supabase
            .from("complaints")
            .select("id, tracking_id, status, support_count, sub_category, latitude, longitude, location_text")
            .eq("local_body_id", parsed.data.local_body_id)
            .eq("category", parsed.data.category)
            .in("status", ACTIVE_STATUSES)
            .order("created_at", { ascending: false })
            .limit(100);

        const { data: duplicateCandidates, error: candidateErr } = await duplicateCandidatesQuery;
        if (candidateErr) throw candidateErr;

        const duplicateComplaint = (duplicateCandidates || []).find((candidate) => {
            return isSubCategoryMatch(candidate, parsed.data) && isLocationMatch(candidate, parsed.data);
        });

        if (duplicateComplaint) {
            const currentSupportCount = Number(duplicateComplaint.support_count) || 1;
            const nextSupportCount = currentSupportCount + 1;

            const { error: supportCountErr } = await supabase
                .from("complaints")
                .update({ support_count: nextSupportCount })
                .eq("id", duplicateComplaint.id);
            if (supportCountErr) throw supportCountErr;

            await supabase.from("complaint_support_reports").insert({
                complaint_id: duplicateComplaint.id,
                reporter_name: parsed.data.reporter_name,
                reporter_phone: parsed.data.reporter_phone,
                reporter_email: parsed.data.reporter_email || null,
                is_anonymous: parsed.data.is_anonymous,
                description: parsed.data.description,
                latitude: parsed.data.latitude,
                longitude: parsed.data.longitude,
                location_text: parsed.data.location_text,
                category: parsed.data.category,
                sub_category: parsed.data.sub_category,
            });

            await supabase.from("notifications").insert({
                complaint_id: duplicateComplaint.id,
                message: `Complaint ${duplicateComplaint.tracking_id} received a duplicate citizen report.`,
                channel: "in_app",
                template: "duplicate_reported",
                status: "pending",
            });

            return apiSuccess(
                {
                    id: duplicateComplaint.id,
                    tracking_id: duplicateComplaint.tracking_id,
                    is_duplicate: true,
                    support_count: nextSupportCount,
                    message: "This issue has already been reported by another citizen. Your report has been added to the existing complaint.",
                },
                "Duplicate complaint linked to existing issue",
                200,
            );
        }

        // Generate tracking ID for a new complaint
        const { data: trackingId, error: idErr } = await supabase.rpc(
            "next_tracking_id",
            { p_local_body_id: parsed.data.local_body_id },
        );
        if (idErr) throw idErr;

        const record = {
            tracking_id: trackingId,
            ...parsed.data,
            status: "submitted",
        };

        const { data, error } = await supabase
            .from("complaints")
            .insert(record)
            .select("id, tracking_id, support_count")
            .single();
        if (error) throw error;

        // Create notification
        await supabase.from("notifications").insert({
            complaint_id: data.id,
            message: `New complaint ${trackingId} submitted in ${parsed.data.category}.`,
            channel: "in_app",
            template: "submitted",
            status: "pending",
        });

        return apiSuccess({ ...data, is_duplicate: false }, "Complaint submitted successfully", 201);
    } catch (err) {
        return handleApiError(err);
    }
}
