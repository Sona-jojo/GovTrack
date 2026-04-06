import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { apiSuccess, handleApiError } from "@/lib/error-handler";
import {
  getDefaultCategories,
  mergeSettings,
  mapCategoryRows,
} from "@/lib/settings-defaults";

function createServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, serviceKey || anonKey);
}

export async function GET() {
  try {
    const supabase = createServiceSupabase();

    const [settingsRes, categoriesRes, subcategoriesRes] = await Promise.all([
      supabase
        .from("system_settings")
        .select("key, value_json"),
      supabase
        .from("issue_categories_config")
        .select("id, name, name_ml, icon, ai_tip, color, border_color, bg_color, text_color, is_active, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("issue_subcategories_config")
        .select("id, category_id, name, name_ml, description, description_ml, is_active, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    const settingsError = settingsRes.error;
    const categoriesError = categoriesRes.error;
    const subcategoriesError = subcategoriesRes.error;

    const missingTable = [settingsError, categoriesError, subcategoriesError].some(
      (error) => error?.code === "42P01",
    );

    let settings = mergeSettings(settingsRes.data || []);
    let categories = getDefaultCategories();

    if (!missingTable && !categoriesError && !subcategoriesError) {
      const mapped = mapCategoryRows(categoriesRes.data || [], subcategoriesRes.data || [], false);
      if (mapped.length > 0) categories = mapped;
    }

    if (missingTable || settingsError?.code === "42P01") {
      settings = mergeSettings([]);
    }

    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      },
    );

    const {
      data: { user },
    } = await authClient.auth.getUser();

    let adminProfile = null;
    if (user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        adminProfile = {
          id: profile.id,
          name: profile.name || "",
          email: user.email || "",
        };
      }
    }

    return apiSuccess({ settings, categories, adminProfile });
  } catch (err) {
    return handleApiError(err);
  }
}
