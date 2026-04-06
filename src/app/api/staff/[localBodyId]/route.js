import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { apiSuccess, apiError } from "@/lib/error-handler";
import { fetchStaffDirectory } from "@/lib/api/staff-management";

export async function GET(request, context) {
  try {
    // Handle params - may be a Promise in Next.js 15+/16+
    const resolvedParams = context.params?.then ? await context.params : context.params;
    const localBodyId = resolvedParams?.localBodyId;

    if (!localBodyId) {
      // Fallback: try extracting from URL
      const url = new URL(request.url);
      const segments = url.pathname.split("/");
      const idFromUrl = segments[segments.length - 1];
      if (!idFromUrl || idFromUrl === "staff") {
        return apiError("Local body ID required", 400);
      }
      return handleStaffFetch(request, idFromUrl);
    }

    return handleStaffFetch(request, localBodyId);
  } catch (err) {
    console.error("Staff API error:", err);
    return apiError(err.message || "Failed to fetch staff", 500);
  }
}

async function handleStaffFetch(request, localBodyId) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const anonAuthClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  // Auth check: verify user session from cookies
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(tokens) {
          try {
            for (const { name, value, options } of tokens) {
              cookieStore.set(name, value, options);
            }
          } catch {}
        },
      },
    },
  );

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  let user = null;
  if (bearerToken) {
    const { data } = await anonAuthClient.auth.getUser(bearerToken);
    user = data?.user || null;
  }

  if (!user) {
    const { data } = await authClient.auth.getUser();
    user = data?.user || null;
  }

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  // Verify caller role using service role (no RLS issues)
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["secretary", "admin"].includes(callerProfile.role)) {
    return apiError("Forbidden: secretary or admin role required", 403);
  }

  const { searchParams } = new URL(request.url);
  const role = String(searchParams.get("role") || "").trim();
  const status = String(searchParams.get("status") || "").trim();

  const staff = await fetchStaffDirectory(supabase, {
    localBodyId,
    role,
    status,
  });

  return apiSuccess(staff);
}
