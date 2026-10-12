import { ewsTone } from "@/lib/clinical";
import { cn } from "@/lib/utils";

const EWS_TONES = {
  none: "bg-muted text-muted-foreground",
  low: "bg-good-surface text-good",
  medium: "bg-warning-surface text-warning",
  high: "bg-critical text-white",
};

// NEWS2 score chip: green 0–2, amber 3–4, red 5+.
export function EwsBadge({ score, withLabel = true, className }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center justify-center rounded px-1.5 font-mono text-[11px] font-semibold",
        EWS_TONES[ewsTone(score)],
        className
      )}
      title={score == null ? "Early warning score not available" : `NEWS2 score ${score}`}
    >
      {withLabel && "EWS "}
      {score ?? "–"}
    </span>
  );
}

export function VentBadge({ className }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded border border-[#b8c2d6] px-1.5 font-mono text-[10px] font-medium tracking-wide text-[#3d4a68]",
        className
      )}
    >
      VENT
    </span>
  );
}

const SEVERITY_DOT = {
  critical: "bg-critical",
  high: "bg-status-serious",
  medium: "bg-status-warning",
  low: "bg-muted-foreground/50",
};

export function SeveritySquare({ severity, className }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-[2px]", SEVERITY_DOT[severity], className)} aria-hidden="true" />;
}
