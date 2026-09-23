import { httpClient } from "@/services/http-client";

// GET /doctor/dashboard?days=30 -> DoctorDashboard
//
// DoctorDashboard {
//   kpis: {
//     patientsSeen:    { current, previous, trend: number[] },
//     avgConsultMins:  { current, previous, trend: number[] },
//     pendingLabs:     { current, flagged },
//     followUpRate:    { current, previous },   // percent
//   },
//   consultations: [{ date, inPerson, telemedicine }],      // one row per day
//   diagnoses:     [{ category, count }],                    // sorted desc
//   hourlyLoad:    [{ hour, patients }],                     // today, 08-18
//   schedule:      [{ id, time, patient, age, reason, type, status }],
//   labResults:    [{ id, patient, test, value, unit, reference, status, reportedAt }],
// }
export const doctorApi = {
  getDashboard: ({ days }) => httpClient.get(`/doctor/dashboard?days=${days}`),
};
