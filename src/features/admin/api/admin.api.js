import { httpClient } from "@/services/http-client";

// GET /admin/dashboard?days=30 -> AdminDashboard
//
// AdminDashboard {
//   kpis: {
//     totalStaff:   { current, doctors, nurses, pendingVerification },
//     bedOccupancy: { current, previous, trend: number[] },   // percent
//     erWaitMins:   { current, previous, trend: number[] },
//     revenue:      { current, previous, trend: number[] },   // INR, selected period
//   },
//   patientFlow:   [{ date, admissions, discharges }],
//   monthlyRevenue:[{ month, revenue }],                        // last 12 months
//   payerMix:      [{ payer, share }],                           // percent, sums to 100
//   staffing:      [{ department, doctors, nurses }],
//   verifications: [{ id, name, role, licenseNumber, department, submittedAt }],
//   auditLog:      [{ id, actor, action, target, at, severity }],
// }
export const adminApi = {
  getDashboard: ({ days }) => httpClient.get(`/admin/dashboard?days=${days}`),
  // POST /admin/verifications/:id  body: { decision: "approve" | "reject" }
  reviewVerification: (id, decision) =>
    httpClient.post(`/admin/verifications/${id}`, { decision }),
};
