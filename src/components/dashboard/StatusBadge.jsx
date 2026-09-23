import { AlertOctagon, AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// Clinical status: always icon + label, never colour alone.
const STATUS = {
  good: { label: "Normal", icon: CheckCircle2, className: "text-status-good bg-status-good/10" },
  warning: { label: "Watch", icon: CircleAlert, className: "text-amber-700 dark:text-status-warning bg-status-warning/15" },
  serious: { label: "Abnormal", icon: AlertTriangle, className: "text-orange-700 dark:text-status-serious bg-status-serious/15" },
  critical: { label: "Critical", icon: AlertOctagon, className: "text-status-critical bg-status-critical/10" },
};

export function StatusBadge({ status, label, className }) {
  const config = STATUS[status] ?? STATUS.good;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        config.className,
        className
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label ?? config.label}
    </span>
  );
}
