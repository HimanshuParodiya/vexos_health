import { useState } from "react";
import { Link } from "react-router-dom";
import { BellOff } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClinicalPaths, withBed } from "@/features/unit/clinical-paths";
import { AcknowledgeButton } from "@/features/unit/components/AcknowledgeButton";
import { SeveritySquare } from "@/features/unit/components/ClinicalBadges";
import { UnitLoadError } from "@/features/unit/components/UnitLoadError";
import { useUnitData } from "@/features/unit/unit-context";
import { useNow } from "@/hooks/useNow";
import { alertSeverity } from "@/lib/clinical";
import { formatDayTime, formatStopwatch } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS = ["all", "critical", "high", "medium"];

export function AlertsPage() {
  const unit = useUnitData();
  const paths = useClinicalPaths();
  const now = useNow(1000);
  const [filter, setFilter] = useState("all");

  const counts = Object.fromEntries(
    FILTERS.map((key) => [key, key === "all" ? unit.alerts.length : unit.alerts.filter((alert) => alertSeverity(alert) === key).length])
  );
  const alerts = filter === "all" ? unit.alerts : unit.alerts.filter((alert) => alertSeverity(alert) === filter);
  const nameByBed = Object.fromEntries(unit.beds.map((bed) => [bed.id, bed.name]));

  return (
    <>
      <PageHeader title="Alerts" description="Open alarms from bedside monitors, most severe first. Acknowledging silences the alarm for everyone." />
      {unit.status === "error" ? (
        <UnitLoadError error={unit.error} onRetry={unit.reload} />
      ) : (
        <Panel>
          <PanelHeader
            title="Open alerts"
            meta={`${unit.alerts.length} open · ${unit.acknowledgedCount} ack'd this session`}
            actions={
              <div className="inline-flex rounded-lg border bg-muted p-0.5" role="tablist" aria-label="Filter by severity">
                {FILTERS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={filter === key}
                    onClick={() => setFilter(key)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs capitalize text-muted-foreground",
                      filter === key && "bg-card font-medium text-foreground shadow-xs"
                    )}
                  >
                    {key} <span className="font-mono">{counts[key]}</span>
                  </button>
                ))}
              </div>
            }
          />
          {unit.status === "loading" ? (
            <div className="grid gap-2 p-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-10" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <EmptyState icon={BellOff} title="No open alerts" description="Nothing is waiting for acknowledgement." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-4">Alert</TableHead>
                  <TableHead>Bed</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Triggered</TableHead>
                  <TableHead>Waiting</TableHead>
                  <TableHead className="pr-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => {
                  const severity = alertSeverity(alert);
                  return (
                    <TableRow key={alert.alert_id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2.5">
                          <SeveritySquare severity={severity} />
                          <span className="font-medium">{alert.message}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link to={withBed(paths.flowsheet, alert.bed_id)} className="font-mono text-xs text-primary underline underline-offset-2">
                          {alert.bed_id}
                        </Link>
                        <span className="ml-2 text-xs text-muted-foreground">{nameByBed[alert.bed_id] ?? `MRN ${alert.mrn}`}</span>
                      </TableCell>
                      <TableCell className={cn("text-xs capitalize", severity === "critical" && "font-medium text-critical")}>{severity}</TableCell>
                      <TableCell className="font-mono text-xs">{formatDayTime(alert.triggered_at)}</TableCell>
                      <TableCell className="font-mono text-xs text-critical">{formatStopwatch(alert.triggered_at, now)}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <AcknowledgeButton alert={alert} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Panel>
      )}
    </>
  );
}
