import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { AXIS_PROPS, BAR_MAX_SIZE, BAR_RADIUS_TOP, GRID_PROPS } from "@/components/dashboard/chart-styles";

const config = { patients: { label: "Patients", color: "var(--chart-1)" } };

export function HourlyLoadChart({ data }) {
  return (
    <ChartCard title="Today's load" description="Patients booked per hour">
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <BarChart data={data} margin={{ top: 8, left: -20, right: 4 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="hour" {...AXIS_PROPS} interval={1} tickFormatter={(hour) => hour.slice(0, 2)} />
          <YAxis {...AXIS_PROPS} allowDecimals={false} width={40} />
          <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent hideIndicator />} />
          <Bar dataKey="patients" fill="var(--color-patients)" radius={BAR_RADIUS_TOP} maxBarSize={BAR_MAX_SIZE} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
