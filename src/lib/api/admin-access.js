import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { apiError } from "@/lib/error-handler";

export async function requireAdminAccess() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return { error: apiError("Supabase not configured", 500), supabase: null, profile: null };
  }

  const cookieStore = await cookies();
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

  if (!user) {
    return { error: apiError("Unauthorized", 401), supabase: null, profile: null };
  }

  // Prefer service role for analytics-wide visibility, but gracefully fall back.
  const supabase = createServerClient(url, serviceKey || anonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, local_body_id")
    .eq("id", user.id)
    .single();

  if ((profileError || !profile) && !serviceKey) {
    const fallback = await authSupabase
      .from("profiles")
      .select("id, role, local_body_id")
      .eq("id", user.id)
      .single();
    profile = fallback.data;
    profileError = fallback.error;
  }

  if (profileError || !profile || profile.role !== "admin") {
    return { error: apiError("Forbidden", 403), supabase: null, profile: null };
  }

  return { error: null, supabase, profile };
}
