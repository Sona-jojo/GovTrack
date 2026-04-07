const APP_TIME_ZONE = "Asia/Kolkata";
const APP_LOCALE = "en-IN";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

const DATE_FORMATTER = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function parseAppDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const numericDate = new Date(value);
    return Number.isNaN(numericDate.getTime()) ? null : numericDate;
  }

  if (typeof value !== "string") {
    return null;
  }

  // Handle strings like "06-04-2026, 5:58 PM" robustly.
  const humanMatch = value
    .trim()
    .match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4}),\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (humanMatch) {
    const day = Number(humanMatch[1]);
    const month = Number(humanMatch[2]);
    const year = Number(humanMatch[3]);
    const hh = Number(humanMatch[4]);
    const mm = Number(humanMatch[5]);
    const ss = Number(humanMatch[6] || 0);
    const period = String(humanMatch[7]).toUpperCase();
    const hour24 = (hh % 12) + (period === "PM" ? 12 : 0);
    const utcMillis = Date.UTC(year, month - 1, day, hour24, mm, ss);
    const parsedHuman = new Date(utcMillis);
    if (!Number.isNaN(parsedHuman.getTime())) {
      return parsedHuman;
    }
  }

  // Supabase can return timestamps like "2026-04-06 17:58:00" (no zone).
  // Treat zone-less DB timestamps as UTC so IST display stays accurate.
  const trimmed = value.trim();
  const normalizedBase = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const hasTimezone = /(Z|[+-]\d{2}:?\d{2})$/i.test(normalizedBase);
  const normalized = hasTimezone ? normalizedBase : `${normalizedBase}Z`;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date(trimmed);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return parsed;
}

export function formatExactDateTime(value, fallback = "-") {
  const date = parseAppDate(value);
  if (!date) return fallback;
  return `${DATE_TIME_FORMATTER.format(date)} IST`;
}

export function formatExactDate(value, fallback = "-") {
  const date = parseAppDate(value);
  if (!date) return fallback;
  return DATE_FORMATTER.format(date);
}

export function toExactTimestamp(value) {
  const date = parseAppDate(value);
  return date ? date.getTime() : NaN;
}

export function getIndiaDateStamp() {
  const parts = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) return new Date().toISOString().slice(0, 10);
  return `${year}-${month}-${day}`;
}

export function getIndiaMonthStamp() {
  const parts = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;

  if (!year || !month) return new Date().toISOString().slice(0, 7);
  return `${year}-${month}`;
}

export { APP_TIME_ZONE };