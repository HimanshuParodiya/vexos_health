import { useCallback, useEffect, useMemo, useState } from "react";
import { authService } from "@/features/auth/api";
import { onUnauthorized } from "@/services/http-client";
import { decodeJwt, isTokenExpired } from "@/services/jwt";
import { tokenStorage } from "@/services/token-storage";
import { AuthContext } from "./auth-context";

function hasUsableToken() {
  const token = tokenStorage.get();
  const payload = token ? decodeJwt(token) : null;
  return Boolean(payload) && !isTokenExpired(payload);
}

// status: "loading" while restoring a session, then "authenticated" or "anonymous".
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (hasUsableToken() ? "loading" : "anonymous"));

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const startSession = useCallback(({ accessToken, user: nextUser }) => {
    tokenStorage.set(accessToken);
    setUser(nextUser);
    setStatus("authenticated");
    return nextUser;
  }, []);

  useEffect(() => onUnauthorized(clearSession), [clearSession]);

  // Restore session on first load: validate the stored token with the backend.
  useEffect(() => {
    if (!hasUsableToken()) {
      tokenStorage.clear();
      return;
    }

    let cancelled = false;
    authService
      .me()
      .then(({ user: restored }) => {
        if (cancelled) return;
        setUser(restored);
        setStatus("authenticated");
      })
      .catch(() => !cancelled && clearSession());

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // Log out automatically when the access token expires.
  useEffect(() => {
    if (status !== "authenticated") return;
    const payload = decodeJwt(tokenStorage.get() ?? "");
    if (!payload?.exp) return;
    const msUntilExpiry = payload.exp * 1000 - Date.now();
    const timer = setTimeout(clearSession, Math.max(msUntilExpiry, 0));
    return () => clearTimeout(timer);
  }, [status, clearSession]);

  const login = useCallback(
    async (credentials) => startSession(await authService.login(credentials)),
    [startSession]
  );

  const register = useCallback(
    async (payload) => startSession(await authService.register(payload)),
    [startSession]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      status,
      isAuthenticated: status === "authenticated",
      login,
      register,
      logout,
    }),
    [user, status, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
