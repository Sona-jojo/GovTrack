import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";

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

    const dataSupabase = createServerClient(url, serviceKey || anonKey, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    });

    const { data: profile } = await dataSupabase
      .from("profiles")
      .select("id, role, local_body_id")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "secretary" && profile.role !== "admin")) {
      return apiError("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const template = (searchParams.get("template") || "").trim();
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 30)));

    let query = dataSupabase
      .from("notifications")
      .select(
        "id, complaint_id, message, channel, template, status, created_at, complaints!inner(id, tracking_id, local_body_id, status)",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (template) query = query.eq("template", template);

    if (profile.role === "secretary") {
      query = query.eq("complaints.local_body_id", profile.local_body_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return apiSuccess(data || []);
  } catch (err) {
    return handleApiError(err);
  }
}
