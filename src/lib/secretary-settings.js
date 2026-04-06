export const DEFAULT_SECRETARY_SETTINGS = {
  complaintRules: {
    preferredResolutionDays: 3,
    priorityHandlingNote: "",
    autoAssignEnabled: false,
  },
  notificationPreferences: {
    newComplaints: true,
    overdueComplaints: true,
    escalations: true,
  },
  staffAssignmentPreferences: {
    defaultAssignRole: "engineer",
    workloadSuggestionEnabled: false,
  },
  languagePreference: {
    lang: "en",
  },
};

export function getDefaultSecretarySettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SECRETARY_SETTINGS));
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function sanitizeSecretaryProfilePatch(payload = {}) {
  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const phone = String(payload.phone || "").trim();
  const newPassword = String(payload.newPassword || "");
  const confirmPassword = String(payload.confirmPassword || "");

  if (!name || name.length < 2) {
    return { error: "Name must be at least 2 characters" };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Valid email is required" };
  }

  if (newPassword || confirmPassword) {
    if (newPassword.length < 8) {
      return { error: "New password must be at least 8 characters" };
    }
    if (newPassword !== confirmPassword) {
      return { error: "New password and confirm password do not match" };
    }
  }

  return {
    value: {
      name,
      email,
      phone,
      newPassword,
      confirmPassword,
      shouldUpdatePassword: Boolean(newPassword),
    },
  };
}

export function sanitizeSecretarySettingsPatch(action, payload = {}) {
  if (action === "update_complaint_rules") {
    return {
      complaintRules: {
        preferredResolutionDays: clampInteger(payload.preferredResolutionDays, 1, 30, 3),
        priorityHandlingNote: String(payload.priorityHandlingNote || "").trim().slice(0, 300),
        autoAssignEnabled: Boolean(payload.autoAssignEnabled),
      },
    };
  }

  if (action === "update_notification_preferences") {
    return {
      notificationPreferences: {
        newComplaints: Boolean(payload.newComplaints),
        overdueComplaints: Boolean(payload.overdueComplaints),
        escalations: Boolean(payload.escalations),
      },
    };
  }

  if (action === "update_staff_assignment_preferences") {
    const role = String(payload.defaultAssignRole || "engineer").toLowerCase();
    return {
      staffAssignmentPreferences: {
        defaultAssignRole: role === "clerk" ? "clerk" : "engineer",
        workloadSuggestionEnabled: Boolean(payload.workloadSuggestionEnabled),
      },
    };
  }

  if (action === "update_language_preference") {
    const lang = String(payload.lang || "en").toLowerCase();
    return {
      languagePreference: {
        lang: lang === "ml" ? "ml" : "en",
      },
    };
  }

  return null;
}

export function mergeSecretarySettings(rawSettings) {
  const defaults = getDefaultSecretarySettings();
  const incoming = rawSettings && typeof rawSettings === "object" ? rawSettings : {};

  return {
    complaintRules: {
      ...defaults.complaintRules,
      ...(incoming.complaintRules || {}),
    },
    notificationPreferences: {
      ...defaults.notificationPreferences,
      ...(incoming.notificationPreferences || {}),
    },
    staffAssignmentPreferences: {
      ...defaults.staffAssignmentPreferences,
      ...(incoming.staffAssignmentPreferences || {}),
    },
    languagePreference: {
      ...defaults.languagePreference,
      ...(incoming.languagePreference || {}),
    },
  };
}
