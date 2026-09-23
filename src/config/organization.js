// Fallback branding for the customer organization (hospital / clinic).
// The backend can override it per user via `user.organization` { name, logoUrl }.
export const DEFAULT_ORGANIZATION = {
  name: import.meta.env.VITE_ORG_NAME ?? "City Care Hospital",
  logoUrl: import.meta.env.VITE_ORG_LOGO_URL || null,
};
