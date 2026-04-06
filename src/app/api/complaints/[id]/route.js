import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";
import { TRANSITIONS } from "@/lib/constants";

async function getAuthenticatedUser(cookieStore) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createServerClient(url, key, {
        cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll() { },
        },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { supabase, user: null, profile: null };

    // Use service role to bypass RLS on profiles
    const serviceSupabase = createServerClient(url, serviceKey || key, {
        cookies: { getAll() { return []; }, setAll() { } },
    });

    const { data: profile } = await serviceSupabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    return { supabase, user, profile };
}

// PATCH — Update complaint (status, assignment, deadline)
export async function PATCH(request, { params }) {
    try {
        const cookieStore = await cookies();
        const { supabase, user, profile } = await getAuthenticatedUser(cookieStore);

        if (!user || !profile) return apiError("Unauthorized", 401);

        const { id } = await params;
        const body = await request.json();

        // Fetch current complaint
        const { data: complaint, error: fetchErr } = await supabase
            .from("complaints")
            .select("*")
            .eq("id", id)
            .single();
        if (fetchErr || !complaint) return apiError("Complaint not found", 404);

        // ─── Authorization checks ───────────────────────────
        if (profile.role === "secretary") {
            if (complaint.local_body_id !== profile.local_body_id) {
                return apiError("Not authorized for this local body", 403);
            }
        } else if (
            profile.role === "engineer" ||
            profile.role === "clerk"
        ) {
            // Allow access only if directly assigned to this user
            const isDirectlyAssigned = complaint.assigned_to === user.id;
            if (!isDirectlyAssigned) {
                return apiError("Not assigned to this complaint", 403);
            }
        } else {
            return apiError("Invalid role", 403);
        }

        // ─── Status update ──────────────────────────────────
        if (body.status && body.status !== complaint.status) {
            const allowed = TRANSITIONS[profile.role]?.[complaint.status];
            if (!allowed || !allowed.includes(body.status)) {
                return apiError(
                    `Cannot transition from "${complaint.status}" to "${body.status}" as ${profile.role}`,
                    403,
                );
            }
        }

        const updatePayload = {};
        const isSecretary = profile.role === "secretary";
        const requestedAssignment = Boolean(body.assigned_to || body.assigned_role);
        const requestedDeadline = body.resolution_deadline || null;
        const effectiveDeadline = requestedDeadline || complaint.resolution_deadline || null;

        if (isSecretary && requestedAssignment && !effectiveDeadline) {
            return apiError("Resolution deadline is required when assigning or reassigning a complaint", 422);
        }

        if (body.status) updatePayload.status = body.status;
        if (body.assigned_to) updatePayload.assigned_to = body.assigned_to;
        if (body.assigned_role) updatePayload.assigned_role = body.assigned_role;
        if (body.resolution_deadline) updatePayload.resolution_deadline = body.resolution_deadline;
        if (body.status === "resolved") updatePayload.resolved_at = new Date().toISOString();

        const serviceSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
        );

        if (body.assigned_to || body.assigned_role) {
            const targetAssigneeId = body.assigned_to || complaint.assigned_to || null;
            const targetRole = body.assigned_role || complaint.assigned_role || null;

            if (targetAssigneeId) {
                const { data: targetAssignee, error: assigneeError } = await serviceSupabase
                    .from("profiles")
                    .select("id, role, local_body_id, status")
                    .eq("id", targetAssigneeId)
                    .single();

                if (assigneeError || !targetAssignee) {
                    return apiError("Assigned staff member not found", 404);
                }

                if (String(targetAssignee.status || "").toLowerCase() !== "active") {
                    return apiError("Selected staff member is inactive", 400);
                }

                if (!["engineer", "clerk", "secretary"].includes(targetAssignee.role)) {
                    return apiError("Assigned user is not a staff member", 400);
                }

                if (isSecretary && targetAssignee.local_body_id !== profile.local_body_id) {
                    return apiError("Cannot assign staff outside your local body", 403);
                }

                updatePayload.assigned_role = targetRole || targetAssignee.role;
            }

            if (targetRole) {
                const { data: activeStaff, error: roleError } = await serviceSupabase
                    .from("profiles")
                    .select("id")
                    .eq("role", targetRole)
                    .eq("status", "active")
                    .eq("local_body_id", complaint.local_body_id);

                if (roleError) throw roleError;

                if (!activeStaff || activeStaff.length === 0) {
                    return apiError(`No active ${targetRole} available for this local body`, 400);
                }
            }
        }

        if (Object.keys(updatePayload).length === 0) {
            return apiError("No valid fields to update", 400);
        }

        const { error: updateErr } = await supabase
            .from("complaints")
            .update(updatePayload)
            .eq("id", id);
        if (updateErr) throw updateErr;

        // Insert status log
        if (body.status && body.status !== complaint.status) {
            await supabase.from("status_logs").insert({
                complaint_id: id,
                changed_by: user.id,
                old_status: complaint.status,
                new_status: body.status,
                remarks: body.remarks || null,
            });

            // Insert notification
            await supabase.from("notifications").insert({
                complaint_id: id,
                message: `Complaint ${complaint.tracking_id} status changed to ${body.status}.`,
                channel: "in_app",
                template: body.status,
                status: "pending",
            });
        }

        if (isSecretary && requestedAssignment && !body.status) {
            await supabase.from("status_logs").insert({
                complaint_id: id,
                changed_by: user.id,
                old_status: complaint.status,
                new_status: complaint.status,
                remarks:
                    body.remarks ||
                    `Reassigned by secretary to ${body.assigned_role || complaint.assigned_role || "staff"}.`,
            });
        }

        // Insert audit log
        await supabase.from("audit_logs").insert({
            user_id: user.id,
            action_type: body.status ? "status_change" : "assignment",
            target_table: "complaints",
            target_id: id,
            meta: { old_status: complaint.status, ...updatePayload },
        });

        return apiSuccess({ id, ...updatePayload }, "Complaint updated");
    } catch (err) {
        return handleApiError(err);
    }
}
