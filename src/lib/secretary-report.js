import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { apiError } from "@/lib/error-handler";

const RESOLVED_STATUSES = new Set(["resolved", "closed"]);

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

async function resolveSecretaryLocalBodyScopeIds(supabase, localBodyId, bodyName, bodyDistrict) {
    const primaryId = String(localBodyId || "").trim();
    if (!primaryId) return [];

    const scopedIds = new Set([primaryId]);

    // Legacy data may split the same locality into different body types
    // Match by locality token within the same district
    const localityTokens = extractLocalityTokens(bodyName);
    if (localityTokens.length > 0 && bodyDistrict) {
        const { data: districtBodies, error } = await supabase
            .from("local_bodies")
            .select("id, name")
            .eq("district", bodyDistrict)
            .limit(200);

        if (!error) {
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

function toIsoRange(startDate, endDate) {
  let start = null;
  let end = null;

  if (startDate) {
    const d = new Date(startDate);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      start = d.toISOString();
    }
  }

  if (endDate) {
    const d = new Date(endDate);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      end = d.toISOString();
    }
  }

  return { start, end };
}

function toDurationHours(item) {
  const createdAt = item?.created_at ? new Date(item.created_at).getTime() : NaN;
  const resolvedAt = item?.resolved_at
    ? new Date(item.resolved_at).getTime()
    : item?.updated_at
      ? new Date(item.updated_at).getTime()
      : NaN;

  if (!Number.isFinite(createdAt) || !Number.isFinite(resolvedAt) || resolvedAt < createdAt) {
    return null;
  }

  return (resolvedAt - createdAt) / (1000 * 60 * 60);
}

function isResolved(status) {
  return RESOLVED_STATUSES.has(String(status || "").toLowerCase());
}

function isOverdue(complaint) {
  if (!complaint?.resolution_deadline) return false;
  if (isResolved(complaint.status)) return false;
  return new Date(complaint.resolution_deadline).getTime() < Date.now();
}

function formatAvgHours(avgHours) {
  if (!Number.isFinite(avgHours) || avgHours <= 0) return "-";
  if (avgHours < 24) return `${avgHours.toFixed(1)} hrs`;
  return `${(avgHours / 24).toFixed(1)} days`;
}

function createBucket({ staffId, staffName, role }) {
  return {
    staffId,
    staffName,
    role,
    assigned: 0,
    resolved: 0,
    pending: 0,
    overdue: 0,
    totalResolutionHours: 0,
    resolutionSamples: 0,
    avgResolutionHours: null,
    avgResolutionTime: "-",
    resolutionRate: 0,
  };
}

export function parseReportFilters(searchParams) {
  const startDate = (searchParams.get("startDate") || "").trim();
  const endDate = (searchParams.get("endDate") || "").trim();
  const role = (searchParams.get("role") || "all").trim().toLowerCase();
  const roleFilter = role === "engineer" || role === "clerk" ? role : "all";
  const range = toIsoRange(startDate, endDate);

  return {
    startDate,
    endDate,
    role: roleFilter,
    start: range.start,
    end: range.end,
  };
}

export async function requireSecretaryAccess() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return { error: apiError("Supabase not configured", 500), supabase: null, profile: null };
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

  if (!user) {
    return { error: apiError("Unauthorized", 401), supabase: null, profile: null };
  }

  const supabase = createServerClient(url, serviceKey || anonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, local_body_id, name, local_bodies(name, district)")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "secretary") {
    return { error: apiError("Forbidden", 403), supabase: null, profile: null };
  }

  return { error: null, supabase, profile };
}

