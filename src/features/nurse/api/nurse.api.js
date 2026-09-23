import { httpClient } from "@/services/http-client";

// GET /nurse/dashboard -> NurseDashboard (current shift)
//
// NurseDashboard {
//   shift:   { name, start, end },
//   kpis: {
//     assignedPatients: { current, capacity },
//     vitalsRecorded:   { current, due },
//     medsOnTime:       { current, previous },   // percent
//     activeAlerts:     { current, critical },
//   },
//   wardOccupancy: [{ ward, occupied, capacity }],
//   medRounds:     [{ slot, onTime, late, missed }],
//   patients:      [{ id, bed, name, age, diagnosis, news2, status, lastVitalsAt }],
//   vitals:        { [patientId]: [{ time, heartRate, spo2, systolic, diastolic, temperature }] },
//   tasks:         [{ id, bed, patient, task, due, priority }],
// }
export const nurseApi = {
  getDashboard: () => httpClient.get("/nurse/dashboard"),
};
