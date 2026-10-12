import { Link } from "react-router-dom";
import { BellOff } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { AcknowledgeButton } from "@/features/unit/components/AcknowledgeButton";
import { SeveritySquare } from "@/features/unit/components/ClinicalBadges";
import { useUnitData } from "@/features/unit/unit-context";
import { useNow } from "@/hooks/useNow";
import { alertSeverity } from "@/lib/clinical";
import { formatElapsed } from "@/lib/format";

// Right-hand rail of the unit board: open alarms, most severe first.
export function ActiveAlertsPanel({ limit = 8, viewAllHref }) {
  const { alerts, acknowledgedCount } = useUnitData();
  const now = useNow(30_000);
  const visible = alerts.slice(0, limit);

  return (
    <Panel>
      <PanelHeader title="Active alerts" meta={`${alerts.length} open · ${acknowledgedCount} ack'd`} />
      {alerts.length === 0 ? (
        <EmptyState icon={BellOff} title="No open alerts" description="New alarms from bedside monitors appear here." />
      ) : (
        <ul className="divide-y">
          {visible.map((alert) => {
            const severity = alertSeverity(alert);
            return (
              <li key={alert.alert_id} className="flex items-start gap-2.5 px-4 py-3">
                <SeveritySquare severity={severity} className="mt-1.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug font-semibold">{alert.message}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {alert.bed_id} · {severity} · {formatElapsed(alert.triggered_at, now)}
                  </p>
                </div>
                <AcknowledgeButton alert={alert} className="h-7 px-2 text-xs" />
              </li>
            );
          })}
        </ul>
      )}
      {alerts.length > limit && viewAllHref && (
        <div className="border-t px-4 py-2.5 text-right">
          <Link to={viewAllHref} className="text-xs font-medium text-primary underline underline-offset-2">
            View all {alerts.length} alerts
          </Link>
        </div>
      )}
    </Panel>
  );
}
