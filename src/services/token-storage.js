// Single place that knows where the access token lives. Swap the implementation
// here (e.g. in-memory only + httpOnly refresh cookie) without touching callers.
const ACCESS_TOKEN_KEY = "vexos.accessToken";

export const tokenStorage = {
  get() {
    try {
      return sessionStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch {
      // Storage unavailable (private mode); session will not survive reload.
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};
