import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EwsBadge, VentBadge } from "@/features/unit/components/ClinicalBadges";
import { assessValue, roundTo } from "@/lib/clinical";
import { formatAgo, formatDayTime, formatLengthOfStay } from "@/lib/format";
import { cn } from "@/lib/utils";

const VITALS = [
  { key: "heartRate", label: "HR", limit: "heartRate" },
  { key: "spo2", label: "SpO₂", limit: "spo2" },
  { key: "map", label: "MAP", limit: "map" },
  { key: "respiratoryRate", label: "RR", limit: "respiratoryRate" },
];

function CardShell({ className, children }) {
  return <article className={cn("flex min-h-[156px] flex-col rounded-lg border bg-card p-3.5", className)}>{children}</article>;
}

function BedId({ id }) {
  return <span className="font-mono text-xs text-muted-foreground">{id}</span>;
}

// One bed on the unit board: identity, EWS/vent badges, latest vitals and a link to its flowsheet.
export function BedCard({ bed, openHref, onAssign }) {
  if (!bed.occupied) {
    return (
      <CardShell className="border-dashed bg-muted/40">
        <BedId id={bed.id} />
        <p className="mt-2 font-semibold">Available</p>
        <p className="font-mono text-xs text-muted-foreground">No patient assigned</p>
        {onAssign && (
          <Button className="mt-auto w-full bg-foreground text-background hover:bg-foreground/85" onClick={() => onAssign(bed)}>
            Assign patient
          </Button>
        )}
      </CardShell>
    );
  }

  const highRisk = bed.ews != null && bed.ews >= 5;
  const subline = [
    bed.gender,
    `MRN ${bed.mrn}`,
    bed.lengthOfStayMs != null ? `LOS ${formatLengthOfStay(bed.lengthOfStayMs, { short: true })}` : null,
  ].filter(Boolean);
  const topAlert = bed.alerts[0];

  return (
    <CardShell className={cn(highRisk && "border-critical/40 shadow-[inset_0_3px_0_var(--critical)]")}>
      <div className="flex items-center justify-between gap-2">
        <BedId id={bed.id} />
        <div className="flex items-center gap-1.5">
          {bed.onVentilator && <VentBadge />}
          <EwsBadge score={bed.ews} />
        </div>
      </div>

      <p className="mt-1.5 flex items-center gap-2 truncate font-semibold">
        {bed.name ?? "Unidentified patient"}
        {!bed.name &&
          (onAssign ? (
            <button
              type="button"
              onClick={() => onAssign(bed)}
              className="rounded bg-warning-surface px-1 font-mono text-[10px] font-medium text-warning hover:underline"
              title="HL7 feed without ADT. Click to link the patient's identity."
            >
              LINK ID
            </button>
          ) : (
            <span
              className="rounded bg-warning-surface px-1 font-mono text-[10px] font-medium text-warning"
              title="HL7 feed without ADT: patient identity not linked"
            >
              NO ADT
            </span>
          ))}
      </p>
      <p className="truncate font-mono text-xs text-muted-foreground">{subline.join(" · ")}</p>

      <div className="mt-3 grid grid-cols-4 gap-2 border-t pt-2.5">
        {VITALS.map((vital) => {
          const value = bed.vitals?.[vital.key];
          const status = assessValue(vital.limit, value);
          return (
            <div key={vital.key} className="min-w-0">
              <p className="text-[10px] text-muted-foreground">{vital.label}</p>
              {bed.isLoading ? (
                <Skeleton className="mt-1 h-5 w-8" />
              ) : (
                <p
                  className={cn(
                    "font-mono text-lg leading-tight",
                    bed.isStale && "text-muted-foreground",
                    !bed.isStale && (status === "outside" || status === "critical") && "text-critical"
                  )}
                >
                  {value == null ? "–" : roundTo(value)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-2.5 text-xs">
        <span
          className={cn("truncate", bed.isStale || topAlert ? "text-warning" : "text-muted-foreground")}
          title={topAlert?.message}
        >
          {bed.isStale
            ? bed.lastDataAt
              ? `Monitor offline · last ${formatDayTime(bed.lastDataAt)}`
              : "No monitor data"
            : topAlert
              ? topAlert.message
              : `Updated ${formatAgo(bed.lastDataAt)}`}
        </span>
        <Link to={openHref} className="shrink-0 font-medium text-primary underline underline-offset-2 hover:text-primary/80">
          Open
        </Link>
      </div>
    </CardShell>
  );
}
