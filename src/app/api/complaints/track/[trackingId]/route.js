import { createServerClient } from "@supabase/ssr";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";
import { runDeadlineEscalation } from "@/lib/deadline-escalation";

function toUtcIso(value) {
    if (!value) return value;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

    if (typeof value === "string") {
        const trimmed = value.trim();
        const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
        const withZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`;
        const retry = new Date(withZone);
        if (!Number.isNaN(retry.getTime())) return retry.toISOString();
    }

    return value;
}

// GET — Fetch complaint by tracking ID (public, no auth)
export async function GET(_request, { params }) {
    try {
        const { trackingId } = await params;
        const normalizedTrackingId = decodeURIComponent(trackingId || "").trim();
        if (!normalizedTrackingId) return apiError("Tracking ID is required", 400);

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const key = serviceKey || anonKey;

        if (!url || !key) {
            return apiError("Supabase is not configured", 500);
        }

        const supabase = createServerClient(url, key, {
            cookies: {
                getAll() { return []; },
                setAll() { },
            },
        });

        const { data: basicComplaint, error: basicErr } = await supabase
            .from("complaints")
            .select("id")
            .ilike("tracking_id", normalizedTrackingId)
            .maybeSingle();

        if (basicErr) throw basicErr;
        if (!basicComplaint) return apiError("Complaint not found", 404);

        try {
            await runDeadlineEscalation(supabase, { complaintId: basicComplaint.id });
        } catch {
            // Escalation errors (e.g. pending DB migrations) must not block the tracking response.
        }

        const { data, error } = await supabase
            .from("complaints")
            .select(
                `*,
         local_bodies(name, code, district),
         complaint_images(*),
         status_logs(*, profiles(name, role)),
              assignee:profiles!assigned_to(id, name, role)`,
            )
            .ilike("tracking_id", normalizedTrackingId)
            .order("changed_at", { referencedTable: "status_logs", ascending: true })
            .maybeSingle();

        if (error) throw error;
        if (!data) return apiError("Complaint not found", 404);

        const bucket = process.env.NEXT_PUBLIC_SUPABASE_ATTACHMENTS_BUCKET || "complaint-images";
        const images = Array.isArray(data.complaint_images) ? data.complaint_images : [];
        const storagePaths = images
            .map((img) => img?.storage_path)
            .filter((path) => typeof path === "string" && path.length > 0);

        let signedByPath = new Map();
        if (storagePaths.length > 0) {
            const { data: signedUrls, error: signedErr } = await supabase.storage
                .from(bucket)
                .createSignedUrls(storagePaths, 60 * 60 * 24 * 7);

            if (!signedErr && Array.isArray(signedUrls)) {
                signedByPath = new Map(
                    storagePaths.map((path, index) => [path, signedUrls[index]?.signedUrl || ""]),
                );
            }
        }

        const normalizedImages = images.map((img) => ({
            ...img,
            image_url: signedByPath.get(img.storage_path) || img.image_url,
        }));

        const { data: latestSupportReport } = await supabase
            .from("complaint_support_reports")
            .select("created_at")
            .eq("complaint_id", data.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        const normalizedStatusLogs = Array.isArray(data.status_logs)
            ? data.status_logs.map((log) => ({
                ...log,
                changed_at: toUtcIso(log?.changed_at),
                created_at: toUtcIso(log?.created_at),
            }))
            : data.status_logs;

        const normalizedData = {
            ...data,
            created_at: toUtcIso(data.created_at),
            updated_at: toUtcIso(data.updated_at),
            resolved_at: toUtcIso(data.resolved_at),
            resolution_deadline: toUtcIso(data.resolution_deadline),
            last_escalated_at: toUtcIso(data.last_escalated_at),
            latest_reported_at: toUtcIso(latestSupportReport?.created_at) || toUtcIso(data.created_at),
            status_logs: normalizedStatusLogs,
        };

        return apiSuccess({
            ...normalizedData,
            complaint_images: normalizedImages,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
