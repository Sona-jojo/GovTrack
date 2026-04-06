import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/error-handler";
import { requireAdminAccess } from "@/lib/api/admin-access";
import {
  createServiceSupabase,
  findDuplicateStaff,
  normalizeContact,
  normalizeStaffRole,
  normalizeStaffStatus,
  isEmailContact,
} from "@/lib/api/staff-management";

const UpdateStaffSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(2).max(120),
  role: z.string().trim().min(1),
  contact: z.string().trim().min(3).max(120),
  localBodyId: z.string().trim().min(1),
  status: z.string().trim().optional(),
});

export async function PATCH(request) {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const parsed = UpdateStaffSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid staff payload", 400);
    }

    const id = parsed.data.id.trim();
    const name = parsed.data.name.trim();
    const role = normalizeStaffRole(parsed.data.role);
    const contact = normalizeContact(parsed.data.contact);
    const localBodyId = parsed.data.localBodyId.trim();
    const status = normalizeStaffStatus(parsed.data.status);

    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, role, contact, local_body_id, status")
      .eq("id", id)
      .single();

    if (profileError || !currentProfile) {
      return apiError("Staff member not found", 404);
    }

    const duplicate = await findDuplicateStaff(supabase, {
      name,
      contact,
      role,
      localBodyId,
      excludeId: id,
    });

    if (duplicate) {
      return apiError("Duplicate staff member already exists for this local body", 409);
    }

    const serviceSupabase = createServiceSupabase();
    const { data: localBody, error: localBodyError } = await serviceSupabase
      .from("local_bodies")
      .select("id, name, code")
      .eq("id", localBodyId)
      .single();

    if (localBodyError || !localBody) {
      return apiError("Local body not found", 404);
    }

    if (isEmailContact(contact)) {
      const { error: emailUpdateError } = await supabase.auth.admin.updateUserById(id, {
        email: contact,
      });
      if (emailUpdateError) throw emailUpdateError;
    }

    const { error: updateError } = await serviceSupabase
      .from("profiles")
      .update({
        name,
        role,
        contact,
        local_body_id: localBodyId,
        status,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    return apiSuccess(
      {
        id,
        name,
        role,
        contact,
        local_body_id: localBodyId,
        local_body_name: localBody.name || "",
        status,
      },
      "Staff member updated",
    );
  } catch (err) {
    return handleApiError(err);
  }
}