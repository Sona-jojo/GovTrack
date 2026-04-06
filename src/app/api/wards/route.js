import { createServerClient } from "@supabase/ssr";
import { apiError, apiSuccess, handleApiError } from "@/lib/error-handler";

/**
 * GET /api/wards?local_body_id=...
 *
 * Fetch wards for a specific local body.
 * Returns array of { id, name, ward_number }.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const localBodyId = searchParams.get("local_body_id");

    if (!localBodyId) {
      return apiError("local_body_id is required", 400);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabase = createServerClient(url, anonKey, {
      cookies: { getAll() { return []; }, setAll() {} },
    });

    const { data, error } = await supabase
      .from("wards")
      .select("id, name, ward_number")
      .eq("local_body_id", localBodyId)
      .order("ward_number", { ascending: true, nullsFirst: false });

    if (error) return apiError(error.message, 400);

    return apiSuccess(data || []);
  } catch (err) {
    return handleApiError(err);
  }
}
