import { cn } from "@/lib/utils";

// Tiny trend line (no axes). Needs at least two values.
export function Sparkline({ values, width = 72, height = 20, className }) {
  const points = values.filter((value) => value != null);
  if (points.length < 2) return <span className="font-mono text-xs text-muted-foreground">–</span>;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const path = points
    .map((value, index) => `${(index * step).toFixed(1)},${(height - 2 - ((value - min) / range) * (height - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("overflow-visible", className)} aria-hidden="true">
      <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
