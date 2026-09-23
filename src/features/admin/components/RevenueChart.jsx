import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { AXIS_PROPS, BAR_MAX_SIZE, BAR_RADIUS_TOP, GRID_PROPS } from "@/components/dashboard/chart-styles";
import { formatCurrency } from "@/lib/format";

const config = { revenue: { label: "Revenue", color: "var(--chart-1)" } };

// Past months are de-emphasised; the current (partial) month carries the accent.
export function RevenueChart({ data }) {
  const lastIndex = data.length - 1;

  return (
    <ChartCard title="Monthly revenue" description="Last 12 months · current month in progress" className="lg:col-span-2">
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <BarChart data={data} margin={{ top: 8, left: 4, right: 4 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="month" {...AXIS_PROPS} interval="preserveStartEnd" />
          <YAxis {...AXIS_PROPS} width={64} tickFormatter={(value) => formatCurrency(value)} />
          <ChartTooltip
            cursor={{ fill: "var(--muted)" }}
            content={
              <ChartTooltipContent
                hideIndicator
                formatter={(value) => (
                  <span className="font-medium tabular-nums">{formatCurrency(value)}</span>
                )}
              />
            }
          />
          <Bar dataKey="revenue" radius={BAR_RADIUS_TOP} maxBarSize={BAR_MAX_SIZE}>
            {data.map((entry, index) => (
              <Cell
                key={entry.month}
                fill="var(--color-revenue)"
                fillOpacity={index === lastIndex ? 1 : 0.45}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
