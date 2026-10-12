import { cn } from "@/lib/utils";

const TONES = {
  default: "text-foreground",
  critical: "text-critical",
  warning: "text-warning",
  good: "text-good",
};

// Row of headline figures separated by hairlines (unit summary, system status).
// item: { label, value, suffix?, tone?, footnote?, footnoteTone? }
export function KpiStrip({ items, className }) {
  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-lg border bg-card sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]",
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="border-b px-4 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className={cn("mt-1 font-mono text-[1.4rem] leading-tight", TONES[item.tone ?? "default"])}>
            {item.value}
            {item.suffix && <span className="text-base text-muted-foreground"> {item.suffix}</span>}
          </p>
          {item.footnote && (
            <p className={cn("mt-0.5 text-xs", item.footnoteTone ? TONES[item.footnoteTone] : "text-muted-foreground")}>
              {item.footnote}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
