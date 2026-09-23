import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { percentChange } from "@/lib/format";
import { cn } from "@/lib/utils";

// KPI tile: label, value, optional delta vs previous period and a sparkline.
// `upIsGood` decides whether a rise is shown as positive (green) or negative (red).
export function StatTile({
  label,
  value,
  current,
  previous,
  periodLabel = "previous period",
  upIsGood = true,
  trend,
  icon: Icon,
  footnote,
}) {
  const change = current != null && previous != null ? percentChange(current, previous) : null;

  return (
    <Card className="gap-3">
      <CardContent className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          {Icon && (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl leading-none font-semibold tracking-tight">{value}</p>
          {trend?.length > 1 && <Sparkline data={trend} label={label} />}
        </div>
        {change != null ? (
          <Delta change={change} upIsGood={upIsGood} periodLabel={periodLabel} />
        ) : (
          footnote && <p className="text-xs text-muted-foreground">{footnote}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Delta({ change, upIsGood, periodLabel }) {
  const flat = Math.abs(change) < 0.5;
  const good = flat ? null : change > 0 === upIsGood;
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium",
          good === true && "text-emerald-700 dark:text-emerald-400",
          good === false && "text-red-700 dark:text-red-400"
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        {flat ? "0%" : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`}
      </span>
      vs {periodLabel}
    </p>
  );
}

// De-emphasised trend line with the latest point in the accent colour.
function Sparkline({ data, label }) {
  const points = data.map((value, index) => ({ index, value }));
  const lastIndex = points.length - 1;

  return (
    <div className="h-10 w-24 shrink-0" role="img" aria-label={`${label} trend`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 96, height: 40 }}>
        <LineChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--muted-foreground)"
            strokeOpacity={0.6}
            strokeWidth={1.5}
            isAnimationActive={false}
            dot={({ index, cx, cy }) =>
              index === lastIndex ? (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={3.5}
                  fill="var(--primary)"
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ) : (
                <g key={index} />
              )
            }
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
