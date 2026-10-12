import { assessValue, observationTime, pickNumber, roundTo, vitalsFromObservation } from "@/lib/clinical";
import { slotKey } from "./flowsheet-store";

export const COLUMN_COUNT = 12;

export const INTERVALS = [
  { value: 60, label: "1 hour" },
  { value: 30, label: "30 min" },
  { value: 15, label: "15 min" },
];

export const RHYTHMS = ["SR", "ST", "SB", "AF", "AFL", "SVT", "Paced", "VT"];
export const VENT_MODES = ["PC-AC", "VC-AC", "SIMV-PC", "SIMV-VC", "PRVC", "PSV", "CPAP"];

// Row definitions. `value(ctx)` reads the monitor value for a column, where
// ctx = { vitals (canonical, see vitalsFromObservation), vent (raw row), anesthesia (raw row) }.
// `entry` makes the row editable by the nurse: "number" overrides/fills a monitor value,
// "select" and "text" are manual-only rows.
export const FLOWSHEET_SECTIONS = [
  {
    id: "haemodynamics",
    label: "Haemodynamics",
    rows: [
      { id: "heartRate", label: "Heart rate", unit: "bpm", limit: "heartRate", entry: "number", value: (c) => c.vitals?.heartRate },
      { id: "rhythm", label: "Rhythm", entry: "select", options: RHYTHMS },
      { id: "abpSys", label: "ABP systolic", unit: "mmHg", limit: "systolic", entry: "number", value: (c) => c.vitals?.arterialSys },
      { id: "abpDia", label: "ABP diastolic", unit: "mmHg", limit: "diastolic", entry: "number", value: (c) => c.vitals?.arterialDia },
      { id: "map", label: "MAP", unit: "mmHg", limit: "map", entry: "number", value: (c) => c.vitals?.arterialMap ?? c.vitals?.nbpMap },
      { id: "nbpSys", label: "NBP systolic", unit: "mmHg", limit: "systolic", entry: "number", value: (c) => c.vitals?.nbpSys },
      { id: "nbpDia", label: "NBP diastolic", unit: "mmHg", limit: "diastolic", entry: "number", value: (c) => c.vitals?.nbpDia },
      { id: "cvp", label: "CVP", unit: "mmHg", limit: "cvp", entry: "number", value: (c) => c.vitals?.cvp },
    ],
  },
  {
    id: "respiratory",
    label: "Respiratory & neuro",
    rows: [
      { id: "respRate", label: "Resp. rate", unit: "/min", limit: "respiratoryRate", entry: "number", value: (c) => c.vitals?.respiratoryRate },
      { id: "spo2", label: "SpO₂", unit: "%", limit: "spo2", entry: "number", value: (c) => c.vitals?.spo2 },
      {
        id: "etco2",
        label: "EtCO₂",
        unit: "mmHg",
        limit: "etco2",
        entry: "number",
        value: (c) => c.vitals?.etco2 ?? pickNumber(c.vent, "etco2") ?? pickNumber(c.anesthesia, "etco2"),
      },
      { id: "temperature", label: "Temperature", unit: "°C", digits: 1, limit: "temperature", entry: "number", value: (c) => c.vitals?.temperature },
      { id: "glucose", label: "Blood glucose", unit: "mg/dL", limit: "bloodGlucose", entry: "number", value: (c) => c.vitals?.bloodGlucose },
      { id: "gcs", label: "GCS", unit: "/15", entry: "text", placeholder: "E4V5M6" },
    ],
  },
  {
    id: "ventilator",
    label: "Ventilator",
    rows: [
      { id: "ventMode", label: "Mode", entry: "select", options: VENT_MODES },
      { id: "fio2", label: "FiO₂", unit: "%", entry: "number", value: (c) => pickNumber(c.vent, "fio2") },
      { id: "peep", label: "PEEP", unit: "cmH₂O", entry: "number", value: (c) => pickNumber(c.vent, "peep") },
      { id: "tidalVolume", label: "Tidal volume", unit: "mL", entry: "number", value: (c) => pickNumber(c.vent, "vt_actual", "tidal_volume") },
      { id: "ventRate", label: "Vent. rate", unit: "/min", entry: "number", value: (c) => pickNumber(c.vent, "airway_respiratory_rate", "respiration_rate") },
      { id: "peakPressure", label: "Peak pressure", unit: "cmH₂O", limit: "peakPressure", entry: "number", value: (c) => pickNumber(c.vent, "peak_airway_pressure", "pip") },
      { id: "plateau", label: "Plateau pressure", unit: "cmH₂O", limit: "plateauPressure", entry: "number", value: (c) => pickNumber(c.vent, "plateau_pressure") },
      { id: "meanAirway", label: "Mean airway pr.", unit: "cmH₂O", entry: "number", value: (c) => pickNumber(c.vent, "mean_airway_pressure") },
      { id: "minuteVolume", label: "Minute volume", unit: "L/min", digits: 1, entry: "number", value: (c) => pickNumber(c.vent, "exhaled_minute_volume") },
      { id: "ieRatio", label: "I:E ratio", unit: "1:x", digits: 1, entry: "number", value: (c) => pickNumber(c.vent, "ie_ratio") },
      { id: "pfRatio", label: "P/F ratio", entry: "number", value: (c) => pickNumber(c.vent, "pao2_fio2_ratio") ?? pickNumber(c.anesthesia, "pao2_fio2_ratio") },
    ],
  },
  {
    id: "anaesthesia",
    label: "Anaesthesia",
    optional: true, // shown only when the patient has anaesthesia-machine data
    rows: [
      { id: "sevoflurane", label: "Sevoflurane", unit: "%", digits: 1, entry: "number", value: (c) => pickNumber(c.anesthesia, "sevoflurane") },
      { id: "desflurane", label: "Desflurane", unit: "%", digits: 1, entry: "number", value: (c) => pickNumber(c.anesthesia, "desflurane") },
      { id: "mac", label: "MAC", digits: 1, entry: "number", value: (c) => pickNumber(c.anesthesia, "mac") },
    ],
  },
];

