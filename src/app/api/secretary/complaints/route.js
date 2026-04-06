import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";
import { PAGE_SIZE } from "@/lib/constants";

function extractLocalityTokens(name) {
  const stopWords = new Set([
    "grama",
    "panchayat",
    "municipality",
    "corporation",
    "block",
    "district",
    "city",
    "town",
    "village",
  ]);

  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !stopWords.has(token));
}

async function resolveSecretaryLocalBodyScopeIds(dataSupabase, profile) {
  const primaryId = String(profile?.local_body_id || "").trim();
  if (!primaryId) return [];

  const bodyName = String(profile?.local_bodies?.name || "").trim();
  const bodyDistrict = String(profile?.local_bodies?.district || "").trim();
  if (!bodyName) return [primaryId];

  let aliasQuery = dataSupabase
    .from("local_bodies")
    .select("id")
    .ilike("name", bodyName)
    .limit(20);

  if (bodyDistrict) {
    aliasQuery = aliasQuery.eq("district", bodyDistrict);
  }

  const { data: aliases, error } = await aliasQuery;
  if (error) return [primaryId];

  const scopedIds = new Set([primaryId]);
  for (const row of aliases || []) {
    const id = String(row?.id || "").trim();
    if (id) scopedIds.add(id);
  }

  const localityTokens = extractLocalityTokens(bodyName);
  if (localityTokens.length > 0) {
    const districtScopedQuery = dataSupabase
      .from("local_bodies")
      .select("id, name")
      .eq("district", bodyDistrict || "")
      .limit(200);

    const { data: districtBodies, error: districtErr } = await districtScopedQuery;
    if (!districtErr) {
      for (const row of districtBodies || []) {
        const rowName = String(row?.name || "").toLowerCase();
        const isSameLocality = localityTokens.some((token) => rowName.includes(token));
        if (!isSameLocality) continue;
        const id = String(row?.id || "").trim();
        if (id) scopedIds.add(id);
      }
    }
  }

  return [...scopedIds];
}

export async function GET(request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      return apiError("Supabase environment is not configured", 500);
    }

    const cookieStore = await cookies();

    const authClient = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const anonAuthClient = createClient(url, anonKey);
    const dataSupabase = createClient(url, serviceKey);

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
      const {
        data: { user: cookieUser },
      } = await authClient.auth.getUser();
      user = cookieUser || null;
    }

    if (!user) return apiError("Unauthorized", 401);

    const { data: profile } = await dataSupabase
      .from("profiles")
      .select("id, role, local_body_id, local_bodies(name, district)")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "secretary") {
      return apiError("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const status = (searchParams.get("status") || "").trim();
    const priority = (searchParams.get("priority") || "").trim();
    const search = (searchParams.get("search") || "").trim();

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const scopeIds = await resolveSecretaryLocalBodyScopeIds(dataSupabase, profile);
    if (!scopeIds.length) {
      return apiSuccess({ data: [], count: 0 });
    }

    let query = dataSupabase
      .from("complaints")
      .select(
        "*, assignee:profiles!assigned_to(id, name, role), complaint_images(id, image_url, image_type, storage_path)",
        { count: "exact" },
      )
      .in("local_body_id", scopeIds)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (search) {
      query = query.or(`tracking_id.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_ATTACHMENTS_BUCKET || "complaint-images";
    const rows = Array.isArray(data) ? data : [];

    const allPaths = rows
      .flatMap((c) => (Array.isArray(c.complaint_images) ? c.complaint_images : []))
      .map((img) => img?.storage_path)
      .filter((path) => typeof path === "string" && path.length > 0);

    let signedByPath = new Map();
    if (allPaths.length > 0) {
      const { data: signedUrls, error: signedErr } = await dataSupabase.storage
        .from(bucket)
        .createSignedUrls(allPaths, 60 * 60 * 24 * 7);

      if (!signedErr && Array.isArray(signedUrls)) {
        signedByPath = new Map(allPaths.map((path, i) => [path, signedUrls[i]?.signedUrl || ""]));
      }
    }

    const normalizedRows = rows.map((c) => ({
      ...c,
      complaint_images: (Array.isArray(c.complaint_images) ? c.complaint_images : []).map((img) => ({
        ...img,
        image_url: signedByPath.get(img.storage_path) || img.image_url,
      })),
    }));

    return apiSuccess({ data: normalizedRows, count: count || 0 });
  } catch (err) {
    return handleApiError(err);
  }
}
