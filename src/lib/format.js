const LOCALE = "en-IN";

const compact = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat(LOCALE);

export function formatNumber(value, { compactAbove = 100_000 } = {}) {
  if (value == null || Number.isNaN(value)) return "—";
  return Math.abs(value) >= compactAbove ? compact.format(value) : whole.format(value);
}

export function formatCurrency(value, currency = "INR") {
  if (value == null) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    notation: Math.abs(value) >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value, digits = 0) {
  if (value == null) return "—";
  return `${value.toFixed(digits)}%`;
}

// Percentage change between two periods; null when there is no baseline.
export function percentChange(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export function formatShortDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
}

export function formatTime(isoDate) {
  return new Date(isoDate).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}
