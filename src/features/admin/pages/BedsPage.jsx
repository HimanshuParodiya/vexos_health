import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelHeader } from "@/components/common/Panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssignBedDialog } from "@/features/unit/components/AssignBedDialog";
import { useAsyncData } from "@/hooks/useAsyncData";
import { genderLabel, patientName } from "@/lib/clinical";
import { formatDayTime, formatLengthOfStay, parseHms } from "@/lib/format";
import { vexosApi } from "@/services/vexos-api";

function toBed(raw) {
  const occupied = Boolean(raw.is_occupied && raw.patient?.mrn);
  return {
    id: raw.bed_id,
    occupied,
    mrn: occupied ? raw.patient.mrn : null,
    name: patientName(raw.patient),
    gender: genderLabel(raw.patient?.gender),
    admittedAt: raw.admitted_at,
    lengthOfStayMs: parseHms(raw.length_of_stay),
    deviceVendor: raw.device_vendor,
  };
}

function BedHistoryDialog({ bed, onClose }) {
  const { data, isLoading, error } = useAsyncData(() => vexosApi.getBedHistory(bed.id, 50), bed.id);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Admission history · {bed.id}</DialogTitle>
          <DialogDescription>Most recent first. Open admissions show a live length of stay.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : error ? (
          <p className="text-sm text-critical">{error.message}</p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No admissions recorded for this bed.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Patient</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead>Admitted</TableHead>
                <TableHead>Discharged</TableHead>
                <TableHead>LOS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={`${row.mrn}-${row.admitted_at}`}>
                  <TableCell>{patientName(row) ?? "Unidentified"}</TableCell>
                  <TableCell className="font-mono text-xs">{row.mrn}</TableCell>
                  <TableCell className="font-mono text-xs">{formatDayTime(row.admitted_at, { alwaysShowDate: true })}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.discharged_at ? formatDayTime(row.discharged_at, { alwaysShowDate: true }) : <span className="text-good">open</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{formatLengthOfStay(parseHms(row.length_of_stay))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Physical beds: who is on them, admission history, manual discharge and assignment.
export function BedsPage() {
  const { data, isLoading, error, reload } = useAsyncData(() => vexosApi.getBeds(), "admin-beds");
  const [historyBed, setHistoryBed] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [discharging, setDischarging] = useState(null);
  const [pending, setPending] = useState(false);
  const beds = (Array.isArray(data) ? data : []).map(toBed).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const discharge = async () => {
    setPending(true);
    try {
      await vexosApi.dischargeBed(discharging.id);
      toast.success(`${discharging.id} released`);
      setDischarging(null);
      reload();
    } catch (err) {
      toast.error(err.message || "Could not discharge");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <PageHeader title="Beds" description="Beds known to the platform from ADT and HL7 feeds." />
      <Panel>
        <PanelHeader title="All beds" meta={`${beds.filter((bed) => bed.occupied).length} / ${beds.length} occupied`} />
        {isLoading ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-10" />
            ))}
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-critical">Could not load beds: {error.message}</p>
        ) : beds.length === 0 ? (
          <EmptyState title="No beds reported yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="pl-4">Bed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Admitted</TableHead>
                <TableHead>LOS</TableHead>
                <TableHead>Device</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {beds.map((bed) => (
                <TableRow key={bed.id}>
                  <TableCell className="pl-4 font-mono text-xs">{bed.id}</TableCell>
                  <TableCell>
                    <span className={bed.occupied ? "rounded bg-good-surface px-1.5 py-0.5 text-[11px] font-medium text-good" : "rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"}>
                      {bed.occupied ? "Occupied" : "Available"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {bed.occupied ? (
                      <>
                        <span className="font-medium">{bed.name ?? "Unidentified patient"}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">MRN {bed.mrn}</span>
                      </>
                    ) : (
                      "–"
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{bed.occupied ? formatDayTime(bed.admittedAt, { alwaysShowDate: true }) : "–"}</TableCell>
                  <TableCell className="font-mono text-xs">{bed.occupied ? formatLengthOfStay(bed.lengthOfStayMs) : "–"}</TableCell>
                  <TableCell className="font-mono text-xs">{bed.deviceVendor ?? "–"}</TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => setHistoryBed(bed)}>
                        History
                      </Button>
                      {bed.occupied ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-critical/40 text-critical hover:bg-critical-surface hover:text-critical"
                          onClick={() => setDischarging(bed)}
                        >
                          Discharge
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setAssigning(bed)}>
                          Assign
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {historyBed && <BedHistoryDialog bed={historyBed} onClose={() => setHistoryBed(null)} />}

      {assigning && (
        <AssignBedDialog
          key={assigning.id}
          bed={assigning}
          onOpenChange={(open) => !open && setAssigning(null)}
          onAssign={async (bedId, payload) => {
            await vexosApi.assignBed(bedId, payload);
            reload();
          }}
        />
      )}

      <AlertDialog open={discharging != null} onOpenChange={(open) => !open && setDischarging(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discharge {discharging?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Releases the bed for MRN {discharging?.mrn} and clears its unacknowledged alerts. Use this when an ADT
              discharge was not received.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discharge} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Discharge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
