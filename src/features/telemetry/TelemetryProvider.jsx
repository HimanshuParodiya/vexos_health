import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { env } from "@/config/env";
import { normalizeTelemetryMessage } from "@/lib/clinical";
import { tokenStorage } from "@/services/token-storage";
import { TelemetryContext } from "./telemetry-context";

const MAX_RECONNECT_DELAY_MS = 15_000;

// One WebSocket per signed-in clinician (/api/v1/stream/vitals), shared by every screen.
// Consumers call `subscribe(listener)` to receive normalized events; connection state
// lives in context so the top bar can show it.
// status: "idle" | "connecting" | "connected" | "reconnecting"
export function TelemetryProvider({ children }) {
  const [status, setStatus] = useState("idle");
  const [lastMessageAt, setLastMessageAt] = useState(null);
  const [connectNonce, setConnectNonce] = useState(0);
  const listenersRef = useRef(new Set());
  const attemptsRef = useRef(0);

  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) return undefined;

    let disposed = false;
    let retryTimer = null;
    const socket = new WebSocket(env.getWsUrl(token));
    queueMicrotask(() => !disposed && setStatus(attemptsRef.current ? "reconnecting" : "connecting"));

    socket.onopen = () => {
      if (disposed) return;
      attemptsRef.current = 0;
      setStatus("connected");
    };

    socket.onmessage = (event) => {
      if (disposed) return;
      let parsed;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return; // keep-alive frames and other non-JSON packets
      }
      const events = normalizeTelemetryMessage(parsed);
      if (!events.length) return;
      setLastMessageAt(Date.now());
      for (const listener of listenersRef.current) listener(events);
    };

    socket.onclose = () => {
      if (disposed) return;
      setStatus("reconnecting");
      const delay = Math.min(1000 * 1.6 ** attemptsRef.current, MAX_RECONNECT_DELAY_MS);
      attemptsRef.current += 1;
      retryTimer = setTimeout(() => setConnectNonce((n) => n + 1), delay);
    };

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      socket.onclose = null;
      // Closing while still connecting logs a browser warning; close once it opens instead.
      if (socket.readyState === WebSocket.CONNECTING) socket.onopen = () => socket.close();
      else socket.close();
    };
  }, [connectNonce]);

  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const reconnect = useCallback(() => {
    attemptsRef.current = 0;
    setConnectNonce((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ status, isConnected: status === "connected", lastMessageAt, subscribe, reconnect }),
    [status, lastMessageAt, subscribe, reconnect]
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}
