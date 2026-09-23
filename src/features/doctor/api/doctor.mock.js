import { createRandom, isWeekend, lastNDays, mockDelay, round, sum, todayAt } from "@/lib/mock";

const DIAGNOSES = [
  ["Hypertension", 0.22],
  ["Coronary artery disease", 0.16],
  ["Arrhythmia", 0.13],
  ["Heart failure", 0.11],
  ["Type 2 diabetes", 0.1],
  ["Chest pain, unspecified", 0.09],
  ["Hyperlipidemia", 0.08],
  ["Valve disorders", 0.06],
];

const SCHEDULE = [
  [9, 0, "Anita Verma", 58, "Follow-up · hypertension", "In person", "completed"],
  [9, 30, "Karan Singh", 46, "Chest pain evaluation", "In person", "completed"],
  [10, 15, "Meera Nair", 63, "Post-CABG review", "In person", "in-progress"],
  [11, 0, "Rohit Das", 39, "ECG results discussion", "Video", "waiting"],
  [11, 30, "Lakshmi Menon", 71, "Heart failure titration", "In person", "scheduled"],
  [12, 15, "Imran Qureshi", 52, "Palpitations", "Video", "scheduled"],
  [14, 0, "Deepa Bose", 67, "Pacemaker check", "In person", "scheduled"],
];

const LAB_RESULTS = [
  ["Lakshmi Menon", "NT-proBNP", 2840, "pg/mL", "< 450", "critical", 42],
  ["Karan Singh", "Troponin I", 0.09, "ng/mL", "< 0.04", "serious", 95],
  ["Anita Verma", "Potassium", 5.4, "mmol/L", "3.5 – 5.0", "warning", 130],
  ["Imran Qureshi", "TSH", 0.21, "mIU/L", "0.4 – 4.0", "serious", 185],
  ["Meera Nair", "HbA1c", 6.1, "%", "< 5.7", "warning", 240],
  ["Rohit Das", "LDL cholesterol", 96, "mg/dL", "< 100", "good", 300],
];

function consultationSeries(days, random) {
  return lastNDays(days).map((date) => {
    const weekend = isWeekend(date);
    return {
      date,
      inPerson: weekend ? random.int(2, 6) : random.int(11, 19),
      telemedicine: weekend ? random.int(1, 4) : random.int(3, 8),
    };
  });
}

export const doctorMock = {
  async getDashboard({ days }) {
    await mockDelay();
    const random = createRandom(1000 + days);

    // Current + previous window so KPIs can show a real period-over-period delta.
    const full = consultationSeries(days * 2, random);
    const previous = full.slice(0, days);
    const consultations = full.slice(days);

    const totals = consultations.map((day) => day.inPerson + day.telemedicine);
    const patientsSeen = sum(totals);
    const previousSeen = sum(previous.map((day) => day.inPerson + day.telemedicine));

    const weeklyTrend = [];
    for (let index = 0; index < totals.length; index += Math.max(1, Math.floor(days / 12))) {
      weeklyTrend.push(sum(totals.slice(index, index + Math.max(1, Math.floor(days / 12)))));
    }

    const diagnosisTotal = Math.round(patientsSeen * 0.82);
    const diagnoses = DIAGNOSES.map(([category, share]) => ({
      category,
      count: Math.round(diagnosisTotal * share * random.between(0.85, 1.15)),
    })).sort((a, b) => b.count - a.count);

    const hourlyLoad = Array.from({ length: 11 }, (_, index) => {
      const hour = 8 + index;
      const peak = hour >= 10 && hour <= 12 ? 1.6 : hour === 13 ? 0.5 : 1;
      return { hour: `${String(hour).padStart(2, "0")}:00`, patients: Math.round(random.int(1, 3) * peak) };
    });

    const avgMins = Array.from({ length: 12 }, () => round(random.between(13, 19), 1));

    return {
      kpis: {
        patientsSeen: { current: patientsSeen, previous: previousSeen, trend: weeklyTrend.slice(-12) },
        avgConsultMins: { current: avgMins.at(-1), previous: avgMins.at(-2), trend: avgMins },
        pendingLabs: {
          current: LAB_RESULTS.length + 3,
          flagged: LAB_RESULTS.filter(([, , , , , status]) => status === "critical" || status === "serious").length,
        },
        followUpRate: { current: round(random.between(84, 92), 1), previous: round(random.between(80, 90), 1) },
      },
      consultations,
      diagnoses,
      hourlyLoad,
      schedule: SCHEDULE.map(([hours, minutes, patient, age, reason, type, status], index) => ({
        id: `appt-${index}`,
        time: todayAt(hours, minutes),
        patient,
        age,
        reason,
        type,
        status,
      })),
      labResults: LAB_RESULTS.map(([patient, test, value, unit, reference, status, minutesAgo], index) => ({
        id: `lab-${index}`,
        patient,
        test,
        value,
        unit,
        reference,
        status,
        reportedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
      })),
    };
  },
};
