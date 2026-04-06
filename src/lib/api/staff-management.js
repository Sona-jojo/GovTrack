import { createClient } from "@supabase/supabase-js";

export const STAFF_ROLES = ["secretary", "engineer", "clerk"];
export const STAFF_ASSIGNABLE_ROLES = ["engineer", "clerk", "secretary"];
export const STAFF_STATUSES = ["active", "inactive"];

export function normalizeStaffStatus(status) {
  const value = String(status || "active").trim().toLowerCase();
  return STAFF_STATUSES.includes(value) ? value : "active";
}

export function normalizeStaffRole(role) {
  const value = String(role || "").trim().toLowerCase();
  return STAFF_ROLES.includes(value) ? value : "engineer";
}

export function formatStaffRoleLabel(role) {
  const value = String(role || "").trim().toLowerCase();
  if (!value) return "Staff";

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatStaffDisplayLabel(staff = {}) {
  const name = String(staff?.name || "Unnamed staff").trim() || "Unnamed staff";
  const roleLabel = formatStaffRoleLabel(staff?.role);

  return `${name} (${roleLabel})`;
}

export function normalizeContact(contact) {
  return String(contact || "").trim();
}

export function isEmailContact(contact) {
  return /.+@.+\..+/.test(String(contact || "").trim());
}

export function buildLoginEmail(name, localBodyCode, contactSeed = "") {
  const nameSlug = String(name || "staff")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 24) || "staff";
  const bodySlug = String(localBodyCode || "np")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12) || "np";
  const seed = String(contactSeed || Date.now())
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(-8) || Math.random().toString(36).slice(2, 10);

  return `${nameSlug}.${bodySlug}.${seed}@staff.local`;
}

async function loadAuthEmailMap(supabase) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;

  return new Map((data?.users || []).map((user) => [user.id, user.email || ""]));
}

function buildWorkloadMaps(complaints = []) {
  const directAssignments = new Map();
  const roleAssignments = new Map();

  for (const complaint of complaints) {
    const status = String(complaint?.status || "").toLowerCase();
    if (status === "resolved" || status === "closed") continue;

    if (complaint?.assigned_to) {
      directAssignments.set(
        complaint.assigned_to,
        (directAssignments.get(complaint.assigned_to) || 0) + 1,
      );
    }

    if (complaint?.assigned_role && STAFF_ROLES.includes(complaint.assigned_role)) {
      roleAssignments.set(
        complaint.assigned_role,
        (roleAssignments.get(complaint.assigned_role) || 0) + 1,
      );
    }
  }

  return { directAssignments, roleAssignments };
}

export async function fetchStaffDirectory(supabase, filters = {}) {
  const localBodyId = String(filters.localBodyId || "").trim();
  const role = String(filters.role || "").trim();
  const status = String(filters.status || "").trim();

  let query = supabase
    .from("profiles")
    .select("id, name, role, local_body_id, contact, status, local_bodies(name, code, district)")
    .in("role", STAFF_ROLES)
    .order("role", { ascending: true })
    .order("name", { ascending: true });

  if (localBodyId) query = query.eq("local_body_id", localBodyId);
  if (role && STAFF_ROLES.includes(role)) query = query.eq("role", role);
  if (status && STAFF_STATUSES.includes(status)) query = query.eq("status", status);

  const { data: profiles, error } = await query;
  if (error) throw error;

  let complaintQuery = supabase
    .from("complaints")
    .select("id, assigned_to, assigned_role, status, local_body_id");
  if (localBodyId) complaintQuery = complaintQuery.eq("local_body_id", localBodyId);

  const { data: complaints, error: complaintError } = await complaintQuery;
  if (complaintError) throw complaintError;

  const { directAssignments, roleAssignments } = buildWorkloadMaps(complaints || []);
  const emailMap = await loadAuthEmailMap(supabase);

  const rows = (profiles || []).map((profile) => {
    const contact = normalizeContact(profile.contact);
    const profileStatus = normalizeStaffStatus(profile.status);
    const directCount = Number(directAssignments.get(profile.id) || 0);
    const roleCount = Number(roleAssignments.get(profile.role) || 0);

    return {
      ...profile,
      contact,
      status: profileStatus,
      login_email: emailMap.get(profile.id) || "",
      assigned_complaints_count: directCount + roleCount,
      local_body_name: profile.local_bodies?.name || "",
      local_body_code: profile.local_bodies?.code || "",
      is_active: profileStatus === "active",
    };
  });

  rows.sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    if (a.role !== b.role) return a.role.localeCompare(b.role);
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return rows;
}

export async function findDuplicateStaff(supabase, { name, contact, role, localBodyId, excludeId = null }) {
  const normalizedName = String(name || "").trim().toLowerCase();
  const normalizedContact = normalizeContact(contact).toLowerCase();

  let query = supabase
    .from("profiles")
    .select("id, name, role, contact, local_body_id")
    .eq("local_body_id", localBodyId)
    .eq("role", role);

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).find((row) => {
    const sameName = String(row.name || "").trim().toLowerCase() === normalizedName;
    const sameContact = normalizeContact(row.contact).toLowerCase() === normalizedContact;
    return sameName || sameContact;
  }) || null;
}

export async function buildAuthEmailForStaff({ name, contact, localBodyCode }) {
  const normalizedContact = normalizeContact(contact);
  if (isEmailContact(normalizedContact)) {
    return normalizedContact;
  }

  let suffix = normalizedContact.replace(/[^0-9a-z]+/gi, "");
  if (!suffix) {
    suffix = String(Date.now()).slice(-8);
  }

  return buildLoginEmail(name, localBodyCode, suffix);
}

export function createServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}