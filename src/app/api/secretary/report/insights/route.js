import { apiSuccess, handleApiError } from "@/lib/error-handler";
import {
  buildSecretaryReportData,
  parseReportFilters,
  requireSecretaryAccess,
} from "@/lib/secretary-report";

export async function GET(request) {
  try {
    const access = await requireSecretaryAccess();
    if (access.error) return access.error;

    const { searchParams } = new URL(request.url);
    const filters = parseReportFilters(searchParams);
    const report = await buildSecretaryReportData(
      access.supabase,
      access.profile.local_body_id,
      filters,
      access.profile.local_bodies?.name,
      access.profile.local_bodies?.district
    );

    return apiSuccess(report.insights);
  } catch (err) {
    return handleApiError(err);
  }
}
