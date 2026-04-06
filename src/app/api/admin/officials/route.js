import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";
import { requireAdminAccess } from "@/lib/api/admin-access";

const OFFICIAL_ROLES = ["secretary", "engineer", "clerk"];

export async function GET(request) {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);
    const localBodyId = (searchParams.get("localBodyId") || "").trim();
    const role = (searchParams.get("role") || "").trim();

    if (role && !OFFICIAL_ROLES.includes(role)) {
      return apiError("Invalid role filter", 400);
    }

    let query = supabase
      .from("profiles")
      .select("id, name, role, local_body_id, local_bodies(name, code, district)")
      .in("role", OFFICIAL_ROLES)
      .order("name", { ascending: true });

    if (localBodyId) query = query.eq("local_body_id", localBodyId);
    if (role) query = query.eq("role", role);

    const { data: officials, error } = await query;
    if (error) throw error;

    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const usersById = new Map((usersData?.users || []).map((u) => [u.id, u.email || ""]));

    const enrichedOfficials = (officials || []).map((official) => ({
      ...official,
      email: usersById.get(official.id) || "",
    }));

    return apiSuccess(enrichedOfficials);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request) {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const body = await request.json();
    const profileId = String(body?.profileId || "").trim();
    const newPassword = String(body?.newPassword || "").trim();

    if (!profileId || !newPassword) {
      return apiError("profileId and newPassword are required", 400);
    }

    if (newPassword.length < 8) {
      return apiError("Password must be at least 8 characters", 400);
    }

    const { data: targetProfile, error: targetError } = await supabase
      .from("profiles")
      .select("id, name, role")
      .eq("id", profileId)
      .single();

    if (targetError || !targetProfile) {
      return apiError("Official account not found", 404);
    }

    if (!OFFICIAL_ROLES.includes(targetProfile.role)) {
      return apiError("Password updates are allowed only for officials", 400);
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
      "Official password updated",
    );
  } catch (err) {
    return handleApiError(err);
  }
}