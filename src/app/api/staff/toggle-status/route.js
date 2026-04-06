import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/error-handler";
import { requireAdminAccess } from "@/lib/api/admin-access";
import { createServiceSupabase, normalizeStaffStatus } from "@/lib/api/staff-management";

const ToggleStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: z.string().trim().optional(),
});

export async function PATCH(request) {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const parsed = ToggleStatusSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid status payload", 400);
    }

    const id = parsed.data.id.trim();
    const serviceSupabase = createServiceSupabase();

    const { data: currentProfile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("id, status")
      .eq("id", id)
      .single();

    if (profileError || !currentProfile) {
      return apiError("Staff member not found", 404);
    }

    const nextStatus = parsed.data.status
      ? normalizeStaffStatus(parsed.data.status)
      : currentProfile.status === "active"
        ? "inactive"
        : "active";

    const { error: updateError } = await serviceSupabase
      .from("profiles")
      .update({ status: nextStatus })
      .eq("id", id);

    if (updateError) throw updateError;

    return apiSuccess({ id, status: nextStatus }, "Staff status updated");
  } catch (err) {
    return handleApiError(err);
  }
}