import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";
import { MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { createHash } from "crypto";

// POST — Upload proof image for a complaint (auth required)
export async function POST(request, { params }) {
    try {
        const cookieStore = await cookies();
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const authSupabase = createServerClient(url, anonKey, {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll() { },
            },
        });

        const dataSupabase = createServerClient(url, serviceKey || anonKey, {
            cookies: {
                getAll() { return []; },
                setAll() { },
            },
        });

        const anonAuthSupabase = createServerClient(url, anonKey, {
            cookies: {
                getAll() { return []; },
                setAll() { },
            },
        });

        const { id } = await params;

        const formData = await request.formData();
        const file = formData.get("file");
        if (!file || !(file instanceof File)) {
            return apiError("No file provided", 400);
        }

        const imageType = formData.get("image_type") || "issue";
        if (!["issue", "proof"].includes(imageType)) {
            return apiError("Invalid image_type. Use 'issue' or 'proof'", 400);
        }

        // Validate complaint exists
        const { data: complaint } = await dataSupabase
            .from("complaints")
            .select("id, assigned_to, local_body_id")
            .eq("id", id)
            .single();
        if (!complaint) return apiError("Complaint not found", 404);

        let user = null;
        let profile = null;

        // Proof uploads remain restricted to secretary or assigned staff
        if (imageType === "proof") {
            const authHeader = request.headers.get("authorization") || "";
            const bearerToken = authHeader.startsWith("Bearer ")
                ? authHeader.slice(7).trim()
                : "";

            if (bearerToken) {
                const { data } = await anonAuthSupabase.auth.getUser(bearerToken);
                user = data?.user || null;
            }

            if (!user) {
                const { data: authData } = await authSupabase.auth.getUser();
                user = authData?.user || null;
            }

            if (!user) return apiError("Unauthorized", 401);

            // Use service role to bypass RLS on profiles
            const { data: userProfile } = await dataSupabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();
            profile = userProfile;
            if (!profile) return apiError("Profile not found", 403);

            // Get full complaint data to check assigned_role
            const { data: fullComplaint } = await dataSupabase
                .from("complaints")
                .select("assigned_to, assigned_role, local_body_id")
                .eq("id", id)
                .single();

            const isSecretary = profile.role === "secretary" && fullComplaint?.local_body_id === profile.local_body_id;
            const isDirectlyAssigned = fullComplaint?.assigned_to === user.id;

            if (!isSecretary && !isDirectlyAssigned) {
                return apiError("Not authorized to upload for this complaint", 403);
            }
        }

        // Validate type and size
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return apiError("Only JPEG and PNG images are allowed", 400);
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            return apiError("Image must be under 5 MB", 400);
        }

        const fileBytes = Buffer.from(await file.arrayBuffer());
        const contentHash = createHash("sha256").update(fileBytes).digest("hex");

        // Deterministic path prevents duplicate rows for the exact same file content.
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const uniqueName = `${contentHash.slice(0, 24)}.${ext}`;
        const storagePath = `${id}/${imageType}/${uniqueName}`;
        const bucket = process.env.NEXT_PUBLIC_SUPABASE_ATTACHMENTS_BUCKET || "complaint-images";

        const { data: existingByPath } = await dataSupabase
            .from("complaint_images")
            .select("*")
            .eq("complaint_id", id)
            .eq("image_type", imageType)
            .eq("storage_path", storagePath)
            .maybeSingle();

        if (existingByPath) {
            return apiSuccess(existingByPath, "Image already uploaded", 200);
        }

        const { error: uploadErr } = await dataSupabase.storage
            .from(bucket)
            .upload(storagePath, fileBytes, { upsert: false, contentType: file.type || undefined });

        if (uploadErr) {
            const { data: existingAfterConflict } = await dataSupabase
                .from("complaint_images")
                .select("*")
                .eq("complaint_id", id)
                .eq("image_type", imageType)
                .eq("storage_path", storagePath)
                .maybeSingle();

            if (existingAfterConflict) {
                return apiSuccess(existingAfterConflict, "Image already uploaded", 200);
            }

            throw uploadErr;
        }

        // Public URL (permanent, never expires)
        const { data: publicData } = dataSupabase.storage
            .from(bucket)
            .getPublicUrl(storagePath);

        const publicUrl = publicData?.publicUrl || "";

        // Insert DB record
        const { data: existingAfterUpload } = await dataSupabase
            .from("complaint_images")
            .select("*")
            .eq("complaint_id", id)
            .eq("image_type", imageType)
            .eq("storage_path", storagePath)
            .maybeSingle();

        if (existingAfterUpload) {
            return apiSuccess(existingAfterUpload, "Image uploaded", 200);
        }

        const { data: imageRow, error: dbErr } = await dataSupabase
            .from("complaint_images")
            .insert({
                complaint_id: id,
                image_url: publicUrl,
                storage_path: storagePath,
                image_type: imageType,
                uploaded_by: user?.id || null,
            })
            .select()
            .single();
        if (dbErr) throw dbErr;

        // Audit log
        if (user?.id) {
            await dataSupabase.from("audit_logs").insert({
                user_id: user.id,
                action_type: "image_upload",
                target_table: "complaint_images",
                target_id: imageRow.id,
                meta: { complaint_id: id, image_type: imageType },
            });
        }

        return apiSuccess(imageRow, "Image uploaded", 201);
    } catch (err) {
        return handleApiError(err);
    }
}
