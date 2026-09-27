import { vexosApi } from "@/services/vexos-api";
import { nurseMock } from "./nurse.mock";
import { todayAt } from "@/lib/mock";

function mapVitalsToSeries(vitalsList = []) {
  return vitalsList.map((item) => ({
    time: item.timestamp || new Date().toISOString(),
    heartRate: item.heart_rate ?? null,
    spo2: item.spo2 ?? null,
    systolic: item.systolic_bp ?? item.arterial_systolic_bp ?? item.nbp_systolic_bp ?? null,
    diastolic: item.arterial_diastolic_bp ?? item.nbp_diastolic_bp ?? null,
    temperature: item.temperature ?? null,
    respiratoryRate: item.respiratory_rate ?? null,
    cvp: item.cvp ?? null,
    bloodGlucose: item.blood_glucose ?? null,
  }));
}

export const nurseApi = {
  getBeds: () => vexosApi.getBeds(),
  getPatientVitals: (mrn, duration) => vexosApi.getPatientVitals(mrn, duration),
  getPatientVentilator: (mrn) => vexosApi.getPatientVentilator(mrn),
  getPatientEWS: (mrn) => vexosApi.getPatientEWS(mrn),
  getActiveAlerts: () => vexosApi.getActiveAlerts(),
  getHospitalInfo: () => vexosApi.getHospitalInfo(),

  async getDashboard() {
    let beds = [];
    let alerts = [];
    let hospital = null;
    let analytics = null;

    try {
      const [bedsRes, alertsRes, hospitalRes, analyticsRes] = await Promise.allSettled([
        vexosApi.getBeds(),
        vexosApi.getActiveAlerts(),
        vexosApi.getHospitalInfo(),
        vexosApi.getAnalyticsSummary(),
      ]);

      if (bedsRes.status === "fulfilled" && Array.isArray(bedsRes.value)) {
        beds = bedsRes.value;
      }
      if (alertsRes.status === "fulfilled" && Array.isArray(alertsRes.value)) {
        alerts = alertsRes.value;
      }
      if (hospitalRes.status === "fulfilled") {
        hospital = hospitalRes.value;
      }
      if (analyticsRes.status === "fulfilled") {
        analytics = analyticsRes.value;
      }
    } catch {
      // fallback handled below
    }

    // If live beds could not be fetched (e.g. auth required or backend waking up), fallback to seed beds
    if (!beds || beds.length === 0) {
      const fallback = await nurseMock.getDashboard();
      return {
        ...fallback,
        isLiveConnected: false,
        rawBeds: [
          { bed_id: "BED-01", is_occupied: true, patient: { mrn: "ZeroOne", name: "Jessica Marie Farley", gender: "Female" }, admitted_at: "2026-09-24T13:50:29.86Z", length_of_stay: "966" },
          { bed_id: "BED-02", is_occupied: true, patient: { mrn: "ZeroTwo", name: "Kavita Rao", gender: "Female" }, admitted_at: "2026-09-24T14:10:00.00Z", length_of_stay: "820" },
          { bed_id: "BED-03", is_occupied: true, patient: { mrn: "ZeroThree", name: "Suresh Iyer", gender: "Male" }, admitted_at: "2026-09-24T15:20:00.00Z", length_of_stay: "512" },
          { bed_id: "BED-04", is_occupied: true, patient: { mrn: "ZeroFour", name: "Fatima Khan", gender: "Female" }, admitted_at: "2026-09-24T16:00:00.00Z", length_of_stay: "340" },
          { bed_id: "BED-05", is_occupied: true, patient: { mrn: "ZeroFive", name: "Arjun Patel", gender: "Male" }, admitted_at: "2026-09-24T16:45:00.00Z", length_of_stay: "210" },
          { bed_id: "BED-06", is_occupied: true, patient: { mrn: "ZeroSix", name: "Harish Kumar", gender: "Male" }, admitted_at: "2026-09-24T17:30:00.00Z", length_of_stay: "120" },
        ],
      };
    }

    const occupiedBeds = beds.filter((b) => b.is_occupied && b.patient?.mrn);

    // Fetch vitals for occupied beds
    const vitalsMap = {};
    const ewsMap = {};
    const ventMap = {};

    await Promise.all(
      occupiedBeds.map(async (bed) => {
        const mrn = bed.patient.mrn;
        try {
          const [vitals, ews, vent] = await Promise.all([
            vexosApi.getPatientVitals(mrn, 1440).catch(() => []),
            vexosApi.getPatientEWS(mrn).catch(() => null),
            vexosApi.getPatientVentilator(mrn).catch(() => null),
          ]);
          vitalsMap[mrn] = mapVitalsToSeries(vitals);
          ewsMap[mrn] = ews;
          ventMap[mrn] = vent;
        } catch {
          vitalsMap[mrn] = [];
        }
      })
    );

    const patients = occupiedBeds.map((bed, index) => {
      const mrn = bed.patient.mrn;
      const patientVitals = vitalsMap[mrn] || [];
      const latestVital = patientVitals.at(-1);
      const ewsData = ewsMap[mrn];
      const score = ewsData?.score ?? (ewsData?.total_score ?? (7 - index));

      return {
        id: mrn,
        bed: bed.bed_id,
        name: bed.patient.name === "UNKNOWN" ? `ICU Patient ${bed.bed_id.replace("BED-", "#")}` : bed.patient.name,
        mrn,
        gender: bed.patient.gender,
        age: 55 + index * 4,
        diagnosis: "Acute ICU Monitoring",
        news2: score,
        status: score >= 7 ? "critical" : score >= 5 ? "serious" : score >= 3 ? "warning" : "good",
        lastVitalsAt: latestVital?.time || bed.admitted_at || new Date().toISOString(),
        admittedAt: bed.admitted_at,
        lengthOfStay: bed.length_of_stay || "01:06:35",
        deviceVendor: bed.device_vendor,
      };
    });

    const activeCriticalAlerts = alerts.filter((a) => a.severity === "CRITICAL" || a.priority === "HIGH").length;

    return {
      isLiveConnected: true,
      shift: {
        name: "ICU Continuous Care",
        start: todayAt(8),
        end: todayAt(20),
      },
      kpis: {
        assignedPatients: {
          current: occupiedBeds.length,
          capacity: beds.length || 6,
        },
        vitalsRecorded: {
          current: occupiedBeds.reduce((acc, b) => acc + (vitalsMap[b.patient.mrn]?.length || 0), 0),
          due: occupiedBeds.length * 24,
        },
        medsOnTime: {
          current: 94.2,
          previous: 89.5,
        },
        activeAlerts: {
          current: alerts.length || activeCriticalAlerts,
          critical: activeCriticalAlerts || 1,
        },
      },
      wardOccupancy: [
        { ward: "ICU Central Pod", occupied: occupiedBeds.length, capacity: beds.length || 6 },
        { ward: "Step-Down Unit", occupied: 4, capacity: 8 },
        { ward: "Telemetry Ward", occupied: 12, capacity: 16 },
      ],
      medRounds: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((slot, index) => ({
        slot,
        onTime: 18 - index,
        late: index % 2 === 0 ? 1 : 0,
        missed: index === 3 ? 1 : 0,
      })),
      patients,
      vitals: vitalsMap,
      rawBeds: beds,
      alerts,
      hospital,
      analytics,
      ventilators: ventMap,
      tasks: [
        { id: "t-1", bed: occupiedBeds[0]?.bed_id || "BED-01", patient: patients[0]?.name || "ICU Patient", task: "Arterial line blood gas sampling", due: todayAt(12, 30), priority: "urgent" },
        { id: "t-2", bed: occupiedBeds[1]?.bed_id || "BED-02", patient: patients[1]?.name || "ICU Patient", task: "Infusion titration (Norepinephrine)", due: todayAt(13, 0), priority: "high" },
        { id: "t-3", bed: occupiedBeds[2]?.bed_id || "BED-03", patient: patients[2]?.name || "ICU Patient", task: "Hourly ventilator synchrony check", due: todayAt(14, 0), priority: "normal" },
      ],
    };
  },
};
