import { ROLES } from "@/config/roles";
import { ApiError } from "@/services/http-client";
import { decodeJwt, isTokenExpired } from "@/services/jwt";
import { tokenStorage } from "@/services/token-storage";

// In-browser fake backend so the UI works before the API exists.
// Tokens here are UNSIGNED and for development only.

const USERS_KEY = "vexos.mock.users";
const TOKEN_TTL_SECONDS = 60 * 60;

export const DEMO_ACCOUNTS = [
  { email: "doctor@vexos.health", password: "Doctor@123", role: ROLES.DOCTOR, fullName: "Dr. Aisha Rao", department: "Cardiology" },
  { email: "nurse@vexos.health", password: "Nurse@123", role: ROLES.NURSE, fullName: "Rahul Mehta", department: "ICU" },
  { email: "admin@vexos.health", password: "Admin@123", role: ROLES.ADMIN, fullName: "Priya Sharma", department: "Administration" },
];

const delay = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));

function loadUsers() {
  try {
    const stored = JSON.parse(localStorage.getItem(USERS_KEY));
    if (Array.isArray(stored)) return stored;
  } catch {
    // fall through to seed
  }
  const seeded = DEMO_ACCOUNTS.map((account, index) => ({ id: `demo-${index + 1}`, ...account }));
  saveUsers(seeded);
  return seeded;
}

function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

function toPublicUser({ password: _password, ...user }) {
  return user;
}

function base64Url(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createMockToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url({ alg: "none", typ: "JWT" });
  const payload = base64Url({
    sub: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  });
  return `${header}.${payload}.mock-signature`;
}

export const authMock = {
  async login({ email, password }) {
    await delay();
    const user = loadUsers().find(
      (candidate) => candidate.email.toLowerCase() === email.toLowerCase()
    );
    if (!user || user.password !== password) {
      throw new ApiError("Invalid email or password", { status: 401 });
    }
    return { accessToken: createMockToken(user), user: toPublicUser(user) };
  },

  async register(payload) {
    await delay();
    const users = loadUsers();
    if (users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new ApiError("An account with this email already exists", { status: 409 });
    }
    if (payload.role === ROLES.ADMIN) {
      throw new ApiError("Administrator accounts cannot be self-registered", { status: 403 });
    }
    const user = { id: crypto.randomUUID(), ...payload };
    saveUsers([...users, user]);
    return { accessToken: createMockToken(user), user: toPublicUser(user) };
  },

  async me() {
    await delay(200);
    const payload = decodeJwt(tokenStorage.get() ?? "");
    if (!payload || isTokenExpired(payload)) {
      throw new ApiError("Session expired", { status: 401 });
    }
    const user = loadUsers().find((candidate) => candidate.id === payload.sub);
    if (!user) throw new ApiError("User not found", { status: 401 });
    return { user: toPublicUser(user) };
  },

  async logout() {
    await delay(100);
  },
};
