import { apiSuccess, handleApiError } from "@/lib/error-handler";
import { requireAdminAccess } from "@/lib/api/admin-access";
import {
  fetchMonthComplaints,
  fetchComplaintsForAnalytics,
  monthLabel,
  monthLabelFromYearMonth,
  getMonthBoundsFromYearMonth,
  parseAnalyticsFilters,
  getResolutionDurationDays,
  isResolvedStatus,
  toDepartmentRows,
  getResolutionRate,
} from "@/lib/analytics";

function buildInsightCards({ departmentRows, currentResolutionRate, previousResolutionRate }) {
  const insights = [];

  const highestComplaintsDepartment = departmentRows[0];
  if (highestComplaintsDepartment) {
    insights.push({
      type: "warning",
      message: `${highestComplaintsDepartment.department} has the highest complaint volume this month.`,
    });
  }

  if (previousResolutionRate > currentResolutionRate) {
    insights.push({
      type: "warning",
      message: `Resolution rate dropped from ${previousResolutionRate}% to ${currentResolutionRate}% compared to last month.`,
    });
  } else {
    insights.push({
      type: "info",
      message: `Resolution rate is ${currentResolutionRate}% this month.`,
    });
  }

  return insights;
}

export async function GET(request) {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);
    const filters = parseAnalyticsFilters(searchParams);

    let currentMonth = [];
    let previousMonth = [];
    let reportMonthLabel = monthLabel(0);

    if (filters.dateRange === "selected_month" && filters.selectedMonth) {
      const selectedBounds = getMonthBoundsFromYearMonth(filters.selectedMonth);
      if (selectedBounds) {
        currentMonth = await fetchComplaintsForAnalytics(supabase, {
          start: selectedBounds.start,
          end: selectedBounds.end,
          localBodyId: filters.localBodyId,
          department: filters.department,
        });

        const selectedDate = new Date(selectedBounds.start);
        const previousYearMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()).padStart(2, "0")}`;
        const prevBounds = getMonthBoundsFromYearMonth(previousYearMonth);
        previousMonth = prevBounds
          ? await fetchComplaintsForAnalytics(supabase, {
              start: prevBounds.start,
              end: prevBounds.end,
              localBodyId: filters.localBodyId,
              department: filters.department,
            })
          : [];

        reportMonthLabel = monthLabelFromYearMonth(filters.selectedMonth);
      }
    } else if (filters.dateRange === "last_month") {
      currentMonth = await fetchMonthComplaints(supabase, -1, filters.localBodyId, filters.department);
      previousMonth = await fetchMonthComplaints(supabase, -2, filters.localBodyId, filters.department);
      reportMonthLabel = monthLabel(-1);
    } else if (filters.dateRange === "custom" || filters.dateRange === "all_time") {
      currentMonth = await fetchComplaintsForAnalytics(supabase, filters);
      previousMonth = await fetchMonthComplaints(supabase, -1, filters.localBodyId, filters.department);
      reportMonthLabel = filters.dateRange === "all_time" ? "All Time" : "Custom Range";
    } else {
      currentMonth = await fetchMonthComplaints(supabase, 0, filters.localBodyId, filters.department);
      previousMonth = await fetchMonthComplaints(supabase, -1, filters.localBodyId, filters.department);
      reportMonthLabel = monthLabel(0);
    }

    const totalComplaints = currentMonth.length;

    const resolvedComplaints = currentMonth.filter((item) => isResolvedStatus(item.status));
    const resolvedCount = resolvedComplaints.length;

    const resolutionDurations = resolvedComplaints
      .map((item) => getResolutionDurationDays(item))
      .filter((days) => typeof days === "number");

    const avgResolutionDays = resolutionDurations.length
      ? Number(
          (
            resolutionDurations.reduce((sum, days) => sum + days, 0) /
            resolutionDurations.length
          ).toFixed(1),
        )
      : 0;

    const categoryCounts = new Map();
    for (const complaint of currentMonth) {
      const category = complaint.category || "Unspecified";
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    }

    const mostFrequentIssueCategory = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    const departmentRows = toDepartmentRows(currentMonth);
    const worstPerformingDepartment = departmentRows.length
      ? [...departmentRows].sort((a, b) => a.resolutionRate - b.resolutionRate)[0].department
      : "N/A";

    const previousResolved = previousMonth.filter((item) => isResolvedStatus(item.status)).length;
    const previousResolutionRate = getResolutionRate(previousMonth.length, previousResolved);
    const currentResolutionRate = getResolutionRate(totalComplaints, resolvedCount);

    const insights = buildInsightCards({
      departmentRows,
      currentResolutionRate,
      previousResolutionRate,
    });

    return apiSuccess({
      month: reportMonthLabel,
      filters: {
        localBodyId: filters.localBodyId,
        department: filters.department,
        dateRange: filters.dateRange,
        selectedMonth: filters.selectedMonth,
      },
      totalComplaints,
      avgResolutionDays,
      mostFrequentIssueCategory,
      worstPerformingDepartment,
      resolutionRate: currentResolutionRate,
      previousResolutionRate,
      insights,
      departmentTable: departmentRows,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
