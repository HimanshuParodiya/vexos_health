import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { Sparkline } from "@/components/common/Sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertsPerHourChart } from "@/features/doctor/components/AlertsPerHourChart";
import { useClinicalPaths, withBed } from "@/features/unit/clinical-paths";
import { EwsBadge } from "@/features/unit/components/ClinicalBadges";
import { UnitLoadError } from "@/features/unit/components/UnitLoadError";
import { useUnitData } from "@/features/unit/unit-context";
import { useNow } from "@/hooks/useNow";
import { alertSeverity, assessValue, ewsTone, observationTime, roundTo, vitalsFromObservation } from "@/lib/clinical";
import { formatStopwatch } from "@/lib/format";
import { cn } from "@/lib/utils";

const TWELVE_HOURS = 12 * 3_600_000;
const SPARK_TONE = { high: "text-critical", medium: "text-status-serious", low: "text-good", none: "text-muted-foreground" };

function StatCard({ label, value, footnote, footnoteTone }) {
  return (
    <Panel className="px-4 py-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-[1.6rem] leading-tight">{value}</p>
      {footnote && <p className={cn("mt-1 text-xs", footnoteTone ?? "text-muted-foreground")}>{footnote}</p>}
    </Panel>
  );
}

function VitalCell({ value, limit }) {
  const status = assessValue(limit, value);
  return (
    <TableCell className={cn("font-mono", (status === "outside" || status === "critical") && "text-critical")}>
      {value == null ? "–" : roundTo(value)}
    </TableCell>
  );
}

// Heart-rate trace over the 12 hours before the bed's latest reading.
function heartRateTrend(patient) {
  if (!patient?.vitals.length) return [];
  const last = observationTime(patient.vitals.at(-1));
  return patient.vitals
    .filter((obs) => observationTime(obs) >= last - TWELVE_HOURS)
    .map((obs) => vitalsFromObservation(obs).heartRate);
}

export function MyPatientsPage() {
  const unit = useUnitData();
  const paths = useClinicalPaths();
  const now = useNow(1000);

  const patients = unit.beds
    .filter((bed) => bed.occupied)
    .sort((a, b) => (b.ews ?? -1) - (a.ews ?? -1) || a.id.localeCompare(b.id, undefined, { numeric: true }));
  const scored = patients.filter((bed) => bed.ews != null);
  const meanEws = scored.length ? scored.reduce((sum, bed) => sum + bed.ews, 0) / scored.length : null;
  const highRisk = scored.filter((bed) => bed.ews >= 5).length;
  const criticalOpen = unit.alerts.filter((alert) => alertSeverity(alert) === "critical").length;
  const waiting = [...unit.alerts].sort((a, b) => new Date(a.triggered_at) - new Date(b.triggered_at));
  const analytics = unit.analytics;

  return (
    <>
      <PageHeader
        title="My patients"
        description={`${patients.length} patients on the unit · sorted by early warning score`}
        actions={<span className="text-xs text-muted-foreground">Unit figures · live</span>}
      />

      {unit.status === "error" ? (
        <UnitLoadError error={unit.error} onRetry={unit.reload} />
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Census"
              value={patients.length}
              footnote={analytics ? `${analytics.total_beds} beds · ${roundTo(analytics.occupancy_rate)}% occupied` : null}
            />
            <StatCard
              label="Mean EWS"
              value={meanEws == null ? "–" : meanEws.toFixed(1)}
              footnote={`${highRisk} patient${highRisk === 1 ? "" : "s"} at EWS ≥ 5`}
              footnoteTone={highRisk > 0 ? "text-critical" : undefined}
            />
            <StatCard
              label="Alerts raised · 24 h"
              value={analytics?.total_alerts_last_24h ?? "–"}
              footnote={`${criticalOpen} critical still open`}
              footnoteTone={criticalOpen > 0 ? "text-critical" : undefined}
            />
            <StatCard
              label="Waiting on acknowledgement"
              value={unit.alerts.length}
              footnote={waiting[0] ? `longest wait ${formatStopwatch(waiting[0].triggered_at, now)}` : "none waiting"}
            />
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <Panel>
              {unit.status === "loading" ? (
                <div className="grid gap-2 p-4">
                  {Array.from({ length: 6 }, (_, index) => (
                    <Skeleton key={index} className="h-11" />
                  ))}
                </div>
              ) : patients.length === 0 ? (
                <EmptyState icon={Users} title="No patients on the unit" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="pl-4 font-normal text-muted-foreground">Bed</TableHead>
                      <TableHead className="font-normal text-muted-foreground">Patient</TableHead>
                      <TableHead className="font-normal text-muted-foreground">EWS</TableHead>
                      <TableHead className="font-normal text-muted-foreground">Last 12 h</TableHead>
                      <TableHead className="font-normal text-muted-foreground">HR</TableHead>
                      <TableHead className="font-normal text-muted-foreground">SpO₂</TableHead>
                      <TableHead className="font-normal text-muted-foreground">MAP</TableHead>
                      <TableHead className="font-normal text-muted-foreground">Support</TableHead>
                      <TableHead className="font-normal text-muted-foreground">Alerts</TableHead>
                      <TableHead className="pr-4" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((bed) => {
                      const patient = unit.patients[bed.mrn];
                      const support = [bed.onVentilator && "Vent", patient?.anesthesia.length > 0 && "anaesthesia"].filter(Boolean);
                      return (
                        <TableRow key={bed.id}>
                          <TableCell className="pl-4 font-mono text-xs">{bed.id}</TableCell>
                          <TableCell>
                            <p className="font-semibold">{bed.name ?? "Unidentified patient"}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {[bed.gender, bed.mrn].filter(Boolean).join(" · ")}
                            </p>
                          </TableCell>
                          <TableCell>
                            <EwsBadge score={bed.ews} withLabel={false} className="min-w-8" />
                          </TableCell>
                          <TableCell className={SPARK_TONE[ewsTone(bed.ews)]}>
                            <Sparkline values={heartRateTrend(patient)} />
                          </TableCell>
                          <VitalCell value={bed.vitals?.heartRate} limit="heartRate" />
                          <VitalCell value={bed.vitals?.spo2} limit="spo2" />
                          <VitalCell value={bed.vitals?.map} limit="map" />
                          <TableCell className="text-sm">{support.length ? support.join(" · ") : "—"}</TableCell>
                          <TableCell className={cn("font-mono", bed.alerts.length > 0 ? "text-critical" : "text-muted-foreground")}>
                            {bed.alerts.length || "—"}
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            <Link to={withBed(paths.flowsheet, bed.id)} className="text-sm font-medium text-primary underline underline-offset-2">
                              Chart
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Panel>

            <div className="grid gap-4">
              <AlertsPerHourChart alerts={unit.alerts} now={now} />
              <Panel>
                <PanelHeader title="Waiting on acknowledgement" />
                {waiting.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-muted-foreground">Nothing waiting.</p>
                ) : (
                  <ul className="divide-y">
                    {waiting.slice(0, 6).map((alert) => (
                      <li key={alert.alert_id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{alert.message}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {alert.bed_id} · {alertSeverity(alert)}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm whitespace-nowrap text-critical">{formatStopwatch(alert.triggered_at, now)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {waiting.length > 6 && (
                  <div className="border-t px-4 py-2 text-right">
                    <Link to={paths.alerts} className="text-xs font-medium text-primary underline underline-offset-2">
                      View all {waiting.length}
                    </Link>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
