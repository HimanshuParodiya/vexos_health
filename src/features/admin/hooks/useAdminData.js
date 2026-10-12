import { useAsyncData } from "@/hooks/useAsyncData";
import { usePolling } from "@/hooks/usePolling";
import { httpClient } from "@/services/http-client";
import { vexosApi } from "@/services/vexos-api";

function settled(result) {
  return result.status === "fulfilled" ? result.value : null;
}

async function timedHealth() {
  const started = performance.now();
  const health = await vexosApi.getHealth();
  return { ...health, latencyMs: Math.round(performance.now() - started) };
}

// API liveness/readiness, HL7 engine state and build version. Polls every 30 s.
export function useSystemStatus() {
  const query = useAsyncData(async () => {
    const [health, ready, status, openapi] = await Promise.allSettled([
      timedHealth(),
      vexosApi.getReady(),
      vexosApi.getStatus(),
      httpClient.get("/openapi.json", { auth: false }),
    ]);
    return {
      health: settled(health),
      ready: settled(ready),
      status: settled(status),
      version: settled(openapi)?.info?.version ?? null,
      checkedAt: new Date().toISOString(),
    };
  }, "system-status");
  usePolling(query.reload, 30_000);
  return query;
}

// HL7 message counters and the most recent messages (for the per-minute chart). Polls every 30 s.
export function useHl7Stats(recentLimit = 500) {
  const query = useAsyncData(() => vexosApi.getHl7Stats(recentLimit), `hl7-${recentLimit}`);
  usePolling(query.reload, 30_000);
  return query;
}

export function useHl7SourceConfig() {
  return useAsyncData(() => vexosApi.getHl7SourceConfig(), "hl7-source");
}

// Local accounts plus recent sign-in attempts (admin only).
export function useUsersAndSignIns(recentLimit = 200) {
  return useAsyncData(async () => {
    const [users, attempts] = await Promise.all([vexosApi.listUsers(), vexosApi.listLoginAttempts(recentLimit)]);
    return { users, attempts };
  }, `users-${recentLimit}`);
}
