import { apiSuccess, handleApiError } from "@/lib/error-handler";
import { requireAdminAccess } from "@/lib/api/admin-access";

const OPEN_STATUSES = [
  "submitted",
  "under_review",
  "assigned",
  "inspection_scheduled",
  "in_progress",
  "overdue",
  "partially_resolved",
  "on_hold",
];

const PENDING_STATUSES = ["submitted", "under_review"];
const REMINDER_WINDOW_HOURS = 72;

export async function GET() {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const nowIso = new Date().toISOString();
    const deadlineCutoff = new Date(Date.now() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    const [pendingRes, unassignedRes, nearingDeadlineRes] = await Promise.all([
      supabase
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .in("status", PENDING_STATUSES),
      supabase
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .in("status", OPEN_STATUSES)
        .is("assigned_to", null),
      supabase
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .in("status", OPEN_STATUSES)
        .not("resolution_deadline", "is", null)
        .gte("resolution_deadline", nowIso)
        .lte("resolution_deadline", deadlineCutoff),
    ]);

    if (pendingRes.error) throw pendingRes.error;
    if (unassignedRes.error) throw unassignedRes.error;
    if (nearingDeadlineRes.error) throw nearingDeadlineRes.error;

    const pendingCount = Number(pendingRes.count || 0);
    const unassignedCount = Number(unassignedRes.count || 0);
    const nearingDeadlineCount = Number(nearingDeadlineRes.count || 0);

    const reminders = [
      {
        key: "pending_complaints",
        icon: "⏳",
        color: "amber",
        message: `You have ${pendingCount} pending complaints`,
        count: pendingCount,
      },
      {
        key: "unassigned_complaints",
        icon: "📌",
        color: "orange",
        message: `${unassignedCount} complaints need assignment`,
        count: unassignedCount,
      },
      {
        key: "nearing_deadline",
        icon: "⚠",
        color: "orange",
        message: `${nearingDeadlineCount} complaints nearing deadline`,
        count: nearingDeadlineCount,
      },
    ];

    return apiSuccess({
      reminders,
      counts: {
        pending: pendingCount,
        unassigned: unassignedCount,
        nearingDeadline: nearingDeadlineCount,
      },
      generatedAt: new Date().toISOString(),
      reminderWindowHours: REMINDER_WINDOW_HOURS,
      refreshSuggestedMinutes: 180,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
