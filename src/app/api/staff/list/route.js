import { apiError, apiSuccess, handleApiError } from "@/lib/error-handler";
import { requireAdminAccess } from "@/lib/api/admin-access";
import { fetchStaffDirectory } from "@/lib/api/staff-management";

export async function GET(request) {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);
    const localBodyId = String(searchParams.get("localBodyId") || "").trim();
    const role = String(searchParams.get("role") || "").trim();
    const status = String(searchParams.get("status") || "").trim();

    const staff = await fetchStaffDirectory(supabase, { localBodyId, role, status });
    return apiSuccess(staff);
  } catch (err) {
    return handleApiError(err);
  }
}