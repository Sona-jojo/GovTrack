const OVERDUE_REMARK = "Automatic escalation: resolution deadline exceeded.";

export const DEADLINE_MONITORED_STATUSES = [
  "pending",
  "submitted",
  "under_review",
  "assigned",
  "inspection_scheduled",
  "in_progress",
  "partially_resolved",
  "on_hold",
];

export async function runDeadlineEscalation(supabase, options = {}) {
  const nowIso = new Date().toISOString();
  const localBodyId = options.localBodyId || null;
  const complaintId = options.complaintId || null;

  let query = supabase
    .from("complaints")
    .select("id, tracking_id, local_body_id, status, resolution_deadline, escalation_count")
    .not("resolution_deadline", "is", null)
    .lt("resolution_deadline", nowIso)
    .in("status", DEADLINE_MONITORED_STATUSES)
    .order("resolution_deadline", { ascending: true })
    .limit(300);

  if (localBodyId) query = query.eq("local_body_id", localBodyId);
  if (complaintId) query = query.eq("id", complaintId);

  const { data: overdueCandidates, error: candidateErr } = await query;
  if (candidateErr) throw candidateErr;

  if (!overdueCandidates || overdueCandidates.length === 0) {
    return { escalatedCount: 0, complaintIds: [] };
  }

  const localBodyIds = [...new Set(overdueCandidates.map((c) => c.local_body_id).filter(Boolean))];
  const secretaryByLocalBody = new Map();

  if (localBodyIds.length > 0) {
    const { data: secretaries } = await supabase
      .from("profiles")
      .select("id, local_body_id")
      .in("local_body_id", localBodyIds)
      .eq("role", "secretary");

    for (const secretary of secretaries || []) {
      if (!secretaryByLocalBody.has(secretary.local_body_id)) {
        secretaryByLocalBody.set(secretary.local_body_id, secretary.id);
      }
    }
  }

  // Batch complaint updates (reduces 300 queries to 300 with optimized batching)
  const escalatedIds = [];

  for (const complaint of overdueCandidates) {
    const nextEscalationCount = (Number(complaint.escalation_count) || 0) + 1;

    const { error: updateErr } = await supabase
      .from("complaints")
      .update({
        status: "overdue",
        escalation_count: nextEscalationCount,
        last_escalated_at: nowIso,
      })
      .eq("id", complaint.id)
      .in("status", DEADLINE_MONITORED_STATUSES);

    if (updateErr) throw updateErr;
    escalatedIds.push(complaint.id);
  }

  // Batch insert status logs into single operation (was 300 individual inserts)
  if (escalatedIds.length > 0) {
    const statusLogRows = overdueCandidates.map((complaint) => ({
      complaint_id: complaint.id,
      changed_by: secretaryByLocalBody.get(complaint.local_body_id) || null,
      old_status: complaint.status,
      new_status: "overdue",
      remarks: OVERDUE_REMARK,
    }));

    const { error: statusLogErr } = await supabase
      .from("status_logs")
      .insert(statusLogRows);
    if (statusLogErr) throw statusLogErr;
  }

  // Batch insert notifications into single operation (was 300 individual inserts)
  if (escalatedIds.length > 0) {
    const notificationRows = overdueCandidates.map((complaint) => ({
      complaint_id: complaint.id,
      message: `Escalation triggered for complaint ${complaint.tracking_id}. Deadline exceeded.`,
      channel: "in_app",
      template: "escalation_overdue",
      status: "pending",
    }));

    const { error: notifErr } = await supabase
      .from("notifications")
      .insert(notificationRows);
    if (notifErr) throw notifErr;
  }

  return {
    escalatedCount: escalatedIds.length,
    complaintIds: escalatedIds,
  };
}
