import { createClient } from "@supabase/supabase-js";
import { apiSuccess, handleApiError } from "@/lib/error-handler";
import { requireSecretaryAccess } from "@/lib/secretary-report";
import { mergeSecretarySettings } from "@/lib/secretary-settings";

function createServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, serviceKey || anonKey);
}

export async function GET() {
  try {
    const access = await requireSecretaryAccess();
    if (access.error) return access.error;

    const serviceSupabase = createServiceSupabase();

    const [settingsRes, secretaryRes, authRes] = await Promise.all([
      access.supabase
        .from("secretary_settings")
        .select("settings_json")
        .eq("secretary_id", access.profile.id)
        .maybeSingle(),
      access.supabase
        .from("profiles")
        .select("id, name, role, contact, local_body_id, local_bodies(name, district)")
        .eq("id", access.profile.id)
        .single(),
      serviceSupabase.auth.admin.getUserById(access.profile.id),
    ]);

    const missingTable = settingsRes.error?.code === "42P01";
    if (settingsRes.error && !missingTable) throw settingsRes.error;
    if (secretaryRes.error) throw secretaryRes.error;

    const settings = mergeSecretarySettings(settingsRes.data?.settings_json || null);
    const secretary = secretaryRes.data || {};
    const authUser = authRes?.data?.user || null;

    const payload = {
      profile: {
        id: secretary.id,
        name: secretary.name || "",
        email: authUser?.email || "",
        phone: secretary.contact || "",
      },
      panchayathInfo: {
        localBodyId: secretary.local_body_id || null,
        name: secretary.local_bodies?.name || "-",
        district: secretary.local_bodies?.district || "-",
        assignedRole: secretary.role || "secretary",
      },
      settings,
      tableReady: !missingTable,
    };

    return apiSuccess(payload);
  } catch (err) {
    return handleApiError(err);
  }
}
