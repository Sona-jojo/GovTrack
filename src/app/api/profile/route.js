import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { apiSuccess, apiError } from "@/lib/error-handler";

// GET — Fetch the authenticated user's profile (bypasses RLS)
export async function GET() {
  try {
    // Auth check: verify user session from cookies
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      },
    );

    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return apiError("Not authenticated", 401);
    }

    // Use service role to bypass RLS on profiles table
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*, local_bodies(name, code, district)")
      .eq("id", user.id)
      .single();

    if (error) throw error;
    if (!profile) {
      return apiError("No profile found", 404);
    }

    return apiSuccess(profile);
  } catch (err) {
    console.error("Profile fetch error:", err);
    return apiError(err.message || "Failed to fetch profile", 500);
  }
}
