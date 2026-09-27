import { httpClient } from "./http-client";

export const vexosApi = {
  // Hospital branding and identity
  getHospitalInfo: () => httpClient.get("/api/v1/hospital"),

  // ICU Beds
  getBeds: () => httpClient.get("/api/v1/beds"),
  getBedHistory: (bedId) => httpClient.get(`/api/v1/beds/${encodeURIComponent(bedId)}/history`),

  // Clinical patient vitals
  getPatientVitals: (mrn, duration = 1440) =>
    httpClient.get(`/api/v1/patients/${encodeURIComponent(mrn)}/vitals?duration=${duration}`),

  // Ventilator and anesthesia telemetry
  getPatientVentilator: (mrn) =>
    httpClient.get(`/api/v1/patients/${encodeURIComponent(mrn)}/ventilator`),
  getPatientAnesthesia: (mrn) =>
    httpClient.get(`/api/v1/patients/${encodeURIComponent(mrn)}/anesthesia`),

  // Early warning score (NEWS / EWS)
  getPatientEWS: (mrn) =>
    httpClient.get(`/api/v1/patients/${encodeURIComponent(mrn)}/ews`),

  // Alerts
  getActiveAlerts: () => httpClient.get("/api/v1/alerts/active"),
  acknowledgeAlert: (alertId) =>
    httpClient.post(`/api/v1/alerts/${encodeURIComponent(alertId)}/acknowledge`),

  // Analytics summary
  getAnalyticsSummary: () => httpClient.get("/api/v1/analytics/summary"),
};
