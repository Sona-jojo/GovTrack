import { createServerClient } from "@supabase/ssr";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";

/**
 * GET /api/local-bodies?type=...
 *
 * Fetch all local bodies, optionally filtered by type.
 * Returns array of { id, name, type, district, code }.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type");

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return apiError("Supabase not configured", 500);
    }

    const supabase = createServerClient(url, anonKey, {
      cookies: { getAll() { return []; }, setAll() {} },
    });

    let query = supabase
      .from("local_bodies")
      .select("id, name, type, district, code")
      .order("name");

    if (typeFilter) {
      query = query.eq("type", typeFilter);
    }

    const { data, error } = await query;

    if (error) return apiError(error.message, 400);

    return apiSuccess(data || []);
  } catch (err) {
    return handleApiError(err);
  }
}
