import { httpClient } from "@/services/http-client";
import { AUTH_ENDPOINTS } from "./auth.endpoints";

// Real backend implementation. Every function returns the shape documented
// in auth.endpoints.js so it is interchangeable with auth.mock.js.
export const authApi = {
  login: (credentials) =>
    httpClient.post(AUTH_ENDPOINTS.LOGIN, credentials, { auth: false }),
  register: (payload) =>
    httpClient.post(AUTH_ENDPOINTS.REGISTER, payload, { auth: false }),
  me: () => httpClient.get(AUTH_ENDPOINTS.ME),
  logout: () => httpClient.post(AUTH_ENDPOINTS.LOGOUT),
};
