import { useState } from "react";
import { BedDouble } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { KpiStrip } from "@/components/common/KpiStrip";
import { PageHeader } from "@/components/common/PageHeader";
import { SegmentedNav } from "@/components/common/SegmentedNav";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLES } from "@/config/roles";
import { useAuth } from "@/features/auth";
import { countUnvalidatedHours } from "@/features/flowsheet/flowsheet-model";
import { useFlowsheetState } from "@/features/flowsheet/flowsheet-store";
import { useClinicalPaths, useViewTabs, withBed } from "@/features/unit/clinical-paths";
import { ActiveAlertsPanel } from "@/features/unit/components/ActiveAlertsPanel";
import { AssignBedDialog } from "@/features/unit/components/AssignBedDialog";
import { BedCard } from "@/features/unit/components/BedCard";
import { UnitLoadError } from "@/features/unit/components/UnitLoadError";
import { useUnitData } from "@/features/unit/unit-context";
import { useNow } from "@/hooks/useNow";
import { formatClock } from "@/lib/format";

function shiftLabel(now) {
  const hour = new Date(now).getHours();
  return hour >= 8 && hour < 20 ? "Day shift 08:00–20:00" : "Night shift 20:00–08:00";
}

export function UnitBoardPage() {
  const { role } = useAuth();
  const unit = useUnitData();
  const paths = useClinicalPaths();
  const tabs = useViewTabs();
  const records = useFlowsheetState();
  const now = useNow(60_000);
  const [assigning, setAssigning] = useState(null);
  const canAssign = role === ROLES.NURSE;

  const occupied = unit.beds.filter((bed) => bed.occupied);
  const highEws = occupied.filter((bed) => bed.ews != null && bed.ews >= 5).length;
  const facility = unit.hospital?.facility_id;

  return (
    <>
      <PageHeader
        title={facility ? `ICU · ${facility}` : "Unit board"}
        description={[shiftLabel(now), unit.lastSyncedAt && `synced ${formatClock(unit.lastSyncedAt, { seconds: false })}`]
          .filter(Boolean)
          .join(" · ")}
        actions={<SegmentedNav items={tabs} />}
      />

      {unit.status === "error" ? (
        <UnitLoadError error={unit.error} onRetry={unit.reload} />
      ) : (
        <div className="grid gap-4">
          <KpiStrip
            items={[
              { label: "Occupied", value: occupied.length, suffix: `/ ${unit.analytics?.total_beds ?? unit.beds.length}` },
              { label: "Open alerts", value: unit.alerts.length },
              { label: "EWS ≥ 5", value: highEws, tone: highEws > 0 ? "critical" : "default" },
              { label: "On ventilator", value: occupied.filter((bed) => bed.onVentilator).length },
              { label: "Unvalidated hours", value: countUnvalidatedHours(occupied, unit.patients, records, now) },
            ]}
          />

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            {unit.status === "loading" ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={index} className="h-[156px] rounded-lg" />
                ))}
              </div>
            ) : unit.beds.length === 0 ? (
              <EmptyState icon={BedDouble} title="No beds configured" description="Beds appear once the HL7 feed or ADT reports them." className="rounded-lg border bg-card" />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
                {unit.beds.map((bed) => (
                  <BedCard
                    key={bed.id}
                    bed={bed}
                    openHref={withBed(paths.flowsheet, bed.id)}
                    onAssign={canAssign ? setAssigning : undefined}
                  />
                ))}
              </div>
            )}
            <ActiveAlertsPanel viewAllHref={paths.alerts} />
          </div>
        </div>
      )}

      {assigning && (
        <AssignBedDialog
          key={assigning.id}
          bed={assigning}
          onOpenChange={(open) => !open && setAssigning(null)}
          onAssign={unit.assignBed}
        />
      )}
    </>
  );
}
