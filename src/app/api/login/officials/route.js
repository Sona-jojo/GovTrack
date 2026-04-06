import { createClient } from "@supabase/supabase-js";
import { apiError, apiSuccess, handleApiError } from "@/lib/error-handler";

const OFFICIAL_ROLES = ["secretary", "engineer", "clerk"];

function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (status === "active" || status === "inactive") return status;
  return "active";
}

async function listAllAuthUsers(supabase) {
  const users = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const chunk = data?.users || [];
    users.push(...chunk);

    if (chunk.length < perPage) break;
    page += 1;
  }

  return users;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const localBodyId = String(searchParams.get("localBodyId") || "").trim();
    const role = String(searchParams.get("role") || "").trim().toLowerCase();

    if (!localBodyId) {
      return apiError("localBodyId is required", 400);
    }

    if (!OFFICIAL_ROLES.includes(role)) {
      return apiError("Valid role is required", 400);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, role, local_body_id, contact, status")
      .eq("local_body_id", localBodyId)
      .eq("role", role)
      .order("name", { ascending: true });

    if (profilesError) throw profilesError;

    const users = await listAllAuthUsers(supabase);
    const usersById = new Map(users.map((u) => [u.id, u.email || ""]));

    const officials = (profiles || [])
      .map((profile) => {
        const normalizedStatus = normalizeStatus(profile.status);
        return {
          id: profile.id,
          name: profile.name || "",
          role: profile.role,
          local_body_id: profile.local_body_id,
          contact: profile.contact || "",
          email: usersById.get(profile.id) || "",
          status: normalizedStatus,
        };
      })
      .filter((profile) => profile.status === "active");

    return apiSuccess(officials);
  } catch (err) {
    return handleApiError(err);
  }
}
