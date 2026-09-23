import { createRandom, mockDelay, round, todayAt } from "@/lib/mock";

// [bed, name, age, diagnosis, NEWS2 score, baseline { hr, spo2, sys, dia, temp }]
const PATIENTS = [
  ["B-04", "Suresh Iyer", 68, "Pneumonia", 7, { hr: 112, spo2: 91, sys: 104, dia: 64, temp: 38.6 }],
  ["B-02", "Kavita Rao", 74, "CHF exacerbation", 5, { hr: 98, spo2: 93, sys: 142, dia: 88, temp: 37.2 }],
  ["B-07", "Fatima Khan", 45, "Post-op cholecystectomy", 3, { hr: 90, spo2: 96, sys: 128, dia: 80, temp: 37.8 }],
  ["B-11", "Arjun Patel", 59, "Diabetic foot ulcer", 2, { hr: 82, spo2: 97, sys: 136, dia: 84, temp: 37.1 }],
  ["B-05", "Neha Gupta", 33, "Asthma", 1, { hr: 78, spo2: 98, sys: 118, dia: 76, temp: 36.8 }],
  ["B-09", "Harish Kumar", 81, "Hip fracture", 1, { hr: 74, spo2: 97, sys: 132, dia: 78, temp: 36.9 }],
];

const WARDS = [
  ["Ward B · General medicine", 26, 28],
  ["ICU", 11, 12],
  ["Ward C · Surgery", 19, 24],
  ["Pediatrics", 12, 20],
];

const TASKS = [
  ["B-04", "Suresh Iyer", "Repeat vitals · NEWS2 7", 13, 45, "urgent"],
  ["B-02", "Kavita Rao", "IV furosemide 40 mg", 14, 0, "high"],
  ["B-07", "Fatima Khan", "IV antibiotics · ceftriaxone", 14, 0, "normal"],
  ["B-11", "Arjun Patel", "Wound dressing", 14, 30, "normal"],
  ["B-05", "Neha Gupta", "Nebulisation", 15, 0, "normal"],
];

// NEWS2 aggregate score -> clinical response band.
function news2Status(score) {
  if (score >= 7) return "critical";
  if (score >= 5) return "serious";
  if (score >= 3) return "warning";
  return "good";
}

function vitalsSeries(baseline, random) {
  // Every 2 hours over the last 24 hours.
  return Array.from({ length: 13 }, (_, index) => {
    const time = new Date(Date.now() - (12 - index) * 2 * 3_600_000).toISOString();
    return {
      time,
      heartRate: Math.round(baseline.hr + random.between(-8, 8)),
      spo2: Math.min(100, Math.round(baseline.spo2 + random.between(-2, 2))),
      systolic: Math.round(baseline.sys + random.between(-10, 10)),
      diastolic: Math.round(baseline.dia + random.between(-6, 6)),
      temperature: round(baseline.temp + random.between(-0.4, 0.4), 1),
    };
  });
}

export const nurseMock = {
  async getDashboard() {
    await mockDelay();
    const random = createRandom(2024);

    const patients = PATIENTS.map(([bed, name, age, diagnosis, news2], index) => ({
      id: `pt-${index}`,
      bed,
      name,
      age,
      diagnosis,
      news2,
      status: news2Status(news2),
      lastVitalsAt: new Date(Date.now() - random.int(15, 230) * 60_000).toISOString(),
    }));

    const vitals = Object.fromEntries(
      PATIENTS.map(([, , , , , baseline], index) => [`pt-${index}`, vitalsSeries(baseline, random)])
    );

    const medRounds = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"].map((slot, index) => {
      const given = index < 5 ? random.int(14, 22) : 0;
      const late = index < 5 ? random.int(0, 3) : 0;
      const missed = index < 5 && random.next() > 0.7 ? 1 : 0;
      return { slot, onTime: given, late, missed };
    });

    return {
      shift: { name: "Day shift", start: todayAt(7), end: todayAt(19) },
      kpis: {
        assignedPatients: { current: patients.length, capacity: 8 },
        vitalsRecorded: { current: 38, due: 46 },
        medsOnTime: { current: 91.4, previous: 88.2 },
        activeAlerts: { current: 3, critical: patients.filter((p) => p.status === "critical").length },
      },
      wardOccupancy: WARDS.map(([ward, occupied, capacity]) => ({ ward, occupied, capacity })),
      medRounds,
      patients: patients.sort((a, b) => b.news2 - a.news2),
      vitals,
      tasks: TASKS.map(([bed, patient, task, hours, minutes, priority], index) => ({
        id: `task-${index}`,
        bed,
        patient,
        task,
        due: todayAt(hours, minutes),
        priority,
      })),
    };
  },
};
