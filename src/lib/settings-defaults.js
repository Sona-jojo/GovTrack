import { ISSUE_CATEGORIES } from "@/lib/categories";

export const DEFAULT_ADMIN_SETTINGS = {
  complaintRules: {
    defaultResolutionDays: 3,
    urgentIssueHours: 24,
    escalationTriggerHours: 48,
    maxImageUploadLimit: 3,
  },
  notificationSettings: {
    enableSystemNotifications: true,
    enablePerformanceAlerts: true,
    enableReminderAlerts: true,
  },
  reportSettings: {
    autoGenerateWeeklyReport: true,
    autoGenerateMonthlyReport: true,
    exportFormat: "csv",
  },
  securitySettings: {
    forcePasswordResetForStaff: false,
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
  },
  noticeSettings: {
    enableGlobalNotices: true,
    noticeExpiryDays: 7,
    pinImportantNotices: true,
  },
};

const CATEGORY_STYLE_FALLBACK = {
  icon: "📌",
  color: "from-cyan-400 to-blue-500",
  borderColor: "border-cyan-300",
  bgColor: "bg-cyan-50",
  textColor: "text-cyan-900",
};

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getDefaultSettings() {
  return deepClone(DEFAULT_ADMIN_SETTINGS);
}

export function getDefaultCategories() {
  return ISSUE_CATEGORIES.map((category) => ({
    ...deepClone(category),
    isActive: true,
    subcategories: (category.subcategories || []).map((sub) => ({
      ...deepClone(sub),
      isActive: true,
    })),
  }));
}

export function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function sanitizeSettingsPatch(action, payload = {}) {
  if (action === "update_complaint_rules") {
    return {
      defaultResolutionDays: clampInteger(payload.defaultResolutionDays, 1, 30, 3),
      urgentIssueHours: clampInteger(payload.urgentIssueHours, 1, 168, 24),
      escalationTriggerHours: clampInteger(payload.escalationTriggerHours, 1, 720, 48),
      maxImageUploadLimit: clampInteger(payload.maxImageUploadLimit, 1, 10, 3),
    };
  }

  if (action === "update_notification_settings") {
    return {
      enableSystemNotifications: Boolean(payload.enableSystemNotifications),
      enablePerformanceAlerts: Boolean(payload.enablePerformanceAlerts),
      enableReminderAlerts: Boolean(payload.enableReminderAlerts),
    };
  }

  if (action === "update_report_settings") {
    const format = String(payload.exportFormat || "csv").toLowerCase() === "pdf" ? "pdf" : "csv";
    return {
      autoGenerateWeeklyReport: Boolean(payload.autoGenerateWeeklyReport),
      autoGenerateMonthlyReport: Boolean(payload.autoGenerateMonthlyReport),
      exportFormat: format,
    };
  }

  if (action === "update_security_settings") {
    return {
      forcePasswordResetForStaff: Boolean(payload.forcePasswordResetForStaff),
      sessionTimeoutMinutes: clampInteger(payload.sessionTimeoutMinutes, 5, 720, 60),
      maxLoginAttempts: clampInteger(payload.maxLoginAttempts, 3, 15, 5),
    };
  }

  if (action === "update_notice_settings") {
    return {
      enableGlobalNotices: Boolean(payload.enableGlobalNotices),
      noticeExpiryDays: clampInteger(payload.noticeExpiryDays, 1, 90, 7),
      pinImportantNotices: Boolean(payload.pinImportantNotices),
    };
  }

  return null;
}

export function mergeSettings(rows = []) {
  const defaults = getDefaultSettings();
  const map = new Map((rows || []).map((row) => [row.key, row.value_json]));

  return {
    complaintRules: { ...defaults.complaintRules, ...(map.get("complaint_rules") || {}) },
    notificationSettings: { ...defaults.notificationSettings, ...(map.get("notification_settings") || {}) },
    reportSettings: { ...defaults.reportSettings, ...(map.get("report_settings") || {}) },
    securitySettings: { ...defaults.securitySettings, ...(map.get("security_settings") || {}) },
    noticeSettings: { ...defaults.noticeSettings, ...(map.get("notice_settings") || {}) },
  };
}

export function mapCategoryRows(categories = [], subcategories = [], includeInactive = false) {
  const filteredCategories = includeInactive
    ? categories
    : categories.filter((item) => item.is_active !== false);
  const filteredSubcategories = includeInactive
    ? subcategories
    : subcategories.filter((item) => item.is_active !== false);

  const subByCategory = new Map();
  for (const sub of filteredSubcategories) {
    const current = subByCategory.get(sub.category_id) || [];
    current.push(sub);
    subByCategory.set(sub.category_id, current);
  }

  return filteredCategories.map((category) => ({
    id: category.id,
    name: category.name,
    nameMl: category.name_ml || category.name,
    icon: category.icon || CATEGORY_STYLE_FALLBACK.icon,
    color: category.color || CATEGORY_STYLE_FALLBACK.color,
    borderColor: category.border_color || CATEGORY_STYLE_FALLBACK.borderColor,
    bgColor: category.bg_color || CATEGORY_STYLE_FALLBACK.bgColor,
    textColor: category.text_color || CATEGORY_STYLE_FALLBACK.textColor,
    aiTip: category.ai_tip || "",
    isActive: category.is_active !== false,
    sortOrder: category.sort_order || 100,
    subcategories: (subByCategory.get(category.id) || []).map((sub) => ({
      id: sub.id,
      name: sub.name,
      nameMl: sub.name_ml || sub.name,
      description: sub.description || "",
      descriptionMl: sub.description_ml || sub.description || "",
      isActive: sub.is_active !== false,
      sortOrder: sub.sort_order || 100,
    })),
  }));
}

export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
