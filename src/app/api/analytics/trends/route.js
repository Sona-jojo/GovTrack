import { apiSuccess, handleApiError } from "@/lib/error-handler";
import { requireAdminAccess } from "@/lib/api/admin-access";
import {
  parseAnalyticsFilters,
  fetchComplaintsForAnalytics,
  toDailyTrendPoints,
} from "@/lib/analytics";

export async function GET(request) {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);
    const filters = parseAnalyticsFilters(searchParams);
    const complaints = await fetchComplaintsForAnalytics(supabase, filters);

    return apiSuccess({
      filters,
      points: toDailyTrendPoints(complaints),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
