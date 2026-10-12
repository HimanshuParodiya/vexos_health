// Clinical helpers shared by the nurse, doctor and flowsheet screens.

// Data older than this is treated as "monitor offline" (backend keeps last-known state, flagged stale).
export const STALE_AFTER_MS = 15 * 60_000;

// Alarm limits used for colouring values. `low`/`high` = outside normal range,
// `critLow`/`critHigh` = critical. Values outside a critical limit are critical.
export const VITAL_LIMITS = {
  heartRate: { low: 50, high: 110, critLow: 40, critHigh: 120 },
  spo2: { low: 92, critLow: 88 },
  respiratoryRate: { low: 10, high: 24, critLow: 8, critHigh: 30 },
  temperature: { low: 36, high: 38, critLow: 35, critHigh: 39.5 },
  systolic: { low: 90, high: 160, critLow: 80, critHigh: 200 },
  diastolic: { low: 50, high: 100, critLow: 40, critHigh: 120 },
  map: { low: 65, high: 110, critLow: 55, critHigh: 130 },
  cvp: { low: 2, high: 12 },
  etco2: { low: 35, high: 45, critLow: 25, critHigh: 60 },
  bloodGlucose: { low: 70, high: 180, critLow: 54, critHigh: 300 },
  peakPressure: { high: 35, critHigh: 40 },
  plateauPressure: { high: 30, critHigh: 35 },
};

// "normal" | "outside" | "critical" | null (no value or no limits).
export function assessValue(limitKey, value) {
  const limits = VITAL_LIMITS[limitKey];
  if (!limits || value == null || typeof value !== "number" || Number.isNaN(value)) return null;
  if ((limits.critLow != null && value < limits.critLow) || (limits.critHigh != null && value > limits.critHigh)) {
    return "critical";
  }
  if ((limits.low != null && value < limits.low) || (limits.high != null && value > limits.high)) {
    return "outside";
  }
  return "normal";
}

export function toNumber(value) {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isNaN(number) ? null : number;
}

// First numeric value among the given keys; devices name some parameters differently.
export function pickNumber(source, ...keys) {
  if (!source) return null;
  for (const key of keys) {
    const value = toNumber(source[key]);
    if (value != null) return value;
  }
  return null;
}

