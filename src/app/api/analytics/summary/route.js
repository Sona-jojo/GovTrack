import { apiSuccess, handleApiError } from "@/lib/error-handler";
import { requireAdminAccess } from "@/lib/api/admin-access";
import {
  parseAnalyticsFilters,
  fetchComplaintsForAnalytics,
  isResolvedStatus,
  isOverdueComplaint,
  getResolutionRate,
  buildStatusDistribution,
} from "@/lib/analytics";

export async function GET(request) {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);
    const filters = parseAnalyticsFilters(searchParams);
    const complaints = await fetchComplaintsForAnalytics(supabase, filters);

    let resolved = 0;
    let overdue = 0;

    for (const complaint of complaints) {
      if (isResolvedStatus(complaint.status)) resolved += 1;
      if (isOverdueComplaint(complaint)) overdue += 1;
    }

    const total = complaints.length;
    const pending = Math.max(total - resolved, 0);

    return apiSuccess({
      filters,
      totals: {
        total,
        resolved,
        pending,
        overdue,
        resolutionRate: getResolutionRate(total, resolved),
      },
      statusDistribution: buildStatusDistribution(complaints),
      resolutionDistribution: [
        { name: "resolved", value: resolved },
        { name: "pending", value: pending },
      ],
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
