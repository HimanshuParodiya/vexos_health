import { StatusDot } from "@/components/common/StatusDot";
import { useTelemetry } from "@/features/telemetry/telemetry-context";
import { useNow } from "@/hooks/useNow";
import { formatClock } from "@/lib/format";

const STATUS = {
  connected: { tone: "good", label: "Live stream connected" },
  connecting: { tone: "warning", label: "Connecting to live stream…" },
  reconnecting: { tone: "critical", label: "Live stream lost, reconnecting…" },
  idle: { tone: "muted", label: "Live stream not started" },
};

// "● HL7 · 16:03:45": live-stream state plus a ticking clock. Click to force a reconnect.
export function LiveStatus() {
  const telemetry = useTelemetry();
  const now = useNow(1000);
  const status = STATUS[telemetry?.status ?? "idle"];
  const lastPacket = telemetry?.lastMessageAt ? ` · last packet ${formatClock(telemetry.lastMessageAt)}` : "";

  return (
    <button
      type="button"
      onClick={telemetry?.reconnect}
      title={`${status.label}${lastPacket}. Click to reconnect.`}
      className="hidden items-center gap-2 rounded-md px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted sm:inline-flex"
    >
      <StatusDot tone={status.tone} pulse={telemetry?.status === "connected"} />
      HL7 · {formatClock(now)}
    </button>
  );
}

export function PlainClock() {
  const now = useNow(10_000);
  return <span className="font-mono text-xs text-muted-foreground">{formatClock(now, { seconds: false })}</span>;
}