// Column start aligned to the local clock (so 1-hour columns start at :00 in any time zone).
function alignedStart(ms, intervalMinutes) {
  const date = new Date(ms);
  date.setSeconds(0, 0);
  date.setMinutes(Math.floor(date.getMinutes() / intervalMinutes) * intervalMinutes);
  return date.getTime();
}

export function buildSlots(windowEndMs, intervalMinutes, now, count = COLUMN_COUNT) {
  const intervalMs = intervalMinutes * 60_000;
  const lastStart = alignedStart(windowEndMs, intervalMinutes);
  return Array.from({ length: count }, (_, index) => {
    const start = lastStart - (count - 1 - index) * intervalMs;
    const end = start + intervalMs;
    return {
      start,
      end,
      key: slotKey(intervalMinutes, start),
      isCurrent: now >= start && now < end,
      isFuture: start > now,
    };
  });
}

// Latest row of each device inside every column.
function bucketLatest(rows, slots) {
  const buckets = slots.map(() => null);
  const first = slots[0].start;
  const span = slots[0].end - slots[0].start;
  for (const row of rows) {
    const time = observationTime(row);
    if (time == null || time < first || time >= slots.at(-1).end) continue;
    const index = Math.floor((time - first) / span);
    if (!buckets[index] || observationTime(buckets[index]) <= time) buckets[index] = row;
  }
  return buckets;
}

function formatValue(value, digits = 0) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return roundTo(value, digits);
  const number = Number(value);
  return Number.isNaN(number) || /[a-z]/i.test(String(value)) ? value : roundTo(number, digits);
}

// Builds the visible matrix: sections -> rows -> cells, plus per-column metadata.
export function buildMatrix({ slots, patient, record, sections }) {
  const vitalsBuckets = bucketLatest(patient.vitals, slots);
  const ventBuckets = bucketLatest(patient.ventilator, slots);
  const anesthesiaBuckets = bucketLatest(patient.anesthesia, slots);
  const contexts = slots.map((_, index) => ({
    vitals: vitalsFromObservation(vitalsBuckets[index]),
    vent: ventBuckets[index],
    anesthesia: anesthesiaBuckets[index],
  }));

  const columns = slots.map((slot, index) => {
    const entries = record.entries[slot.key] ?? {};
    const hasMonitorData = Boolean(vitalsBuckets[index] || ventBuckets[index] || anesthesiaBuckets[index]);
    return {
      ...slot,
      hasData: hasMonitorData || Object.keys(entries).length > 0,
      validation: record.validations[slot.key] ?? null,
    };
  });

  const visibleSections = sections.filter(
    (section) => !section.optional || patient.anesthesia.length > 0
  );

  const matrix = visibleSections.map((section) => ({
    ...section,
    rows: section.rows.map((row) => ({
      ...row,
      cells: slots.map((slot, index) => {
        const entry = record.entries[slot.key]?.[row.id] ?? null;
        const monitor = row.value ? formatValue(row.value(contexts[index]), row.digits) : null;
        const value = entry ? formatValue(entry.value, row.digits) : monitor;
        return {
          slotKey: slot.key,
          value,
          monitor,
          entry,
          source: entry ? "manual" : monitor != null ? "monitor" : null,
          status: typeof value === "number" ? assessValue(row.limit, value) : null,
        };
      }),
    })),
  }));

  return { columns, sections: matrix };
}

export function formatRatio(row, value) {
  return row.id === "ieRatio" && typeof value === "number" ? `1:${value}` : value;
}

// Completed hours that have monitor data but no nurse validation, across the unit
// (drives the "Unvalidated hours" figure on the board).
export function countUnvalidatedHours(beds, patients, records, now) {
  const currentHour = alignedStart(now, 60);
  let count = 0;
  for (const bed of beds) {
    const patient = bed.mrn && patients[bed.mrn];
    if (!patient) continue;
    const validations = records[bed.mrn]?.validations ?? {};
    const hours = new Set();
    for (const row of [...patient.vitals, ...patient.ventilator, ...patient.anesthesia]) {
      const time = observationTime(row);
      if (time == null) continue;
      const hour = alignedStart(time, 60);
      if (hour < currentHour) hours.add(hour);
    }
    for (const hour of hours) if (!validations[slotKey(60, hour)]) count += 1;
  }
  return count;
}
