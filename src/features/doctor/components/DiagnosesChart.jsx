import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { AXIS_PROPS, BAR_MAX_SIZE, BAR_RADIUS_END } from "@/components/dashboard/chart-styles";

const config = { count: { label: "Patients", color: "var(--chart-1)" } };

export function DiagnosesChart({ data }) {
  return (
    <ChartCard title="Top diagnoses" description="Primary diagnosis, selected period">
      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 36 }} barCategoryGap={6}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="category"
            {...AXIS_PROPS}
            width={168}
            tickFormatter={(value) => (value.length > 24 ? `${value.slice(0, 23)}…` : value)}
          />
          <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent hideIndicator />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={BAR_RADIUS_END} maxBarSize={BAR_MAX_SIZE}>
            <LabelList dataKey="count" position="right" className="fill-foreground" fontSize={12} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
