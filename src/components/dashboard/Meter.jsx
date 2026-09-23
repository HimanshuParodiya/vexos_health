import { cn } from "@/lib/utils";

// Horizontal meter. The fill colour carries severity; the track is a light wash of the same colour.
export function Meter({ label, value, max, detail, thresholds = { warning: 80, critical: 95 } }) {
  const percent = max ? Math.min((value / max) * 100, 100) : 0;
  const severity =
    percent >= thresholds.critical ? "critical" : percent >= thresholds.warning ? "warning" : "normal";

  const fill = {
    normal: "bg-primary",
    warning: "bg-status-warning",
    critical: "bg-status-critical",
  }[severity];
  const track = {
    normal: "bg-primary/15",
    warning: "bg-status-warning/20",
    critical: "bg-status-critical/15",
  }[severity];

  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {detail ?? `${value}/${max}`} · {Math.round(percent)}%
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn("h-2 overflow-hidden rounded-full", track)}
      >
        <div className={cn("h-full rounded-full transition-[width]", fill)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
