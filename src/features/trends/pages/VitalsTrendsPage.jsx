import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from "recharts";
import { BedDouble } from "lucide-react";
import { AXIS_PROPS, GRID_PROPS, LINE_PROPS, ACTIVE_DOT } from "@/components/dashboard/chart-styles";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { SegmentedNav } from "@/components/common/SegmentedNav";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinicalPaths, useViewTabs, withBed } from "@/features/unit/clinical-paths";
import { UnitLoadError } from "@/features/unit/components/UnitLoadError";
import { useUnitData } from "@/features/unit/unit-context";
import { useNow } from "@/hooks/useNow";
import { VITAL_LIMITS, observationTime, pickNumber, roundTo, vitalsFromObservation } from "@/lib/clinical";
import { formatClock, formatDayTime } from "@/lib/format";

const RANGES = [
  { value: 6, label: "Last 6 h" },
  { value: 12, label: "Last 12 h" },
  { value: 24, label: "Last 24 h" },
  { value: 72, label: "Last 3 days" },
];

// One chart per panel. `limit` shades the normal range behind the line.
const CHARTS = [
  { id: "hr", title: "Heart rate", unit: "bpm", limit: "heartRate", series: [{ key: "heartRate", label: "HR", color: "var(--chart-2)" }] },
  { id: "spo2", title: "SpO₂", unit: "%", limit: "spo2", domain: [80, 100], series: [{ key: "spo2", label: "SpO₂", color: "var(--chart-3)" }] },
  {
    id: "bp",
    title: "Blood pressure",
    unit: "mmHg",
    limit: "map",
    series: [
      { key: "systolic", label: "Systolic", color: "var(--chart-1)" },
      { key: "map", label: "MAP", color: "var(--chart-4)" },
      { key: "diastolic", label: "Diastolic", color: "var(--chart-5)" },
    ],
  },
  { id: "rr", title: "Respiratory rate", unit: "/min", limit: "respiratoryRate", series: [{ key: "respiratoryRate", label: "RR", color: "var(--chart-1)" }] },
  { id: "temp", title: "Temperature", unit: "°C", limit: "temperature", domain: [34, 41], series: [{ key: "temperature", label: "Temp", color: "var(--chart-2)" }] },
  {
    id: "vent",
    title: "Ventilation",
    unit: "% · cmH₂O",
    series: [
      { key: "fio2", label: "FiO₂ %", color: "var(--chart-3)" },
      { key: "peep", label: "PEEP", color: "var(--chart-5)" },
    ],
  },
];

function toPoints(patient) {
  const vitals = patient.vitals.map((obs) => {
    const v = vitalsFromObservation(obs);
    return {
      t: v.at,
      heartRate: v.heartRate,
      spo2: v.spo2,
      systolic: v.systolic,
      diastolic: v.diastolic,
      map: v.map != null ? roundTo(v.map) : null,
      respiratoryRate: v.respiratoryRate,
      temperature: v.temperature,
    };
  });
  const vent = patient.ventilator.map((obs) => ({
    t: observationTime(obs),
    fio2: pickNumber(obs, "fio2"),
    peep: pickNumber(obs, "peep"),
  }));
  return [...vitals, ...vent].filter((point) => point.t != null).sort((a, b) => a.t - b.t);
}

