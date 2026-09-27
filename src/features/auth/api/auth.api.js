import { httpClient } from "@/services/http-client";
import { decodeJwt } from "@/services/jwt";
import { tokenStorage } from "@/services/token-storage";
import { ROLES } from "@/config/roles";
import { AUTH_ENDPOINTS } from "./auth.endpoints";

function mapRole(rawRole) {
  if (!rawRole) return ROLES.NURSE;
  const normalized = String(rawRole).toLowerCase();
  if (normalized === "physician" || normalized === "doctor") return ROLES.DOCTOR;
  if (normalized === "admin" || normalized === "administrator") return ROLES.ADMIN;
  return ROLES.NURSE;
}

function userFromToken(token) {
  const payload = decodeJwt(token);
  if (!payload) return null;
  const role = mapRole(payload.role);
  const username = payload.sub || payload.username || "Nurse";
  return {
    id: payload.sub || "user",
    username,
    fullName: payload.name || payload.full_name || (username === "frontend_dev" ? "Nurse Chaitanya JSK" : username),
    email: payload.email || `${username}@vexos.health`,
    role,
    department: role === ROLES.NURSE ? "ICU" : role === ROLES.DOCTOR ? "Critical Care" : "Administration",
    organization: {
      name: "Saint Joseph Medical Center",
      logoUrl: "",
    },
  };
}

export const authApi = {
  async login(credentials) {
    // Standard OAuth2 password flow: application/x-www-form-urlencoded
    const username = (credentials.username || credentials.email || "").trim();
    const body = new URLSearchParams({
      username,
      password: credentials.password,
    });

    const res = await httpClient.post(AUTH_ENDPOINTS.LOGIN, body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      auth: false,
    });

    const accessToken = res.access_token || res.accessToken;
    const user = userFromToken(accessToken) || {
      id: username,
      username,
      fullName: username === "frontend_dev" ? "Nurse Chaitanya JSK" : username,
      email: `${username}@hospital.org`,
      role: ROLES.NURSE,
      department: "ICU",
      organization: { name: "Saint Joseph Medical Center" },
    };

    return { accessToken, user };
  },

  async register() {
    throw new Error("Registration is managed by hospital administration.");
  },

  async me() {
    const token = tokenStorage.get();
    if (!token) throw new Error("No active session");
    const user = userFromToken(token);
    if (!user) throw new Error("Invalid session token");

    try {
      const hospital = await httpClient.get(AUTH_ENDPOINTS.HOSPITAL, { auth: true });
      if (hospital?.name) {
        user.organization = { name: hospital.name, logoUrl: hospital.logo_url || "" };
      }
    } catch {
      // Continue even if hospital info endpoint is unavailable
    }

    return { user };
  },

  async logout() {
    try {
      await httpClient.post(AUTH_ENDPOINTS.LOGOUT);
    } catch {
      // Ignore network errors on logout
    }
  },
};
