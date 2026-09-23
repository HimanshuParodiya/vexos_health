import { ShieldCheck, Stethoscope, HeartPulse } from "lucide-react";

// Role values must match the `role` claim the backend puts in the JWT.
export const ROLES = Object.freeze({
  DOCTOR: "doctor",
  NURSE: "nurse",
  ADMIN: "admin",
});

// Per-role metadata. Add a role here and it becomes available to routing,
// redirects and the UI without touching other files.
export const ROLE_CONFIG = {
  [ROLES.DOCTOR]: {
    label: "Doctor",
    description: "Consultations, diagnoses and prescriptions",
    icon: Stethoscope,
    dashboardPath: "/doctor",
    searchPlaceholder: "Search patients, appointments, prescriptions…",
    selfSignup: true,
  },
  [ROLES.NURSE]: {
    label: "Nurse",
    description: "Ward rounds, vitals and patient care",
    icon: HeartPulse,
    dashboardPath: "/nurse",
    searchPlaceholder: "Search patients, beds, medications…",
    selfSignup: true,
  },
  [ROLES.ADMIN]: {
    label: "Administrator",
    description: "Staff, departments and system settings",
    icon: ShieldCheck,
    dashboardPath: "/admin",
    searchPlaceholder: "Search staff, departments, audit events…",
    // Admin accounts should be provisioned by an existing admin, not self-registered.
    selfSignup: false,
  },
};

export const SIGNUP_ROLES = Object.values(ROLES).filter(
  (role) => ROLE_CONFIG[role].selfSignup
);

export function getDashboardPath(role) {
  return ROLE_CONFIG[role]?.dashboardPath ?? "/unauthorized";
}