function TrendChart({ chart, points, domainX }) {
  const config = Object.fromEntries(chart.series.map((s) => [s.key, { label: s.label, color: s.color }]));
  const data = points.filter((point) => chart.series.some((s) => point[s.key] != null));
  const limits = chart.limit ? VITAL_LIMITS[chart.limit] : null;

  return (
    <Panel>
      <PanelHeader title={chart.title} meta={chart.unit} />
      {data.length === 0 ? (
        <EmptyState title="No readings in this range" className="h-48 py-0 justify-center" />
      ) : (
        <ChartContainer config={config} className="aspect-auto h-48 w-full px-2 pt-3">
          <LineChart data={data} margin={{ left: 0, right: 12, top: 4, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            {limits?.low != null && limits?.high != null && (
              <ReferenceArea y1={limits.low} y2={limits.high} fill="var(--good)" fillOpacity={0.06} />
            )}
            <XAxis
              {...AXIS_PROPS}
              dataKey="t"
              type="number"
              scale="time"
              domain={domainX}
              tickFormatter={(value) => formatClock(value, { seconds: false })}
            />
            <YAxis {...AXIS_PROPS} width={36} domain={chart.domain ?? ["auto", "auto"]} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => formatDayTime(payload?.[0]?.payload?.t, { alwaysShowDate: true })} />} />
            {chart.series.map((series) => (
              <Line
                key={series.key}
                {...LINE_PROPS}
                dataKey={series.key}
                name={series.key}
                stroke={`var(--color-${series.key})`}
                dot={data.length < 30 ? { r: 2.5, strokeWidth: 0, fill: `var(--color-${series.key})` } : false}
                activeDot={ACTIVE_DOT}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      )}
    </Panel>
  );
}

export function VitalsTrendsPage() {
  const unit = useUnitData();
  const paths = useClinicalPaths();
  const [params, setParams] = useSearchParams();
  const [rangeHours, setRangeHours] = useState(12);
  const now = useNow(30_000);

  const occupied = unit.beds.filter((bed) => bed.occupied);
  const bed = occupied.find((item) => item.id === params.get("bed")) ?? occupied[0] ?? null;
  const tabs = useViewTabs(bed?.id);
  const patient = bed ? unit.patients[bed.mrn] : null;
  const points = useMemo(() => (patient ? toPoints(patient) : []), [patient]);

  // Window ends now, or at the last reading when the bed has gone quiet.
  const spanMs = rangeHours * 3_600_000;
  const lastAt = points.at(-1)?.t ?? null;
  const end = lastAt && lastAt < now - spanMs ? lastAt : now;
  const domainX = [end - spanMs, end];
  const visible = points.filter((point) => point.t >= domainX[0] && point.t <= domainX[1]);

  const header = <PageHeader title="Vitals trends" actions={<SegmentedNav items={tabs} />} />;

  if (unit.status === "error") return <>{header}<UnitLoadError error={unit.error} onRetry={unit.reload} /></>;
  if (unit.status === "loading") return <>{header}<Skeleton className="h-96 rounded-lg" /></>;
  if (!bed) {
    return (
      <>
        {header}
        <EmptyState icon={BedDouble} title="No occupied beds" className="rounded-lg border bg-card" />
      </>
    );
  }

  const bedItems = occupied.map((item) => ({ value: item.id, label: item.id }));

  return (
    <>
      {header}
      <div className="grid gap-4">
        <Panel className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Select items={bedItems} value={bed.id} onValueChange={(value) => setParams({ bed: value })}>
            <SelectTrigger size="sm" className="min-w-28 font-mono" aria-label="Bed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {occupied.map((item) => (
                <SelectItem key={item.id} value={item.id} className="font-mono">
                  {item.id}
                  <span className="font-sans text-xs text-muted-foreground">{item.name ?? item.mrn}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid">
            <span className="font-semibold">{bed.name ?? "Unidentified patient"}</span>
            <span className="font-mono text-xs text-muted-foreground">MRN {bed.mrn}</span>
          </div>
          <Select items={RANGES} value={rangeHours} onValueChange={setRangeHours}>
            <SelectTrigger size="sm" aria-label="Time range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {visible.length} readings
            {end !== now && lastAt ? ` · showing up to last data ${formatDayTime(lastAt, { alwaysShowDate: true })}` : ""}
          </span>
          <Link to={withBed(paths.flowsheet, bed.id)} className="ml-auto text-sm font-medium text-primary underline underline-offset-2">
            Open flowsheet →
          </Link>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {CHARTS.map((chart) => (
            <TrendChart key={chart.id} chart={chart} points={visible} domainX={domainX} />
          ))}
        </div>
      </div>
    </>
  );
}
