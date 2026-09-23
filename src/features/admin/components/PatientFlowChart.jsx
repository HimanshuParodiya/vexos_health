import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { ACTIVE_DOT, AXIS_PROPS, GRID_PROPS, LINE_PROPS, LEGEND_PROPS } from "@/components/dashboard/chart-styles";
import { formatShortDate } from "@/lib/format";

const config = {
  admissions: { label: "Admissions", color: "var(--chart-1)" },
  discharges: { label: "Discharges", color: "var(--chart-2)" },
};

export function PatientFlowChart({ data, days }) {
  return (
    <ChartCard
      title="Patient flow"
      description={`Admissions and discharges per day, last ${days} days`}
      className="lg:col-span-2"
    >
      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={28} tickFormatter={formatShortDate} />
          <YAxis {...AXIS_PROPS} allowDecimals={false} width={40} />
          <ChartTooltip
            cursor={{ stroke: "var(--border)" }}
            content={<ChartTooltipContent indicator="line" labelFormatter={(_, [item]) => formatShortDate(item.payload.date)} />}
          />
          <ChartLegend {...LEGEND_PROPS} content={<ChartLegendContent />} />
          {Object.keys(config).map((key) => (
            <Line
              key={key}
              {...LINE_PROPS}
              dataKey={key}
              stroke={`var(--color-${key})`}
              activeDot={ACTIVE_DOT}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </ChartCard>
  );
}
