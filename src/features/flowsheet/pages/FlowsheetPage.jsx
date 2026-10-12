import { Link, useSearchParams } from "react-router-dom";
import { BedDouble } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { SegmentedNav } from "@/components/common/SegmentedNav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth";
import { useClinicalPaths, useViewTabs, withBed } from "@/features/unit/clinical-paths";
import { UnitLoadError } from "@/features/unit/components/UnitLoadError";
import { useUnitData } from "@/features/unit/unit-context";
import { formatLengthOfStay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FlowsheetGrid } from "../components/FlowsheetGrid";
import { useFlowsheetRecord } from "../flowsheet-store";

const EMPTY_PATIENT = { vitals: [], ventilator: [], anesthesia: [] };

// Most recent manually charted ventilator mode, if any.
function latestVentMode(record) {
  const slots = Object.entries(record.entries)
    .filter(([, entries]) => entries.ventMode)
    .sort(([a], [b]) => Number(b.split("@")[1]) - Number(a.split("@")[1]));
  return slots[0]?.[1].ventMode.value ?? null;
}

function Field({ label, children, className }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-sm", className)}>{children}</span>
    </div>
  );
}

// Hourly charting for one bed. Nurses validate and enter values; doctors open it read-only.
export function FlowsheetPage({ readOnly = false }) {
  const { user } = useAuth();
  const unit = useUnitData();
  const paths = useClinicalPaths();
  const [params, setParams] = useSearchParams();

  const occupied = unit.beds.filter((bed) => bed.occupied);
  const bed = occupied.find((item) => item.id === params.get("bed")) ?? occupied[0] ?? null;
  const tabs = useViewTabs(bed?.id);
  const record = useFlowsheetRecord(bed?.mrn);
  const ventMode = latestVentMode(record);

  const header = (
    <PageHeader
      title={readOnly ? "Patient chart" : "Flowsheet"}
      actions={<SegmentedNav items={tabs} />}
    />
  );

  if (unit.status === "error") {
    return (
      <>
        {header}
        <UnitLoadError error={unit.error} onRetry={unit.reload} />
      </>
    );
  }

  if (unit.status === "loading") {
    return (
      <>
        {header}
        <div className="grid gap-4">
          <Skeleton className="h-[72px] rounded-lg" />
          <Skeleton className="h-[480px] rounded-lg" />
        </div>
      </>
    );
  }

  if (!bed) {
    return (
      <>
        {header}
        <EmptyState icon={BedDouble} title="No occupied beds" description="The flowsheet opens once a patient is on the unit." className="rounded-lg border bg-card" />
      </>
    );
  }

  const bedItems = occupied.map((item) => ({ value: item.id, label: item.id }));

  return (
    <>
      {header}
      <div className="grid gap-4">
        <Panel className="flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3">
          <div className="grid gap-0.5">
            <span className="text-[11px] text-muted-foreground">Bed</span>
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
          </div>

          <div className="grid gap-0.5">
            <span className="font-semibold">{bed.name ?? "Unidentified patient"}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {[bed.gender, `MRN ${bed.mrn}`].filter(Boolean).join(" · ")}
            </span>
          </div>

          <Field label="LOS">{formatLengthOfStay(bed.lengthOfStayMs)}</Field>
          <Field label="EWS" className={cn("font-semibold", bed.ews >= 5 ? "text-critical" : bed.ews >= 3 && "text-warning")}>
            {bed.ews ?? "–"}
          </Field>
          <Field label="Ventilator">{ventMode ?? (bed.onVentilator ? "On" : "Off")}</Field>
          {bed.deviceVendor && <Field label="Device">{bed.deviceVendor}</Field>}
          {bed.alerts.length > 0 && (
            <Field label="Open alerts" className="text-critical">
              {bed.alerts.length}
            </Field>
          )}

          <Link to={withBed(paths.trends, bed.id)} className="ml-auto text-sm font-medium text-primary underline underline-offset-2">
            Vitals trends →
          </Link>
        </Panel>

        <FlowsheetGrid
          key={bed.mrn}
          bed={bed}
          patient={unit.patients[bed.mrn] ?? EMPTY_PATIENT}
          readOnly={readOnly}
          author={user?.fullName ?? user?.username ?? "Unknown user"}
          loadPatientDetail={unit.loadPatientDetail}
        />
      </div>
    </>
  );
}
