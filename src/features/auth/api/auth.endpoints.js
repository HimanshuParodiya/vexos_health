// Backend contract. Keep these in sync with the API.
//
// POST /auth/login     body: { email, password }             -> { accessToken, user }
// POST /auth/register  body: { fullName, email, password,
//                               role, licenseNumber,
//                               department, phone }            -> { accessToken, user }
// GET  /auth/me        header: Authorization: Bearer <token>  -> { user }
// POST /auth/logout                                           -> 204
//
// user: { id, fullName, email, role: "doctor" | "nurse" | "admin", department,
//         organization?: { name, logoUrl } }  // customer branding in the top bar
export const AUTH_ENDPOINTS = Object.freeze({
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  ME: "/auth/me",
  LOGOUT: "/auth/logout",
});
