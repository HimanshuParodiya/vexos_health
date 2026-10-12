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

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function toDate(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// "16:03:45" (or "16:03" without seconds).
export function formatClock(value, { seconds = true } = {}) {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleTimeString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    second: seconds ? "2-digit" : undefined,
    hourCycle: "h23",
  });
}

// "27 Sep 21:58"; drops the date when it is today.
export function formatDayTime(value, { alwaysShowDate = false } = {}) {
  const date = toDate(value);
  if (!date) return "—";
  const time = formatClock(date, { seconds: false });
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday && !alwaysShowDate ? time : `${formatShortDate(date)} ${time}`;
}

// Elapsed time in the compact form used on alerts: "2 min", "6 h", "14 d".
export function formatElapsed(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return "—";
  const elapsed = Math.max(0, now - date.getTime());
  if (elapsed < MINUTE_MS) return "now";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} min`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} h`;
  return `${Math.floor(elapsed / DAY_MS)} d`;
}

// Stopwatch form for waiting times: "6:12" (m:ss), "2:14:05" (h:mm:ss), "14 d".
export function formatStopwatch(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return "—";
  const totalSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (totalSeconds >= DAY_MS / 1000) return `${Math.floor(totalSeconds / (DAY_MS / 1000))} d`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
}

// Backend durations come as "HH:MM:SS" with unbounded hours, e.g. "399:21:31".
export function parseHms(value) {
  if (typeof value !== "string") return null;
  const parts = value.split(":").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [hours, minutes, seconds] = parts;
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

// Length of stay: "16d 15h", "5h 12m", "12m".
export function formatLengthOfStay(ms, { short = false } = {}) {
  if (ms == null) return "—";
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
  if (days > 0) return short ? `${days}d` : `${days}d ${String(hours).padStart(2, "0")}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}

// "just now", "5 min ago", "3 d ago".
export function formatAgo(value, now = Date.now()) {
  const elapsed = formatElapsed(value, now);
  if (elapsed === "—") return elapsed;
  return elapsed === "now" ? "just now" : `${elapsed} ago`;
}
