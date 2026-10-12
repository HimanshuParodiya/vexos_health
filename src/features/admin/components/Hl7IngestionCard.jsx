import { useState } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AXIS_PROPS } from "@/components/dashboard/chart-styles";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatClock, formatDayTime, formatNumber } from "@/lib/format";
import { vexosApi } from "@/services/vexos-api";
import { summarizeHl7 } from "../lib/hl7";

const MINUTE_MS = 60_000;

// Messages per minute over the last hour, from the `recent` list of /hl7/stats.
function perMinute(recent, now) {
  const end = new Date(now).setSeconds(0, 0);
  const buckets = Array.from({ length: 60 }, (_, index) => ({ t: end - (59 - index) * MINUTE_MS, messages: 0 }));
  let counted = 0;
  for (const message of recent) {
    const index = Math.floor((new Date(message.ingested_at).getTime() - buckets[0].t) / MINUTE_MS);
    if (index >= 0 && index < 60) {
      buckets[index].messages += 1;
      counted += 1;
    }
  }
  return { buckets, counted };
}

export function Hl7IngestionCard({ stats, loading, onSwept, now }) {
  const [sweeping, setSweeping] = useState(false);
  const summary = summarizeHl7(stats);
  const { buckets, counted } = perMinute(stats?.recent ?? [], now);

  const sweep = async () => {
    setSweeping(true);
    try {
      const result = await vexosApi.sweepHl7();
      toast.success("Queue swept", { description: result ? JSON.stringify(result).slice(0, 160) : undefined });
      onSwept?.();
    } catch (error) {
      toast.error(error.message || "Sweep failed");
    } finally {
      setSweeping(false);
    }
  };

  const figures = [
    { label: "Received · total", value: formatNumber(summary.total) },
    { label: "Parsed", value: summary.parsedPercent == null ? "–" : `${summary.parsedPercent.toFixed(1)}%` },
    { label: "Rejected", value: formatNumber(summary.rejected), tone: summary.rejected > 0 ? "text-critical" : "" },
    { label: "Queue", value: formatNumber(summary.queue) },
  ];

  return (
    <Panel>
      <PanelHeader
        title="HL7 ingestion · last 60 min"
        actions={
          <Button variant="outline" size="sm" onClick={sweep} disabled={sweeping}>
            {sweeping && <Loader2 className="animate-spin" />}
            Sweep queue now
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 px-4 pt-4 sm:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.label}>
            <p className="text-xs text-muted-foreground">{figure.label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-6 w-16" />
            ) : (
              <p className={`mt-0.5 font-mono text-xl ${figure.tone ?? ""}`}>{figure.value}</p>
            )}
          </div>
        ))}
      </div>
      <div className="px-2 pt-3 pb-3">
        {loading ? (
          <Skeleton className="mx-2 h-32" />
        ) : counted === 0 ? (
          <p className="mx-2 flex h-32 items-center justify-center rounded-md bg-muted/50 text-xs text-muted-foreground">
            No messages in the last 60 min
            {summary.lastMessageAt ? ` · last received ${formatDayTime(summary.lastMessageAt, { alwaysShowDate: true })}` : ""}
          </p>
        ) : (
          <ChartContainer config={{ messages: { label: "Messages", color: "var(--primary)" } }} className="aspect-auto h-32 w-full">
            <AreaChart data={buckets} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <XAxis
                {...AXIS_PROPS}
                dataKey="t"
                fontSize={10}
                interval={29}
                tickFormatter={(value) => formatClock(value, { seconds: false })}
              />
              <YAxis {...AXIS_PROPS} width={28} fontSize={10} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => formatClock(payload?.[0]?.payload?.t, { seconds: false })} />} />
              <Area
                dataKey="messages"
                type="linear"
                stroke="var(--color-messages)"
                strokeWidth={1.5}
                fill="var(--color-messages)"
                fillOpacity={0.08}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
        <p className="mt-1 flex justify-between px-2 font-mono text-[10px] text-muted-foreground">
          <span>−60 min</span>
          <span>now · msg/min (from the latest {stats?.recent?.length ?? 0} messages)</span>
        </p>
      </div>
    </Panel>
  );
}
