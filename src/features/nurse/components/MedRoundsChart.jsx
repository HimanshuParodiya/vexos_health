import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import {
  AXIS_PROPS,
  BAR_MAX_SIZE,
  BAR_RADIUS_TOP,
  GRID_PROPS,
  STACK_GAP,
  LEGEND_PROPS,
} from "@/components/dashboard/chart-styles";

// Administration outcome is a state, so it uses the reserved status colours.
const config = {
  onTime: { label: "On time", color: "var(--status-good)" },
  late: { label: "Late (> 30 min)", color: "var(--status-warning)" },
  missed: { label: "Missed", color: "var(--status-critical)" },
};

export function MedRoundsChart({ data }) {
  return (
    <ChartCard
      title="Medication rounds"
      description="Doses administered per round, this shift"
      className="lg:col-span-2"
    >
      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        <BarChart data={data} margin={{ top: 8, left: -12, right: 4 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="slot" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} allowDecimals={false} width={40} />
          <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
          <ChartLegend {...LEGEND_PROPS} content={<ChartLegendContent />} />
          <Bar dataKey="onTime" stackId="doses" fill="var(--color-onTime)" maxBarSize={BAR_MAX_SIZE} {...STACK_GAP} />
          <Bar dataKey="late" stackId="doses" fill="var(--color-late)" maxBarSize={BAR_MAX_SIZE} {...STACK_GAP} />
          <Bar
            dataKey="missed"
            stackId="doses"
            fill="var(--color-missed)"
            maxBarSize={BAR_MAX_SIZE}
            radius={BAR_RADIUS_TOP}
            {...STACK_GAP}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
