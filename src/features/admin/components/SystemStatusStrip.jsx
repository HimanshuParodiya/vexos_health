import { StatusDot } from "@/components/common/StatusDot";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAgo } from "@/lib/format";

// The engine can be "ready" while nothing arrives; call it idle after this long without messages.
const IDLE_AFTER_MS = 10 * 60_000;

function Item({ label, tone, value, detail, loading }) {
  return (
    <div className="border-b px-4 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-5 w-24" />
      ) : (
        <>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
            {tone && <StatusDot tone={tone} />}
            <span className={tone ? undefined : "font-mono"}>{value}</span>
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{detail}</p>
        </>
      )}
    </div>
  );
}

// API / readiness / HL7 engine / build, as on the admin "Users & system" screen.
export function SystemStatusStrip({ system, lastMessageAt, loading }) {
  const health = system?.health;
  const ready = system?.ready;
  const engine = system?.status?.hl7_engine;
  const receiving = engine === "ready" && lastMessageAt && Date.parse(lastMessageAt) > Date.parse(system?.checkedAt) - IDLE_AFTER_MS;

  return (
    <div className="grid overflow-hidden rounded-lg border bg-card sm:grid-cols-2 xl:grid-cols-4">
      <Item
        label="API"
        loading={loading}
        tone={health?.status === "healthy" ? "good" : "critical"}
        value={health?.status === "healthy" ? "Healthy" : "Unreachable"}
        detail={health ? `${health.latencyMs} ms response · ${health.environment ?? "—"}` : "no response from /health"}
      />
      <Item
        label="Readiness"
        loading={loading}
        tone={ready?.status === "ready" ? "good" : "critical"}
        value={ready?.status === "ready" ? "Ready" : "Not ready"}
        detail={ready ? `database ${ready.database ?? "unknown"}` : "no response from /ready"}
      />
      <Item
        label="HL7 listener"
        loading={loading}
        tone={receiving ? "good" : engine === "ready" ? "warning" : "critical"}
        value={receiving ? "Receiving" : engine === "ready" ? "Idle" : engine ?? "Unknown"}
        detail={lastMessageAt ? `last message ${formatAgo(lastMessageAt)}` : "no messages yet"}
      />
      <Item
        label="Build"
        loading={loading}
        value={system?.version ? `v${system.version}` : "—"}
        detail={system?.status?.service ?? "VEXOS ICU Platform"}
      />
    </div>
  );
}
