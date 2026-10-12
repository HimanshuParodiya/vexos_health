import { httpClient } from "./http-client";

const enc = encodeURIComponent;

// Thin wrappers over the VEXOS backend (see /docs on the API host).
// Response shapes are documented next to the components that consume them.
export const vexosApi = {
  // System
  getHealth: () => httpClient.get("/health", { auth: false }),
  getReady: () => httpClient.get("/ready", { auth: false }),
  getStatus: () => httpClient.get("/api/v1/status"),
  getHospitalInfo: () => httpClient.get("/api/v1/hospital"),

  // ICU beds
  getBeds: () => httpClient.get("/api/v1/beds"),
  getBedHistory: (bedId, limit = 20) =>
    httpClient.get(`/api/v1/beds/${enc(bedId)}/history?limit=${limit}`),
  assignBed: (bedId, payload) => httpClient.post(`/api/v1/beds/${enc(bedId)}/assign`, payload),
  dischargeBed: (bedId) => httpClient.post(`/api/v1/beds/${enc(bedId)}/discharge`),

  // Patient telemetry. `duration` is a look-back window in minutes.
  getPatientVitals: (mrn, duration = 1440) =>
    httpClient.get(`/api/v1/patients/${enc(mrn)}/vitals?duration=${duration}`),
  getPatientVentilator: (mrn) => httpClient.get(`/api/v1/patients/${enc(mrn)}/ventilator`),
  getPatientAnesthesia: (mrn) => httpClient.get(`/api/v1/patients/${enc(mrn)}/anesthesia`),
  getPatientEWS: (mrn) => httpClient.get(`/api/v1/patients/${enc(mrn)}/ews`),
  setPatientLimits: (mrn, limits) => httpClient.post(`/api/v1/patients/${enc(mrn)}/limits`, limits),

  // Alerts
  getActiveAlerts: () => httpClient.get("/api/v1/alerts/active"),
  acknowledgeAlert: (alertId) => httpClient.post(`/api/v1/alerts/${enc(alertId)}/acknowledge`),

  // Analytics
  getAnalyticsSummary: () => httpClient.get("/api/v1/analytics/summary"),

  // HL7 ingestion
  getHl7Stats: (recentLimit = 50) => httpClient.get(`/api/v1/hl7/stats?recent_limit=${recentLimit}`),
  sweepHl7: () => httpClient.post("/api/v1/hl7/sweep"),
  getHl7SourceConfig: () => httpClient.get("/api/v1/hl7/source-config"),
  setHl7SourceConfig: (config) => httpClient.post("/api/v1/hl7/source-config", config),

  // Identity administration (admin role only)
  listUsers: () => httpClient.get("/api/v1/identity/users"),
  createUser: (payload) => httpClient.post("/api/v1/identity/users", payload),
  deactivateUser: (username) => httpClient.patch(`/api/v1/identity/users/${enc(username)}/deactivate`),
  reactivateUser: (username) => httpClient.patch(`/api/v1/identity/users/${enc(username)}/reactivate`),
  enableMfa: (username) => httpClient.post(`/api/v1/identity/users/${enc(username)}/mfa/enable`),
  disableMfa: (username) => httpClient.post(`/api/v1/identity/users/${enc(username)}/mfa/disable`),
  listLoginAttempts: (recentLimit = 50) =>
    httpClient.get(`/api/v1/identity/login-attempts?recent_limit=${recentLimit}`),
};
