import { cn } from "@/lib/utils";

const TONES = {
  good: "bg-good",
  warning: "bg-status-warning",
  critical: "bg-critical",
  high: "bg-status-serious",
  muted: "bg-muted-foreground/50",
};

export function StatusDot({ tone = "good", pulse = false, className }) {
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} aria-hidden="true">
      {pulse && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", TONES[tone])} />}
      <span className={cn("relative inline-flex size-2 rounded-full", TONES[tone])} />
    </span>
  );
}
