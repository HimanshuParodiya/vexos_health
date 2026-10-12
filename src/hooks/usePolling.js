import { useEffect } from "react";

// Calls `callback` every `intervalMs` while mounted (e.g. a `reload` from useAsyncData).
export function usePolling(callback, intervalMs) {
  useEffect(() => {
    const timer = setInterval(callback, intervalMs);
    return () => clearInterval(timer);
  }, [callback, intervalMs]);
}
