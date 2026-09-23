import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { ACTIVE_DOT, AXIS_PROPS, GRID_PROPS, LINE_PROPS, LEGEND_PROPS } from "@/components/dashboard/chart-styles";
import { formatTime } from "@/lib/format";

// One small chart per vital sign: each has its own unit and scale,
// so they are small multiples rather than one chart with several axes.
const VITALS = [
  {
    key: "heartRate",
    title: "Heart rate",
    unit: "bpm",
    normal: [60, 100],
    domain: [40, 140],
    series: { heartRate: { label: "Heart rate", color: "var(--chart-1)" } },
  },
  {
    key: "spo2",
    title: "SpO₂",
    unit: "%",
    normal: [95, 100],
    domain: [85, 100],
    series: { spo2: { label: "SpO₂", color: "var(--chart-1)" } },
  },
  {
    key: "bp",
    title: "Blood pressure",
    unit: "mmHg",
    normal: [60, 130],
    domain: [40, 180],
    series: {
      systolic: { label: "Systolic", color: "var(--chart-1)" },
      diastolic: { label: "Diastolic", color: "var(--chart-2)" },
    },
  },
  {
    key: "temperature",
    title: "Temperature",
    unit: "°C",
    normal: [36.1, 38],
    domain: [35, 40],
    series: { temperature: { label: "Temperature", color: "var(--chart-1)" } },
  },
];

export function VitalsPanel({ patients, vitals }) {
  const [patientId, setPatientId] = useState(patients[0]?.id);
  const patient = patients.find((item) => item.id === patientId);
  const readings = vitals[patientId] ?? [];
  const latest = readings.at(-1);

  return (
    <ChartCard
      title="Vitals · last 24 hours"
      description={patient ? `${patient.bed} · ${patient.name}, ${patient.age}y · ${patient.diagnosis}` : undefined}
      action={
        <Select value={patientId} onValueChange={setPatientId}>
          <SelectTrigger aria-label="Patient" className="w-44">
            <SelectValue>{(value) => patients.find((item) => item.id === value)?.name}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {patients.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.bed} · {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      contentClassName="grid gap-6 sm:grid-cols-2 xl:grid-cols-4"
    >
      {VITALS.map((vital) => (
        <VitalChart key={vital.key} vital={vital} data={readings} latest={latest} />
      ))}
    </ChartCard>
  );
}

function VitalChart({ vital, data, latest }) {
  const seriesKeys = Object.keys(vital.series);
  const latestValue = latest
    ? seriesKeys.map((key) => latest[key]).join("/")
    : "—";

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{vital.title}</h3>
        <p className="text-sm tabular-nums">
          <span className="text-lg font-semibold">{latestValue}</span>{" "}
          <span className="text-muted-foreground">{vital.unit}</span>
        </p>
      </div>
      <ChartContainer config={vital.series} className="aspect-auto h-40 w-full">
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          {/* Shaded band = normal range */}
          <ReferenceArea y1={vital.normal[0]} y2={vital.normal[1]} fill="var(--status-good)" fillOpacity={0.08} />
          <XAxis dataKey="time" {...AXIS_PROPS} minTickGap={32} tickFormatter={formatTime} />
          <YAxis {...AXIS_PROPS} domain={vital.domain} width={36} />
          <ChartTooltip
            cursor={{ stroke: "var(--border)" }}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(_, [item]) => formatTime(item.payload.time)}
              />
            }
          />
          {seriesKeys.length > 1 && <ChartLegend {...LEGEND_PROPS} content={<ChartLegendContent className="pt-1" />} />}
          {seriesKeys.map((key) => (
            <Line key={key} {...LINE_PROPS} dataKey={key} stroke={`var(--color-${key})`} activeDot={ACTIVE_DOT} />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
}
