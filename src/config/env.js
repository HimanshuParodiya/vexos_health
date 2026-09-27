// Central place for environment config. Vite exposes only VITE_* variables.
const configuredBase = import.meta.env.VITE_API_BASE_URL;

export const env = {
  // If VITE_API_BASE_URL is not explicitly set or empty, use relative path ""
  // so dev requests route through Vite's reverse proxy (avoiding TLS self-signed cert blocks).
  apiBaseUrl: configuredBase !== undefined ? configuredBase.replace(/\/+$/, "") : "",
  useMockApi: (import.meta.env.VITE_USE_MOCK_API ?? "false") === "true",
  appName: "Vexos Health",
  devUsername: import.meta.env.VITE_DEV_USERNAME || "frontend_dev",

  getWsUrl(token) {
    if (this.apiBaseUrl && /^https?:\/\//i.test(this.apiBaseUrl)) {
      const wsProto = this.apiBaseUrl.startsWith("https") ? "wss:" : "ws:";
      const host = this.apiBaseUrl.replace(/^https?:\/\//i, "");
      return `${wsProto}//${host}/api/v1/stream/vitals?token=${encodeURIComponent(token)}`;
    }
    // In browser with proxy or same-origin
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/api/v1/stream/vitals?token=${encodeURIComponent(token)}`;
  },
};