export async function buildSecretaryReportData(supabase, localBodyId, filters, bodyName = "", bodyDistrict = "") {
  const scopeIds = await resolveSecretaryLocalBodyScopeIds(supabase, localBodyId, bodyName, bodyDistrict);
  const useScopedIds = scopeIds.length > 1;

  let complaintQuery = supabase
    .from("complaints")
    .select("id, tracking_id, status, assigned_to, assigned_role, created_at, updated_at, resolved_at, resolution_deadline");

  complaintQuery = useScopedIds
    ? complaintQuery.in("local_body_id", scopeIds)
    : complaintQuery.eq("local_body_id", localBodyId);

  if (filters.role !== "all") {
    complaintQuery = complaintQuery.eq("assigned_role", filters.role);
  }
  if (filters.start) {
    complaintQuery = complaintQuery.gte("created_at", filters.start);
  }
  if (filters.end) {
    complaintQuery = complaintQuery.lte("created_at", filters.end);
  }

  const { data: complaints, error: complaintError } = await complaintQuery;
  if (complaintError) throw complaintError;

  let staffQuery = supabase
    .from("profiles")
    .select("id, name, role")
    .in("role", ["engineer", "clerk"])
    .order("role", { ascending: true })
    .order("name", { ascending: true });

  staffQuery = useScopedIds
    ? staffQuery.in("local_body_id", scopeIds)
    : staffQuery.eq("local_body_id", localBodyId);

  if (filters.role !== "all") {
    staffQuery = staffQuery.eq("role", filters.role);
  }

  const { data: staff, error: staffError } = await staffQuery;
  if (staffError) throw staffError;

  const staffMap = new Map();
  for (const person of staff || []) {
    staffMap.set(person.id, createBucket({
      staffId: person.id,
      staffName: person.name || "Unnamed",
      role: person.role,
    }));
  }

  const unassignedMap = new Map();

  const summary = {
    totalComplaints: 0,
    resolved: 0,
    pending: 0,
    overdue: 0,
    resolutionRate: 0,
  };

  const trendMap = new Map();

  for (const complaint of complaints || []) {
    summary.totalComplaints += 1;

    const day = new Date(complaint.created_at).toISOString().slice(0, 10);
    if (!trendMap.has(day)) {
      trendMap.set(day, { date: day, total: 0, resolved: 0, pending: 0 });
    }
    const trend = trendMap.get(day);
    trend.total += 1;

    const resolved = isResolved(complaint.status);
    const overdue = isOverdue(complaint);

    if (resolved) {
      summary.resolved += 1;
      trend.resolved += 1;
    } else {
      summary.pending += 1;
      trend.pending += 1;
    }

    if (overdue) {
      summary.overdue += 1;
    }

    let staffRow = complaint.assigned_to ? staffMap.get(complaint.assigned_to) : null;
    if (!staffRow) {
      const roleKey = complaint.assigned_role === "engineer" || complaint.assigned_role === "clerk"
        ? complaint.assigned_role
        : "unassigned";
      if (!unassignedMap.has(roleKey)) {
        const queueLabel = roleKey === "engineer"
          ? "Unassigned Engineer Queue"
          : roleKey === "clerk"
            ? "Unassigned Clerk Queue"
            : "Unassigned Queue";
        unassignedMap.set(roleKey, createBucket({
          staffId: `unassigned-${roleKey}`,
          staffName: queueLabel,
          role: roleKey === "unassigned" ? "queue" : roleKey,
        }));
      }
      staffRow = unassignedMap.get(roleKey);
    }

    staffRow.assigned += 1;
    if (resolved) {
      staffRow.resolved += 1;
      const hours = toDurationHours(complaint);
      if (hours !== null) {
        staffRow.totalResolutionHours += hours;
        staffRow.resolutionSamples += 1;
      }
    } else {
      staffRow.pending += 1;
    }
    if (overdue) {
      staffRow.overdue += 1;
    }
  }

  summary.resolutionRate = summary.totalComplaints
    ? Number(((summary.resolved / summary.totalComplaints) * 100).toFixed(1))
    : 0;

  const staffPerformance = [...staffMap.values(), ...unassignedMap.values()].map((row) => {
    const avgHours = row.resolutionSamples ? row.totalResolutionHours / row.resolutionSamples : null;
    const resolutionRate = row.assigned ? Number(((row.resolved / row.assigned) * 100).toFixed(1)) : 0;

    return {
      staffId: row.staffId,
      staffName: row.staffName,
      role: row.role,
      assigned: row.assigned,
      resolved: row.resolved,
      pending: row.pending,
      overdue: row.overdue,
      avgResolutionHours: avgHours ? Number(avgHours.toFixed(2)) : null,
      avgResolutionTime: formatAvgHours(avgHours),
      resolutionRate,
    };
  }).sort((a, b) => {
    if (b.overdue !== a.overdue) return b.overdue - a.overdue;
    if (b.assigned !== a.assigned) return b.assigned - a.assigned;
    return a.staffName.localeCompare(b.staffName);
  });

  const staffBar = staffPerformance.map((row) => ({
    name: row.staffName,
    assigned: row.assigned,
    resolved: row.resolved,
    pending: row.pending,
    overdue: row.overdue,
  }));

  const distribution = [
    { name: "Resolved", value: summary.resolved },
    { name: "Pending", value: summary.pending },
    { name: "Overdue", value: summary.overdue },
  ];

  const trends = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  const mostOverdue = staffPerformance.reduce((max, item) => {
    if (!max || item.overdue > max.overdue) return item;
    return max;
  }, null);

  const bestPerformer = staffPerformance.reduce((best, item) => {
    if (item.assigned < 1) return best;
    if (!best) return item;
    if (item.resolutionRate > best.resolutionRate) return item;
    if (item.resolutionRate === best.resolutionRate && item.resolved > best.resolved) return item;
    return best;
  }, null);

  const slowestResolver = staffPerformance.reduce((slow, item) => {
    if (!Number.isFinite(item.avgResolutionHours)) return slow;
    if (!slow || item.avgResolutionHours > slow.avgResolutionHours) return item;
    return slow;
  }, null);

  const insightCards = [];
  if (mostOverdue && mostOverdue.overdue > 0) {
    insightCards.push({
      type: "warning",
      title: "Highest Overdue Load",
      message: `${mostOverdue.staffName} has ${mostOverdue.overdue} overdue complaint(s).`,
    });
  }
  if (bestPerformer) {
    insightCards.push({
      type: "success",
      title: "Best Performer",
      message: `${bestPerformer.staffName} leads with ${bestPerformer.resolutionRate}% resolution rate.`,
    });
  }
  if (slowestResolver && Number.isFinite(slowestResolver.avgResolutionHours) && slowestResolver.avgResolutionHours > 72) {
    insightCards.push({
      type: "neutral",
      title: "Resolution Time Alert",
      message: `${slowestResolver.staffName} averages ${slowestResolver.avgResolutionTime} per resolution.`,
    });
  }
  if (insightCards.length === 0) {
    insightCards.push({
      type: "neutral",
      title: "Steady Performance",
      message: "No critical performance spikes detected in the selected range.",
    });
  }

  return {
    filters,
    summary,
    staffPerformance,
    charts: {
      staffBar,
      distribution,
      trends,
    },
    insights: insightCards,
  };
}
