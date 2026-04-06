import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";

const ALLOWED_PRIORITIES = ["normal", "important", "urgent"];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const localBodyId = (searchParams.get("localBodyId") || "").trim();
    const category = (searchParams.get("category") || "").trim();
    const priority = (searchParams.get("priority") || "").trim();
    const search = (searchParams.get("search") || "").trim();
    const adminOnly = searchParams.get("adminOnly") === "true";
    const limitRaw = Number(searchParams.get("limit") || 30);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return apiError("Supabase not configured", 500);
    }

    const supabase = createClient(url, serviceKey);
    let query = supabase
      .from("public_notices")
      .select("id, local_body_id, title, description, category, priority, created_at, expires_at, local_bodies(name, district)")
      .eq("is_active", true);

    // If adminOnly, return only system-wide notices.
    if (adminOnly) {
      query = query.is("local_body_id", null);
    } else if (localBodyId) {
      // Panchayat pages should show only notices for that specific local body.
      query = query.eq("local_body_id", localBodyId);
    }

    if (category) query = query.eq("category", category);
    if (priority) query = query.eq("priority", priority);
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query.order("created_at", { ascending: false }).limit(limit);

    const { data, error } = await query;
    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        // Table not migrated yet: keep public UI usable with empty state.
        return apiSuccess([]);
      }
      throw error;
    }

    const now = new Date();
    const filtered = (data || []).filter((n) => !n.expires_at || new Date(n.expires_at) >= now);
    const rank = { urgent: 3, important: 2, normal: 1 };
    
    filtered.sort((a, b) => {
      // Admin notices (null local_body_id) come first
      const aIsAdmin = !a.local_body_id ? 1 : 0;
      const bIsAdmin = !b.local_body_id ? 1 : 0;
      if (aIsAdmin !== bIsAdmin) return bIsAdmin - aIsAdmin;
      
      // Then sort by priority
      const pr = (rank[b.priority] || 0) - (rank[a.priority] || 0);
      if (pr !== 0) return pr;
      
      // Then by date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return apiSuccess(filtered);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      return apiError("Supabase not configured", 500);
    }

    const cookieStore = await cookies();
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

    const supabase = createClient(url, serviceKey);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, local_body_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) return apiError("Profile not found", 404);
    if (!["secretary", "admin"].includes(profile.role)) return apiError("Forbidden", 403);

    const body = await request.json();
    const localBodyId = String(body?.localBodyId || "").trim();
    const isAdminNotice = body?.isAdminNotice === true;
    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();
    const category = String(body?.category || "General").trim();
    const priority = String(body?.priority || "normal").trim().toLowerCase();

    if (!title || !description) {
      return apiError("title and description are required", 400);
    }

    // Admin notices don't require localBodyId, others do
    if (!isAdminNotice && !localBodyId) {
      return apiError("localBodyId is required for non-admin notices", 400);
    }

    if (!ALLOWED_PRIORITIES.includes(priority)) {
      return apiError("Invalid priority", 400);
    }

    // Only admins can create system-wide notices
    if (isAdminNotice && profile.role !== "admin") {
      return apiError("Only admins can create system-wide notices", 403);
    }

    // Secretaries can only create for their own local body
    if (profile.role === "secretary" && localBodyId && profile.local_body_id !== localBodyId) {
      return apiError("You can only create notices for your own local body", 403);
    }

    const { data, error } = await supabase
      .from("public_notices")
      .insert({
        local_body_id: isAdminNotice ? null : localBodyId,
        title,
        description,
        category,
        priority,
        created_by: profile.id,
        is_active: true,
      })
      .select("id, local_body_id, title, description, category, priority, created_at")
      .single();

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        return apiError("Notice system is not initialized. Run sql/public-notices.sql first.", 500);
      }
      throw error;
    }

    return apiSuccess(data, "Notice published");
  } catch (err) {
    return handleApiError(err);
  }
}