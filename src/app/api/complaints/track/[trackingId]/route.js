import { createServerClient } from "@supabase/ssr";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";
import { runDeadlineEscalation } from "@/lib/deadline-escalation";

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

        return apiSuccess({
            ...data,
            complaint_images: normalizedImages,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
