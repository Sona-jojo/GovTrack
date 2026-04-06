import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { apiError, apiSuccess, handleApiError } from "@/lib/error-handler";
import { requireSecretaryAccess } from "@/lib/secretary-report";
import {
  mergeSecretarySettings,
  sanitizeSecretaryProfilePatch,
  sanitizeSecretarySettingsPatch,
} from "@/lib/secretary-settings";

const UpdateSchema = z.object({
  action: z.string().trim().min(1),
  payload: z.any().optional(),
});

function createServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, serviceKey || anonKey);
}

async function saveSecretarySettings(supabase, secretaryId, localBodyId, patch, actorId) {
  const currentRes = await supabase
    .from("secretary_settings")
    .select("settings_json")
    .eq("secretary_id", secretaryId)
    .maybeSingle();

  const missingTable = currentRes.error?.code === "42P01";
  if (missingTable) {
    throw new Error("Secretary settings table is missing. Run sql/secretary-settings-config.sql first.");
  }
  if (currentRes.error) throw currentRes.error;

  const merged = mergeSecretarySettings({
    ...(currentRes.data?.settings_json || {}),
    ...patch,
  });

  const { error } = await supabase
    .from("secretary_settings")
    .upsert(
      {
        secretary_id: secretaryId,
        local_body_id: localBodyId,
        settings_json: merged,
        updated_by: actorId || null,
      },
      { onConflict: "secretary_id" },
    );

  if (error) throw error;
  return merged;
}

export async function POST(request) {
  try {
    const access = await requireSecretaryAccess();
    if (access.error) return access.error;

    const parsed = UpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid settings payload", 400);
    }

    const action = parsed.data.action;
    const payload = parsed.data.payload || {};
    const profile = access.profile;
    const serviceSupabase = createServiceSupabase();

    if (action === "update_profile") {
      const sanitized = sanitizeSecretaryProfilePatch(payload);
      if (sanitized.error) return apiError(sanitized.error, 400);

      const { name, email, phone, shouldUpdatePassword, newPassword } = sanitized.value;

      const { error: profileUpdateError } = await access.supabase
        .from("profiles")
        .update({ name, contact: phone })
        .eq("id", profile.id);

      if (profileUpdateError) throw profileUpdateError;

      const { data: authUserData, error: authUserError } = await serviceSupabase.auth.admin.getUserById(profile.id);
      if (authUserError) throw authUserError;

      const currentEmail = String(authUserData?.user?.email || "").toLowerCase();
      const authPatch = {};
      if (email && email !== currentEmail) {
        authPatch.email = email;
      }
      if (shouldUpdatePassword) {
        authPatch.password = newPassword;
      }

      if (Object.keys(authPatch).length > 0) {
        const { error: authUpdateError } = await serviceSupabase.auth.admin.updateUserById(profile.id, authPatch);
        if (authUpdateError) throw authUpdateError;
      }

      return apiSuccess(null, "Profile settings saved");
    }

    const sanitizedPatch = sanitizeSecretarySettingsPatch(action, payload);
    if (!sanitizedPatch) {
      return apiError("Unsupported settings action", 400);
    }

    const merged = await saveSecretarySettings(
      access.supabase,
      profile.id,
      profile.local_body_id,
      sanitizedPatch,
      profile.id,
    );

    return apiSuccess(merged, "Settings updated");
  } catch (err) {
    return handleApiError(err);
  }
}
