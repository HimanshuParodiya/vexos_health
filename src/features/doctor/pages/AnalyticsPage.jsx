import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { AXIS_PROPS, BAR_MAX_SIZE, BAR_RADIUS_TOP, GRID_PROPS } from "@/components/dashboard/chart-styles";
import { KpiStrip } from "@/components/common/KpiStrip";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClinicalPaths, withBed } from "@/features/unit/clinical-paths";
import { EwsBadge } from "@/features/unit/components/ClinicalBadges";
import { UnitLoadError } from "@/features/unit/components/UnitLoadError";
import { useUnitData } from "@/features/unit/unit-context";
import { roundTo } from "@/lib/clinical";
import { formatDayTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const NEWS2_PARAMETERS = [
  { key: "respiratory_rate", label: "RR" },
  { key: "spo2", label: "SpO₂" },
  { key: "heart_rate", label: "HR" },
  { key: "temperature", label: "Temp" },
  { key: "systolic_bp", label: "Sys BP" },
];

const BANDS = [
  { key: "low", label: "0–2 low", min: 0, max: 2, color: "var(--good)" },
  { key: "medium", label: "3–4 medium", min: 3, max: 4, color: "var(--status-warning)" },
  { key: "high", label: "5–6 high", min: 5, max: 6, color: "var(--status-serious)" },
  { key: "critical", label: "7+ urgent", min: 7, max: Infinity, color: "var(--critical)" },
];

function ScoreCell({ parameter }) {
  if (!parameter) return <TableCell className="text-muted-foreground">–</TableCell>;
  return (
    <TableCell className="font-mono text-xs">
      {roundTo(parameter.value, 1)}
      <span
        className={cn(
          "ml-1.5 rounded px-1 text-[10px]",
          parameter.score >= 3 ? "bg-critical text-white" : parameter.score >= 1 ? "bg-warning-surface text-warning" : "bg-muted text-muted-foreground"
        )}
      >
        +{parameter.score}
      </span>
    </TableCell>
  );
}

// Unit-level reporting: occupancy, NEWS2 distribution and per-patient score breakdown.
export function AnalyticsPage() {
  const unit = useUnitData();
  const paths = useClinicalPaths();
  const analytics = unit.analytics;
  const patients = unit.beds.filter((bed) => bed.occupied).sort((a, b) => (b.ews ?? -1) - (a.ews ?? -1));

  const distribution = BANDS.map((band) => ({
    band: band.label,
    key: band.key,
    patients: patients.filter((bed) => bed.ews != null && bed.ews >= band.min && bed.ews <= band.max).length,
  }));
  const alertsByBed = Object.entries(
    unit.alerts.reduce((acc, alert) => ({ ...acc, [alert.bed_id]: (acc[alert.bed_id] ?? 0) + 1 }), {})
  )
    .map(([bed, count]) => ({ bed, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <PageHeader title="Analytics" description="Unit-wide figures from the VEXOS analytics service and live NEWS2 scores." />
      {unit.status === "error" ? (
        <UnitLoadError error={unit.error} onRetry={unit.reload} />
      ) : unit.status === "loading" ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : (
        <div className="grid gap-4">
          <KpiStrip
            items={[
              { label: "Beds", value: analytics?.total_beds ?? unit.beds.length },
              { label: "Occupied", value: analytics?.occupied_beds ?? patients.length },
              { label: "Occupancy", value: analytics ? `${roundTo(analytics.occupancy_rate)}%` : "–" },
              { label: "Alerts · last 24 h", value: analytics?.total_alerts_last_24h ?? "–" },
              {
                label: "High-risk NEWS2",
                value: analytics?.active_high_risk_news2_patients ?? "–",
                tone: analytics?.active_high_risk_news2_patients > 0 ? "critical" : "default",
              },
              { label: "Beds with open alerts", value: analytics?.beds_with_active_alerts?.length ?? alertsByBed.length },
            ]}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="NEWS2 distribution" meta="patients per band" />
              <ChartContainer
                config={{ patients: { label: "Patients", color: "var(--chart-1)" } }}
                className="aspect-auto h-56 w-full px-2 pt-3"
              >
                <BarChart data={distribution} margin={{ left: 0, right: 12, top: 4 }}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis {...AXIS_PROPS} dataKey="band" />
                  <YAxis {...AXIS_PROPS} width={28} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="patients" radius={BAR_RADIUS_TOP} maxBarSize={BAR_MAX_SIZE * 2} isAnimationActive={false}>
                    {BANDS.map((band) => (
                      <Cell key={band.key} fill={band.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </Panel>

            <Panel>
              <PanelHeader title="Open alerts by bed" />
              {alertsByBed.length === 0 ? (
                <p className="py-16 text-center text-xs text-muted-foreground">No open alerts.</p>
              ) : (
                <ChartContainer
                  config={{ count: { label: "Open alerts", color: "var(--critical)" } }}
                  className="aspect-auto h-56 w-full px-2 pt-3"
                >
                  <BarChart data={alertsByBed} margin={{ left: 0, right: 12, top: 4 }}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis {...AXIS_PROPS} dataKey="bed" />
                    <YAxis {...AXIS_PROPS} width={28} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={BAR_RADIUS_TOP} maxBarSize={BAR_MAX_SIZE * 2} isAnimationActive={false} />
                  </BarChart>
                </ChartContainer>
              )}
            </Panel>
          </div>

          <Panel>
            <PanelHeader title="NEWS2 breakdown" meta="value and points per parameter" />
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-4">Bed</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Risk</TableHead>
                  {NEWS2_PARAMETERS.map((parameter) => (
                    <TableHead key={parameter.key}>{parameter.label}</TableHead>
                  ))}
                  <TableHead>Calculated</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((bed) => (
                  <TableRow key={bed.id}>
                    <TableCell className="pl-4 font-mono text-xs">{bed.id}</TableCell>
                    <TableCell>
                      <EwsBadge score={bed.ews} withLabel={false} className="min-w-8" />
                    </TableCell>
                    <TableCell className="text-xs capitalize" title={bed.ewsDetail?.clinical_response}>
                      {bed.ewsDetail?.risk_level?.toLowerCase() ?? "–"}
                    </TableCell>
                    {NEWS2_PARAMETERS.map((parameter) => (
                      <ScoreCell key={parameter.key} parameter={bed.ewsDetail?.parameters_evaluated?.[parameter.key]} />
                    ))}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {bed.ewsDetail?.calculated_at ? formatDayTime(bed.ewsDetail.calculated_at) : "–"}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Link to={withBed(paths.flowsheet, bed.id)} className="text-sm font-medium text-primary underline underline-offset-2">
                        Chart
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </div>
      )}
    </>
  );
}
