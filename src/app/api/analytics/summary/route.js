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

    const complaintIds = complaints.map((item) => item.id).filter(Boolean);
    let feedbackSummary = {
      totalFeedbacks: 0,
      averageRating: 0,
      lowRatingCount: 0,
    };

    if (complaintIds.length > 0) {
      // Use SQL aggregation instead of loading all rows and filtering in JavaScript
      const { data: feedbackAgg, error: feedbackError } = await supabase
        .rpc("get_feedback_summary", {
          complaint_ids: complaintIds,
        });

      if (feedbackError && feedbackError.code !== "42P01" && feedbackError.code !== "PGRST205") {
        throw feedbackError;
      }

      if (feedbackAgg && feedbackAgg.length > 0) {
        const summary = feedbackAgg[0];
        feedbackSummary = {
          totalFeedbacks: summary.total_feedbacks || 0,
          averageRating: summary.avg_rating ? Number(summary.avg_rating.toFixed(1)) : 0,
          lowRatingCount: summary.low_rating_count || 0,
        };
      }
    }

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
      feedbackSummary,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
