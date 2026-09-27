import { useEffect, useRef, useState, useCallback } from "react";
import { env } from "@/config/env";
import { tokenStorage } from "@/services/token-storage";

export function useVitalsWebSocket({ onVitalUpdate, enabled = true } = {}) {
  const [status, setStatus] = useState("disconnected"); // 'connected' | 'connecting' | 'disconnected' | 'error'
  const [lastMessageAt, setLastMessageAt] = useState(null);
  const [latestPayload, setLatestPayload] = useState(null);
  const [connectNonce, setConnectNonce] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const onVitalUpdateRef = useRef(onVitalUpdate);

  useEffect(() => {
    onVitalUpdateRef.current = onVitalUpdate;
  }, [onVitalUpdate]);

  useEffect(() => {
    const token = tokenStorage.get();
    if (!token || !enabled) {
      return;
    }

    let isDisposed = false;
    const wsUrl = env.getWsUrl(token);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isDisposed) {
          setStatus("connected");
          reconnectAttemptsRef.current = 0;
        }
      };

      ws.onmessage = (event) => {
        if (!isDisposed) {
          try {
            const data = JSON.parse(event.data);
            const now = new Date();
            setLastMessageAt(now);
            setLatestPayload(data);
            onVitalUpdateRef.current?.(data);
          } catch {
            // ignore unparseable stream packets
          }
        }
      };

      ws.onerror = () => {
        if (!isDisposed) {
          setStatus("error");
        }
      };

      ws.onclose = () => {
        if (!isDisposed) {
          setStatus("disconnected");
          wsRef.current = null;

          // Auto-reconnect with exponential backoff (capped at 10s)
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 10000);
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isDisposed && enabled) {
              setConnectNonce((n) => n + 1);
            }
          }, delay);
        }
      };
    } catch {
      queueMicrotask(() => {
        if (!isDisposed) {
          setStatus("error");
        }
      });
    }

    return () => {
      isDisposed = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connectNonce]);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    reconnectAttemptsRef.current = 0;
    setConnectNonce((n) => n + 1);
  }, []);

  return {
    status,
    isConnected: status === "connected",
    isConnecting: status === "connecting",
    lastMessageAt,
    latestPayload,
    reconnect,
  };
}
