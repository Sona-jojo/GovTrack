import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/error-handler";
import { requireAdminAccess } from "@/lib/api/admin-access";
import { createServiceSupabase } from "@/lib/api/staff-management";

const ChangePasswordSchema = z.object({
  profileId: z.string().trim().min(1),
  newPassword: z.string().trim().min(8),
});

export async function PATCH(request) {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const parsed = ChangePasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid password payload", 400);
    }

    const profileId = parsed.data.profileId.trim();
    const newPassword = parsed.data.newPassword.trim();
    const serviceSupabase = createServiceSupabase();

    const { data: targetProfile, error: targetError } = await serviceSupabase
      .from("profiles")
      .select("id, name, role")
      .eq("id", profileId)
      .single();

    if (targetError || !targetProfile) {
      return apiError("Staff member not found", 404);
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(profileId, {
      password: newPassword,
    });

    if (updateError) throw updateError;

    return apiSuccess(
      {
        id: targetProfile.id,
        name: targetProfile.name,
        role: targetProfile.role,
      },
      "Password updated",
    );
  } catch (err) {
    return handleApiError(err);
  }
}