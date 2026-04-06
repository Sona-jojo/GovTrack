// Complaint statuses in workflow order
export const STATUSES = [
    "submitted",
    "under_review",
    "assigned",
    "inspection_scheduled",
    "in_progress",
    "overdue",
    "partially_resolved",
    "on_hold",
    "resolved",
    "rejected",
    "closed",
];

export const STATUS_LABELS = {
    submitted: "Submitted",
    under_review: "Under Review",
    assigned: "Assigned",
    inspection_scheduled: "Inspection Scheduled",
    in_progress: "In Progress",
    overdue: "Overdue",
    partially_resolved: "Partially Resolved",
    on_hold: "On Hold",
    resolved: "Resolved",
    rejected: "Rejected",
    closed: "Closed",
};

export const STATUS_COLORS = {
    submitted: "border-blue-300 bg-blue-100 text-blue-800",
    under_review: "border-cyan-300 bg-cyan-100 text-cyan-800",
    assigned: "border-indigo-300 bg-indigo-100 text-indigo-800",
    inspection_scheduled: "border-purple-300 bg-purple-100 text-purple-800",
    in_progress: "border-amber-300 bg-amber-100 text-amber-900",
    overdue: "border-red-300 bg-red-100 text-red-800",
    partially_resolved: "border-orange-300 bg-orange-100 text-orange-800",
    on_hold: "border-rose-300 bg-rose-100 text-rose-800",
    resolved: "border-emerald-300 bg-emerald-100 text-emerald-800",
    rejected: "border-red-300 bg-red-100 text-red-800",
    closed: "border-slate-300 bg-slate-100 text-slate-800",
};

export const PRIORITY_LABELS = { low: "Low", high: "High", urgent: "Urgent" };

export const PRIORITY_COLORS = {
    low: "border-green-300 bg-green-100 text-green-800",
    high: "border-yellow-300 bg-yellow-100 text-yellow-900",
    urgent: "border-red-300 bg-red-100 text-red-800",
};

export const ROLES = ["admin", "secretary", "engineer", "clerk"];

export const ROLE_LABELS = {
    admin: "System Administrator",
    secretary: "Panchayath Secretary",
    engineer: "Section Engineer",
    clerk: "Section Clerk",
};

// Valid status transitions per role
export const TRANSITIONS = {
    secretary: {
        submitted: ["under_review"],
        under_review: ["assigned", "rejected"],
        assigned: ["under_review", "in_progress"],
        inspection_scheduled: ["in_progress"],
        in_progress: ["inspection_scheduled", "partially_resolved", "on_hold"],
        overdue: ["under_review", "assigned", "in_progress", "on_hold", "resolved"],
        partially_resolved: ["in_progress", "resolved", "on_hold"],
        on_hold: ["in_progress", "assigned"],
        resolved: ["closed", "on_hold"],
        rejected: ["under_review"],
    },
    engineer: {
        submitted: ["under_review"],
        under_review: ["in_progress"],
        rejected: ["under_review"],
        assigned: ["inspection_scheduled", "in_progress"],
        inspection_scheduled: ["in_progress"],
        in_progress: ["partially_resolved", "resolved", "on_hold"],
        overdue: ["in_progress", "partially_resolved", "resolved", "on_hold"],
        partially_resolved: ["in_progress", "resolved"],
        on_hold: ["in_progress"],
        resolved: ["partially_resolved"],
    },
    clerk: {
        submitted: ["under_review"],
        under_review: ["in_progress"],
        rejected: ["under_review"],
        assigned: ["inspection_scheduled", "in_progress"],
        inspection_scheduled: ["in_progress"],
        in_progress: ["partially_resolved", "resolved", "on_hold"],
        overdue: ["in_progress", "partially_resolved", "resolved", "on_hold"],
        partially_resolved: ["in_progress", "resolved"],
        on_hold: ["in_progress"],
        resolved: ["partially_resolved"],
    },
};

export const NOTIFICATION_TEMPLATES = {
    submitted: "New complaint {trackingId} submitted in {category}.",
    under_review: "Complaint {trackingId} is now under review.",
    assigned: "Complaint {trackingId} has been assigned to {assignee}.",
    inspection_scheduled: "Inspection scheduled for complaint {trackingId}.",
    in_progress: "Work has started on complaint {trackingId}.",
    overdue: "Complaint {trackingId} is overdue and escalated.",
    partially_resolved: "Complaint {trackingId} is partially resolved.",
    on_hold: "Complaint {trackingId} is on hold.",
    resolved: "Complaint {trackingId} has been resolved.",
    rejected: "Complaint {trackingId} has been rejected.",
    closed: "Complaint {trackingId} has been closed.",
};

export const PAGE_SIZE = 50;
export const MAX_IMAGES = 3;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];
