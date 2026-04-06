import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";
import { PAGE_SIZE } from "@/lib/constants";

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const authSupabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
    } = await authSupabase.auth.getUser();
    if (!user) return apiError("Unauthorized", 401);

    // Use service role for profile query to bypass RLS
    const dataSupabase = createServerClient(url, serviceKey || anonKey, {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    });

    const { data: profile } = await dataSupabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return apiError("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const status = (searchParams.get("status") || "").trim();
    const search = (searchParams.get("search") || "").trim();

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = dataSupabase
      .from("complaints")
      .select(
        `*,
         local_bodies(name, district),
         assignee:profiles!assigned_to(id, name, role)`,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(
        `tracking_id.ilike.%${search}%,description.ilike.%${search}%,location_text.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return apiSuccess({ data: data || [], count: count || 0 });
  } catch (err) {
    return handleApiError(err);
  }
}
