import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { apiError, apiSuccess, handleApiError } from "@/lib/error-handler";
import { requireAdminAccess } from "@/lib/api/admin-access";
import {
  sanitizeSettingsPatch,
  slugify,
} from "@/lib/settings-defaults";

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

async function upsertSetting(supabase, key, value, updatedBy) {
  const { error } = await supabase
    .from("system_settings")
    .upsert(
      {
        key,
        value_json: value,
        updated_by: updatedBy || null,
      },
      { onConflict: "key" },
    );

  if (error) throw error;
}

async function ensureUniqueId(table, baseId, supabase) {
  let candidate = baseId;
  let counter = 1;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("id", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;

    counter += 1;
    candidate = `${baseId}-${counter}`;
  }
}

export async function POST(request) {
  try {
    const { error: accessError, profile, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const parsed = UpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid settings payload", 400);
    }

    const action = parsed.data.action;
    const payload = parsed.data.payload || {};
    const actorId = profile?.id || null;
    const serviceSupabase = createServiceSupabase();

    if (action === "update_profile") {
      const name = String(payload.name || "").trim();
      const email = String(payload.email || "").trim().toLowerCase();
      const currentPassword = String(payload.currentPassword || "");
      const newPassword = String(payload.newPassword || "");
      const confirmPassword = String(payload.confirmPassword || "");

      if (!name) return apiError("Name is required", 400);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return apiError("Valid email is required", 400);
      }

      const profileUpdates = { name, contact: email };
      const { error: profileUpdateError } = await serviceSupabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", actorId);
      if (profileUpdateError) throw profileUpdateError;

      const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(actorId);
      if (authUserError) throw authUserError;

      const currentEmail = String(authUserData?.user?.email || "").toLowerCase();
      const authUpdatePayload = {};

      if (email && email !== currentEmail) {
        authUpdatePayload.email = email;
      }

      if (newPassword || confirmPassword || currentPassword) {
        if (newPassword.length < 8) return apiError("New password must be at least 8 characters", 400);
        if (newPassword !== confirmPassword) return apiError("New password and confirm password do not match", 400);

        if (!currentPassword) return apiError("Current password is required to change password", 400);

        const verifyClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        );

        const { error: signInError } = await verifyClient.auth.signInWithPassword({
          email: currentEmail,
          password: currentPassword,
        });

        if (signInError) {
          return apiError("Current password is incorrect", 400);
        }

        authUpdatePayload.password = newPassword;
      }

      if (Object.keys(authUpdatePayload).length > 0) {
        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(actorId, authUpdatePayload);
        if (authUpdateError) throw authUpdateError;
      }

      return apiSuccess(null, "Profile settings saved");
    }

    const settingKeyByAction = {
      update_complaint_rules: "complaint_rules",
      update_notification_settings: "notification_settings",
      update_report_settings: "report_settings",
      update_security_settings: "security_settings",
      update_notice_settings: "notice_settings",
    };

    if (settingKeyByAction[action]) {
      const sanitized = sanitizeSettingsPatch(action, payload);
      if (!sanitized) return apiError("Invalid settings section", 400);
      await upsertSetting(serviceSupabase, settingKeyByAction[action], sanitized, actorId);
      return apiSuccess(sanitized, "Settings updated");
    }

    if (action === "add_category") {
      const name = String(payload.name || "").trim();
      if (!name) return apiError("Category name is required", 400);

      const baseId = slugify(payload.id || name) || `category-${Date.now()}`;
      const id = await ensureUniqueId("issue_categories_config", baseId, serviceSupabase);

      const { error } = await serviceSupabase
        .from("issue_categories_config")
        .insert({
          id,
          name,
          name_ml: String(payload.nameMl || "").trim() || name,
          icon: String(payload.icon || "📌").trim() || "📌",
          ai_tip: String(payload.aiTip || "").trim(),
          is_active: true,
        });

      if (error) throw error;
      return apiSuccess({ id }, "Category added");
    }

    if (action === "update_category") {
      const id = String(payload.id || "").trim();
      if (!id) return apiError("Category id is required", 400);

      const updates = {
        name: String(payload.name || "").trim(),
        name_ml: String(payload.nameMl || "").trim(),
        icon: String(payload.icon || "📌").trim() || "📌",
        ai_tip: String(payload.aiTip || "").trim(),
        is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
      };

      if (!updates.name) return apiError("Category name is required", 400);
      if (!updates.name_ml) updates.name_ml = updates.name;

      const { error } = await serviceSupabase
        .from("issue_categories_config")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      return apiSuccess({ id }, "Category updated");
    }

    if (action === "delete_category") {
      const id = String(payload.id || "").trim();
      if (!id) return apiError("Category id is required", 400);

      const { error } = await serviceSupabase
        .from("issue_categories_config")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return apiSuccess({ id }, "Category deleted");
    }

    if (action === "add_subcategory") {
      const categoryId = String(payload.categoryId || "").trim();
      const name = String(payload.name || "").trim();
      if (!categoryId) return apiError("Category is required", 400);
      if (!name) return apiError("Subcategory name is required", 400);

      const baseId = slugify(payload.id || name) || `subcategory-${Date.now()}`;
      const id = await ensureUniqueId("issue_subcategories_config", baseId, serviceSupabase);

      const { error } = await serviceSupabase
        .from("issue_subcategories_config")
        .insert({
          id,
          category_id: categoryId,
          name,
          name_ml: String(payload.nameMl || "").trim() || name,
          description: String(payload.description || "").trim(),
          description_ml: String(payload.descriptionMl || "").trim(),
          is_active: true,
        });

      if (error) throw error;
      return apiSuccess({ id }, "Subcategory added");
    }

    if (action === "update_subcategory") {
      const id = String(payload.id || "").trim();
      if (!id) return apiError("Subcategory id is required", 400);

      const updates = {
        name: String(payload.name || "").trim(),
        name_ml: String(payload.nameMl || "").trim(),
        description: String(payload.description || "").trim(),
        description_ml: String(payload.descriptionMl || "").trim(),
        is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
      };

      if (!updates.name) return apiError("Subcategory name is required", 400);
      if (!updates.name_ml) updates.name_ml = updates.name;
      if (!updates.description_ml) updates.description_ml = updates.description;

      const { error } = await serviceSupabase
        .from("issue_subcategories_config")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      return apiSuccess({ id }, "Subcategory updated");
    }

    if (action === "delete_subcategory") {
      const id = String(payload.id || "").trim();
      if (!id) return apiError("Subcategory id is required", 400);

      const { error } = await serviceSupabase
        .from("issue_subcategories_config")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return apiSuccess({ id }, "Subcategory deleted");
    }

    return apiError("Unsupported settings action", 400);
  } catch (err) {
    if (err?.code === "42P01") {
      return apiError("Settings tables are missing. Run sql/admin-settings-config.sql first.", 500);
    }
    return handleApiError(err);
  }
}
