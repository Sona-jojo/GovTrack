import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError, apiSuccess, handleApiError } from "@/lib/error-handler";
import { requireAdminAccess } from "@/lib/api/admin-access";
import {
  buildAuthEmailForStaff,
  createServiceSupabase,
  findDuplicateStaff,
  normalizeContact,
  normalizeStaffRole,
  normalizeStaffStatus,
} from "@/lib/api/staff-management";

const AddStaffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  role: z.string().trim().min(1),
  contact: z.string().trim().min(3).max(120),
  localBodyId: z.string().trim().min(1),
  status: z.string().trim().optional(),
});

export async function POST(request) {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const parsed = AddStaffSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid staff payload", 400);
    }

    const name = parsed.data.name.trim();
    const role = normalizeStaffRole(parsed.data.role);
    const contact = normalizeContact(parsed.data.contact);
    const localBodyId = parsed.data.localBodyId.trim();
    const status = normalizeStaffStatus(parsed.data.status);

    if (!contact) {
      return apiError("Contact is required", 400);
    }

    const { data: localBody, error: localBodyError } = await supabase
      .from("local_bodies")
      .select("id, name, code")
      .eq("id", localBodyId)
      .single();

    if (localBodyError || !localBody) {
      return apiError("Local body not found", 404);
    }

    const duplicate = await findDuplicateStaff(supabase, {
      name,
      contact,
      role,
      localBodyId,
    });

    if (duplicate) {
      return apiError("Duplicate staff member already exists for this local body", 409);
    }

    const loginEmail = await buildAuthEmailForStaff({
      name,
      contact,
      localBodyCode: localBody.code || localBody.name,
    });

    const tempPassword = `Np@${randomUUID().replace(/-/g, "").slice(0, 12)}!`;
    const { data: authUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: loginEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        local_body_id: localBodyId,
      },
    });

    if (createUserError) throw createUserError;

    const serviceSupabase = createServiceSupabase();
    const { error: insertError } = await serviceSupabase.from("profiles").insert({
      id: authUser.user.id,
      name,
      role,
      contact,
      local_body_id: localBodyId,
      status,
    });

    if (insertError) {
      await supabase.auth.admin.deleteUser(authUser.user.id).catch(() => {});
      throw insertError;
    }

    return apiSuccess(
      {
        id: authUser.user.id,
        name,
        role,
        contact,
        local_body_id: localBodyId,
        local_body_name: localBody.name || "",
        status,
        login_email: loginEmail,
      },
      "Staff member added",
    );
  } catch (err) {
    return handleApiError(err);
  }
}