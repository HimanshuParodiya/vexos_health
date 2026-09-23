import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { AXIS_PROPS, BAR_MAX_SIZE, BAR_RADIUS_END, STACK_GAP, LEGEND_PROPS } from "@/components/dashboard/chart-styles";

const config = {
  doctors: { label: "Doctors", color: "var(--chart-1)" },
  nurses: { label: "Nurses", color: "var(--chart-2)" },
};

export function StaffingChart({ data }) {
  return (
    <ChartCard title="Staffing by department" description="Active clinical staff">
      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8 }} barCategoryGap={4}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="department" {...AXIS_PROPS} width={112} />
          <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
          <ChartLegend {...LEGEND_PROPS} content={<ChartLegendContent />} />
          <Bar dataKey="doctors" stackId="staff" fill="var(--color-doctors)" maxBarSize={BAR_MAX_SIZE} {...STACK_GAP} />
          <Bar
            dataKey="nurses"
            stackId="staff"
            fill="var(--color-nurses)"
            maxBarSize={BAR_MAX_SIZE}
            radius={BAR_RADIUS_END}
            {...STACK_GAP}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
