import { createRandom, isWeekend, lastNDays, mockDelay, round, sum } from "@/lib/mock";

const STAFFING = [
  ["Emergency", 14, 32],
  ["General Medicine", 18, 26],
  ["Surgery", 16, 22],
  ["Cardiology", 12, 16],
  ["ICU", 8, 24],
  ["Pediatrics", 9, 14],
  ["Orthopedics", 10, 10],
  ["Oncology", 7, 12],
];

const PAYER_MIX = [
  ["Private insurance", 38],
  ["Government schemes", 27],
  ["Self-pay", 21],
  ["Corporate", 14],
];

const VERIFICATIONS = [
  ["Dr. Vikram Joshi", "doctor", "NMC-448120", "Neurology", 3],
  ["Sneha Pillai", "nurse", "RN-302215", "Pediatrics", 9],
  ["Dr. Neha Kapoor", "doctor", "NMC-551907", "Oncology", 20],
  ["Joseph Mathew", "nurse", "RN-118734", "ICU", 26],
];

const AUDIT = [
  ["Priya Sharma", "Changed role", "Rahul Mehta · nurse → charge nurse", 8, "warning"],
  ["System", "Blocked login", "5 failed attempts · 10.4.21.17", 34, "serious"],
  ["Dr. Aisha Rao", "Exported records", "12 patient summaries (PDF)", 61, "warning"],
  ["Priya Sharma", "Approved account", "Dr. Farah Ali · Radiology", 140, "good"],
  ["System", "Nightly backup", "Completed in 4m 12s", 420, "good"],
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const adminMock = {
  async getDashboard({ days }) {
    await mockDelay();
    const random = createRandom(3000 + days);

    const flow = lastNDays(days * 2).map((date) => {
      const weekend = isWeekend(date);
      const admissions = weekend ? random.int(28, 40) : random.int(44, 62);
      return { date, admissions, discharges: Math.max(0, admissions + random.int(-9, 7)) };
    });
    const previousFlow = flow.slice(0, days);
    const patientFlow = flow.slice(days);

    const dailyRevenue = 2_450_000;
    const revenue = round(sum(patientFlow.map((d) => d.admissions)) / 52 * dailyRevenue * random.between(0.95, 1.05));
    const previousRevenue = round(sum(previousFlow.map((d) => d.admissions)) / 52 * dailyRevenue * random.between(0.95, 1.05));

    const now = new Date();
    const monthlyRevenue = Array.from({ length: 12 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      return {
        month: `${MONTHS[month.getMonth()]} ${String(month.getFullYear()).slice(2)}`,
        revenue: Math.round(random.between(6.2, 8.4) * 10_000_000),
      };
    });

    const occupancyTrend = Array.from({ length: 12 }, () => round(random.between(76, 89), 1));
    const erTrend = Array.from({ length: 12 }, () => Math.round(random.between(22, 41)));

    const doctors = sum(STAFFING.map(([, d]) => d));
    const nurses = sum(STAFFING.map(([, , n]) => n));

    return {
      kpis: {
        totalStaff: { current: doctors + nurses, doctors, nurses, pendingVerification: VERIFICATIONS.length },
        bedOccupancy: { current: occupancyTrend.at(-1), previous: occupancyTrend.at(-2), trend: occupancyTrend },
        erWaitMins: { current: erTrend.at(-1), previous: erTrend.at(-2), trend: erTrend },
        revenue: {
          current: revenue,
          previous: previousRevenue,
          trend: monthlyRevenue.map((m) => m.revenue),
        },
      },
      patientFlow,
      monthlyRevenue,
      payerMix: PAYER_MIX.map(([payer, share]) => ({ payer, share })),
      staffing: STAFFING.map(([department, d, n]) => ({ department, doctors: d, nurses: n })),
      verifications: VERIFICATIONS.map(([name, role, licenseNumber, department, hoursAgo], index) => ({
        id: `ver-${index}`,
        name,
        role,
        licenseNumber,
        department,
        submittedAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
      })),
      auditLog: AUDIT.map(([actor, action, target, minutesAgo, severity], index) => ({
        id: `audit-${index}`,
        actor,
        action,
        target,
        severity,
        at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
      })),
    };
  },

  async reviewVerification() {
    await mockDelay(300);
    return { ok: true };
  },
};
