import { createClient } from "@supabase/supabase-js";
import { apiError, apiSuccess, handleApiError } from "@/lib/error-handler";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["admin", "secretary", "engineer", "clerk"]),
  localBodyId: z.string().uuid().optional().nullable(),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Please provide valid login credentials", 422);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey) {
      return apiError("Supabase is not configured", 500);
    }

    const authClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (authError) {
      return apiError(authError.message || "Login failed", 401);
    }

    if (!authData?.session || !authData?.user) {
      return apiError("Login failed", 401);
    }

    const dataClient = createClient(url, serviceKey || anonKey);
    const { data: profile, error: profileError } = await dataClient
      .from("profiles")
      .select("id, name, role, local_body_id, local_bodies(name, district)")
      .eq("id", authData.user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile) {
      return apiError("No profile found. Contact your administrator.", 404);
    }

    if (profile.role !== parsed.data.role) {
      return apiError(`Role mismatch: your account is registered as "${profile.role}", not "${parsed.data.role}".`, 403);
    }

    if (parsed.data.role !== "admin") {
      const requestedLocalBodyId = String(parsed.data.localBodyId || "").trim();
      if (!requestedLocalBodyId) {
        return apiError("Please select a local body.", 422);
      }
      if (String(profile.local_body_id || "") !== requestedLocalBodyId) {
        return apiError("Local body mismatch: you do not belong to the selected local body.", 403);
      }
    }

    return apiSuccess(
      {
        profile: {
          id: profile.id,
          name: profile.name || "",
          role: profile.role,
          local_body_id: profile.local_body_id,
          local_bodies: profile.local_bodies || null,
        },
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at,
          token_type: authData.session.token_type,
        },
      },
      "Login successful",
    );
  } catch (err) {
    return handleApiError(err);
  }
}