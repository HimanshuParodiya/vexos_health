// Central place for environment config. Vite exposes only VITE_* variables.
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api",
  // Mock mode is on until a backend exists. Set VITE_USE_MOCK_API=false to hit the real API.
  useMockApi: (import.meta.env.VITE_USE_MOCK_API ?? "true") === "true",
  appName: "Vexos Health",
};
