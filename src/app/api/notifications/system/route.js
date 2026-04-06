import { apiError, apiSuccess, handleApiError } from "@/lib/error-handler";
import { requireAdminAccess } from "@/lib/api/admin-access";

const SYSTEM_TEMPLATE_PREFIX = "system_";

const EVENT_MAP = {
  monthly_report_generated: {
    icon: "📊",
    message: "Monthly report generated successfully",
    template: "system_monthly_report_generated",
  },
  data_export_completed: {
    icon: "⬇",
    message: "Data export completed",
    template: "system_data_export_completed",
  },
  maintenance_scheduled: {
    icon: "🔧",
    message: "System maintenance scheduled",
    template: "system_maintenance_scheduled",
  },
};

function normalizeStatus(status) {
  return String(status || "").toLowerCase() === "read" ? "read" : "pending";
}

export async function GET(request) {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);
    const unreadOnly = String(searchParams.get("unreadOnly") || "").toLowerCase() === "true";
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 30)));

    let query = supabase
      .from("notifications")
      .select("id, message, template, status, created_at")
      .like("template", `${SYSTEM_TEMPLATE_PREFIX}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq("status", "pending");

    const { data, error } = await query;
    if (error) throw error;

    return apiSuccess(data || []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request) {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const body = await request.json().catch(() => ({}));
    const type = String(body?.type || "").trim().toLowerCase();
    const event = EVENT_MAP[type];
    if (!event) {
      return apiError("Invalid system notification type", 400);
    }

    const messageSuffix = body?.detail ? ` (${String(body.detail).slice(0, 120)})` : "";

    const payload = {
      complaint_id: null,
      message: `${event.icon} ${event.message}${messageSuffix}`,
      channel: "in_app",
      template: event.template,
      status: "pending",
    };

    const { data, error } = await supabase
      .from("notifications")
      .insert(payload)
      .select("id, message, template, status, created_at")
      .single();

    if (error) throw error;

    return apiSuccess(data, "System notification created", 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request) {
  try {
    const { error: accessError, supabase } = await requireAdminAccess();
    if (accessError) return accessError;

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];

    if (ids.length === 0) {
      return apiError("Notification ids are required", 400);
    }

    const nextStatus = normalizeStatus(body?.status);

    const { data, error } = await supabase
      .from("notifications")
      .update({ status: nextStatus })
      .in("id", ids)
      .like("template", `${SYSTEM_TEMPLATE_PREFIX}%`)
      .select("id, status");

    if (error) throw error;

    return apiSuccess({ updated: data?.length || 0, status: nextStatus, rows: data || [] }, "Notification status updated");
  } catch (err) {
    return handleApiError(err);
  }
}
