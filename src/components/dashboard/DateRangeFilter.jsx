import { cn } from "@/lib/utils";

const DATE_RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

// Segmented control for the dashboard time window. Scopes every chart below it.
export function DateRangeFilter({ value, onChange, className }) {
  return (
    <div
      role="radiogroup"
      aria-label="Date range"
      className={cn("inline-flex rounded-lg border bg-background p-0.5", className)}
    >
      {DATE_RANGES.map((range) => {
        const selected = range.value === value;
        return (
          <button
            key={range.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(range.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected && "bg-muted font-medium text-foreground"
            )}
          >
            Last {range.label}
          </button>
        );
      })}
    </div>
  );
}