export function roundTo(value, digits = 0) {
  if (value == null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function meanArterialPressure(systolic, diastolic) {
  return systolic != null && diastolic != null ? (systolic + 2 * diastolic) / 3 : null;
}

export function observationTime(observation) {
  const raw = observation?.timestamp ?? observation?.observed_at ?? observation?.time;
  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(time) ? null : time;
}

// Canonical vitals from one patient-monitor observation.
export function vitalsFromObservation(obs) {
  if (!obs) return null;
  const arterialSys = pickNumber(obs, "arterial_systolic_bp");
  const arterialDia = pickNumber(obs, "arterial_diastolic_bp");
  const nbpSys = pickNumber(obs, "nbp_systolic_bp");
  const nbpDia = pickNumber(obs, "nbp_diastolic_bp");
  const systolic = arterialSys ?? pickNumber(obs, "systolic_bp") ?? nbpSys;
  const diastolic = arterialDia ?? pickNumber(obs, "diastolic_bp") ?? nbpDia;

  return {
    at: observationTime(obs),
    heartRate: pickNumber(obs, "heart_rate", "pulse_rate"),
    spo2: pickNumber(obs, "spo2"),
    respiratoryRate: pickNumber(obs, "respiratory_rate"),
    temperature: pickNumber(obs, "temperature"),
    arterialSys,
    arterialDia,
    arterialMap:
      pickNumber(obs, "arterial_mean_bp", "mean_arterial_pressure") ?? meanArterialPressure(arterialSys, arterialDia),
    nbpSys,
    nbpDia,
    nbpMap: pickNumber(obs, "nbp_mean_bp") ?? meanArterialPressure(nbpSys, nbpDia),
    map: pickNumber(obs, "arterial_mean_bp", "mean_arterial_pressure", "nbp_mean_bp") ?? meanArterialPressure(systolic, diastolic),
    systolic,
    diastolic,
    cvp: pickNumber(obs, "cvp"),
    etco2: pickNumber(obs, "etco2", "end_tidal_co2"),
    bloodGlucose: pickNumber(obs, "blood_glucose"),
  };
}

const VENTILATOR_KEYS = [
  "peep", "fio2", "vt_actual", "pip", "tidal_volume_set", "plateau_pressure",
  "peak_airway_pressure", "mean_airway_pressure", "exhaled_minute_volume", "ie_ratio",
  "set_pressure", "compliance_dynamic", "insp_time",
];
const ANESTHESIA_KEYS = ["sevoflurane", "desflurane", "isoflurane", "mac"];
const VITALS_KEYS = [
  "heart_rate", "spo2", "respiratory_rate", "temperature", "systolic_bp",
  "arterial_systolic_bp", "nbp_systolic_bp", "blood_glucose", "cvp",
];

function hasAny(source, keys) {
  return keys.some((key) => source[key] != null);
}

// The ventilator endpoint always returns the full shape, with nulls for parameters never sent.
export function hasVentilatorData(vent) {
  return Boolean(vent) && hasAny(vent, VENTILATOR_KEYS);
}

// NEWS2 aggregate score -> tone used by badges.
export function ewsTone(score) {
  if (score == null) return "none";
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}

export function alertSeverity(alert) {
  const level = String(alert?.alert_level ?? alert?.severity ?? alert?.category ?? "").toUpperCase();
  if (level === "CRITICAL") return "critical";
  if (level === "HIGH") return "high";
  if (level === "LOW" || level === "INFO") return "low";
  return "medium";
}

export const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export function sortAlerts(alerts) {
  return [...alerts].sort(
    (a, b) =>
      SEVERITY_ORDER[alertSeverity(a)] - SEVERITY_ORDER[alertSeverity(b)] ||
      new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime()
  );
}

// HL7 feeds without ADT data arrive with name "UNKNOWN" and gender "U".
export function patientName(patient) {
  const name = patient?.name ?? patient?.patient_name;
  return name && name.toUpperCase() !== "UNKNOWN" ? name : null;
}

export function genderLabel(gender) {
  const value = String(gender ?? "").toUpperCase();
  if (value.startsWith("M")) return "M";
  if (value.startsWith("F")) return "F";
  return null;
}

// Splits one WebSocket packet into typed telemetry events.
// The backend broadcasts the same row shapes as the REST endpoints; we accept
// bare rows, `{ type, data }` envelopes and arrays of either.
export function normalizeTelemetryMessage(message) {
  if (Array.isArray(message)) return message.flatMap(normalizeTelemetryMessage);
  if (!message || typeof message !== "object") return [];

  const envelopeType = String(message.type ?? message.event ?? message.kind ?? "").toLowerCase();
  const inner = message.data ?? message.payload ?? message.observation;
  if (inner && typeof inner === "object") {
    const events = normalizeTelemetryMessage(inner);
    if (envelopeType.includes("alert")) return events.map((event) => ({ ...event, kind: "alert" }));
    return events.map((event) => ({
      ...event,
      bedId: event.bedId ?? message.bed_id ?? null,
      mrn: event.mrn ?? message.mrn ?? null,
    }));
  }

  const bedId = message.bed_id ?? message.bedId ?? null;
  const mrn = message.mrn ?? message.patient?.mrn ?? null;
  if (message.alert_id || envelopeType.includes("alert")) {
    return [{ kind: "alert", bedId, mrn, data: message }];
  }

  const device = String(message.device_type ?? message.source ?? message.device ?? "").toUpperCase();
  const events = [];
  if (device.includes("VENT") || hasAny(message, VENTILATOR_KEYS)) {
    events.push({ kind: "ventilator", bedId, mrn, data: message });
  }
  if (device.includes("ANES") || hasAny(message, ANESTHESIA_KEYS)) {
    events.push({ kind: "anesthesia", bedId, mrn, data: message });
  }
  if (device.includes("MONITOR") || hasAny(message, VITALS_KEYS)) {
    events.push({ kind: "vitals", bedId, mrn, data: message });
  }
  return events;
}

// Merges observation rows, de-duplicated by timestamp and sorted oldest first.
export function mergeObservations(existing = [], incoming = [], cap = 5000) {
  if (!incoming.length) return existing;
  const byTime = new Map();
  for (const obs of existing) byTime.set(observationTime(obs) ?? obs.timestamp, obs);
  for (const obs of incoming) {
    const key = observationTime(obs) ?? obs.timestamp ?? Date.now();
    byTime.set(key, { ...byTime.get(key), ...obs });
  }
  const merged = [...byTime.values()].sort((a, b) => (observationTime(a) ?? 0) - (observationTime(b) ?? 0));
  return merged.length > cap ? merged.slice(-cap) : merged;
}

export function initials(name = "") {
  return String(name)
    .replace(/^Dr\.?\s+/i, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
