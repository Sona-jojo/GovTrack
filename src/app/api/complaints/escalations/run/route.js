import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";
import { runDeadlineEscalation } from "@/lib/deadline-escalation";

function createDataSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return createServerClient(url, serviceKey || anonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });
}

export async function POST() {
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

    const dataSupabase = createDataSupabaseClient();

    const { data: profile } = await dataSupabase
      .from("profiles")
      .select("id, role, local_body_id")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "secretary" && profile.role !== "admin")) {
      return apiError("Forbidden", 403);
    }

    const escalationResult = await runDeadlineEscalation(dataSupabase, {
      localBodyId: profile.role === "secretary" ? profile.local_body_id : null,
    });

    return apiSuccess(escalationResult, "Escalation monitor completed");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const tokenFromHeader = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const tokenFromCustomHeader = request.headers.get("x-cron-secret") || "";
    const expectedSecret = process.env.CRON_SECRET || "";

    const providedSecret = tokenFromHeader || tokenFromCustomHeader;
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const localBodyId = (searchParams.get("localBodyId") || "").trim();

    const dataSupabase = createDataSupabaseClient();
    const escalationResult = await runDeadlineEscalation(dataSupabase, {
      localBodyId: localBodyId || null,
    });

    return apiSuccess(escalationResult, "Escalation monitor completed");
  } catch (err) {
    return handleApiError(err);
  }
}
