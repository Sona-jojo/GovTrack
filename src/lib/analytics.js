const RESOLVED_STATUSES = new Set(["resolved", "closed"]);

function toStartOfDayIso(dateInput) {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function toEndOfDayIso(dateInput) {
  const d = new Date(dateInput);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function getMonthBounds(offsetMonths = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 23, 59, 59, 999);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function getMonthBoundsFromYearMonth(yearMonth) {
  if (!/^\d{4}-\d{2}$/.test(String(yearMonth || ""))) {
    return null;
  }

  const [yearStr, monthStr] = String(yearMonth).split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function parseAnalyticsFilters(searchParams) {
  const dateRange = (searchParams.get("dateRange") || "all_time").trim().toLowerCase();
  const customStart = searchParams.get("startDate");
  const customEnd = searchParams.get("endDate");
  const selectedMonth = (searchParams.get("selectedMonth") || "").trim();

  let start;
  let end;

  if (dateRange === "selected_month" && selectedMonth) {
    const range = getMonthBoundsFromYearMonth(selectedMonth);
    if (range) {
      start = range.start;
      end = range.end;
    }
  } else if (dateRange === "last_month") {
    const range = getMonthBounds(-1);
    start = range.start;
    end = range.end;
  } else if (dateRange === "custom" && customStart && customEnd) {
    start = toStartOfDayIso(customStart);
    end = toEndOfDayIso(customEnd);
  } else if (dateRange === "this_month") {
    const range = getMonthBounds(0);
    start = range.start;
    end = range.end;
  } else {
    start = undefined;
    end = undefined;
  }

  const localBodyId = (searchParams.get("localBodyId") || "").trim();
  const department = (searchParams.get("department") || "").trim();

  return {
    dateRange,
    start,
    end,
    selectedMonth,
    localBodyId,
    department,
  };
}

export function applyComplaintFilters(query, filters) {
  if (filters.localBodyId) {
    query = query.eq("local_body_id", filters.localBodyId);
  }
  if (filters.department) {
    query = query.eq("category", filters.department);
  }
  if (filters.start) {
    query = query.gte("created_at", filters.start);
  }
  if (filters.end) {
    query = query.lte("created_at", filters.end);
  }
  return query;
}

export function isResolvedStatus(status) {
  return RESOLVED_STATUSES.has(String(status || "").toLowerCase());
}

export function isOverdueComplaint(item) {
  if (!item?.resolution_deadline) return false;
  if (isResolvedStatus(item.status)) return false;
  return new Date(item.resolution_deadline).getTime() < Date.now();
}

export function getResolutionDurationDays(item) {
  const created = item?.created_at ? new Date(item.created_at).getTime() : NaN;
  const resolvedAt = item?.resolved_at
    ? new Date(item.resolved_at).getTime()
    : item?.updated_at
      ? new Date(item.updated_at).getTime()
      : NaN;

  if (!Number.isFinite(created) || !Number.isFinite(resolvedAt) || resolvedAt < created) {
    return null;
  }

  const days = (resolvedAt - created) / (1000 * 60 * 60 * 24);
  return Number(days.toFixed(2));
}

export function getResolutionRate(total, resolved) {
  if (!total) return 0;
  return Number(((resolved / total) * 100).toFixed(1));
}

export function toDailyTrendPoints(complaints) {
  const byDay = new Map();

  for (const complaint of complaints || []) {
    const day = new Date(complaint.created_at).toISOString().slice(0, 10);
    if (!byDay.has(day)) {
      byDay.set(day, { date: day, total: 0, resolved: 0, pending: 0 });
    }
    const row = byDay.get(day);
    row.total += 1;
    if (isResolvedStatus(complaint.status)) {
      row.resolved += 1;
    } else {
      row.pending += 1;
    }
  }

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function toDepartmentRows(complaints) {
  const bucket = new Map();

  for (const complaint of complaints || []) {
    const name = complaint.category || "Unspecified";
    if (!bucket.has(name)) {
      bucket.set(name, { department: name, total: 0, resolved: 0, pending: 0 });
    }

    const row = bucket.get(name);
    row.total += 1;
    if (isResolvedStatus(complaint.status)) {
      row.resolved += 1;
    } else {
      row.pending += 1;
    }
  }

  return [...bucket.values()]
    .map((row) => ({
      ...row,
      resolutionRate: getResolutionRate(row.total, row.resolved),
    }))
    .sort((a, b) => b.total - a.total);
}

export function buildStatusDistribution(complaints) {
  const counts = new Map();

  for (const complaint of complaints || []) {
    const status = complaint.status || "unknown";
    counts.set(status, (counts.get(status) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export async function fetchComplaintsForAnalytics(supabase, filters) {
  let query = supabase
    .from("complaints")
    .select("id, created_at, updated_at, resolved_at, status, category, local_body_id, resolution_deadline");

  query = applyComplaintFilters(query, filters);

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
}

export async function fetchMonthComplaints(supabase, monthOffset = 0, localBodyId = "", department = "") {
  const bounds = getMonthBounds(monthOffset);
  const filters = {
    start: bounds.start,
    end: bounds.end,
    localBodyId,
    department,
  };
  return fetchComplaintsForAnalytics(supabase, filters);
}

export function monthLabel(monthOffset = 0) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function monthLabelFromYearMonth(yearMonth) {
  const bounds = getMonthBoundsFromYearMonth(yearMonth);
  if (!bounds) return "Selected Month";
  return new Date(bounds.start).toLocaleString("en-US", { month: "long", year: "numeric" });
}
