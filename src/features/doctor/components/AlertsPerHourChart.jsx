import { Bar, BarChart, XAxis } from "recharts";
import { AXIS_PROPS, BAR_MAX_SIZE, STACK_GAP } from "@/components/dashboard/chart-styles";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { alertSeverity } from "@/lib/clinical";
import { formatClock } from "@/lib/format";

const HOUR_MS = 3_600_000;
const CONFIG = {
  critical: { label: "Critical", color: "var(--critical)" },
  other: { label: "High / medium", color: "#b9c4be" },
};

// Open alerts bucketed by the hour they were raised, over the last 24 hours.
export function AlertsPerHourChart({ alerts, now }) {
  const currentHour = new Date(now).setMinutes(0, 0, 0);
  const buckets = Array.from({ length: 24 }, (_, index) => ({ t: currentHour - (23 - index) * HOUR_MS, critical: 0, other: 0 }));
  let counted = 0;
  for (const alert of alerts) {
    const time = new Date(alert.triggered_at).getTime();
    const index = Math.floor((time - buckets[0].t) / HOUR_MS);
    if (index < 0 || index > 23) continue;
    buckets[index][alertSeverity(alert) === "critical" ? "critical" : "other"] += 1;
    counted += 1;
  }

  return (
    <Panel>
      <PanelHeader title="Alerts per hour" meta="open · last 24 h" />
      <div className="px-3 pt-3 pb-2">
        {counted === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">No open alerts were raised in the last 24 hours.</p>
        ) : (
          <ChartContainer config={CONFIG} className="aspect-auto h-36 w-full">
            <BarChart data={buckets} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <XAxis
                {...AXIS_PROPS}
                dataKey="t"
                fontSize={10}
                interval={11}
                tickFormatter={(value) => formatClock(value, { seconds: false })}
              />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => formatClock(payload?.[0]?.payload?.t, { seconds: false })} />} />
              <Bar dataKey="critical" stackId="a" fill="var(--color-critical)" maxBarSize={BAR_MAX_SIZE} isAnimationActive={false} {...STACK_GAP} />
              <Bar dataKey="other" stackId="a" fill="var(--color-other)" maxBarSize={BAR_MAX_SIZE} isAnimationActive={false} {...STACK_GAP} />
            </BarChart>
          </ChartContainer>
        )}
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-critical" /> Critical</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-[#b9c4be]" /> High / medium</span>
        </div>
      </div>
    </Panel>
  );
}
