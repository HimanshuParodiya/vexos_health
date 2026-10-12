import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hl7IngestionCard } from "@/features/admin/components/Hl7IngestionCard";
import { SourceConfigCard } from "@/features/admin/components/SourceConfigCard";
import { useHl7SourceConfig, useHl7Stats } from "@/features/admin/hooks/useAdminData";
import { useNow } from "@/hooks/useNow";
import { formatDayTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Hl7IngestionPage() {
  const now = useNow(30_000);
  const hl7 = useHl7Stats();
  const source = useHl7SourceConfig();
  const byBed = Object.entries(hl7.data?.by_bed ?? {}).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  const recent = (hl7.data?.recent ?? []).slice(0, 50);

  return (
    <>
      <PageHeader
        title="HL7 ingestion"
        description="Messages read from the active HL7 source, parsed and broadcast on the live vitals stream."
      />
      <div className="grid gap-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Hl7IngestionCard stats={hl7.data} loading={hl7.isLoading} onSwept={hl7.reload} now={now} />
          <SourceConfigCard config={source.data} loading={source.isLoading} onSaved={source.reload} />
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <Panel>
            <PanelHeader title="By bed" meta={`${byBed.length} beds`} />
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-4">Bed</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Last ingested</TableHead>
                  <TableHead className="pr-4">Last file</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byBed.map(([bedId, row]) => (
                  <TableRow key={bedId}>
                    <TableCell className="pl-4 font-mono text-xs">{bedId}</TableCell>
                    <TableCell className="font-mono text-xs">{formatNumber(row.count)}</TableCell>
                    <TableCell className="font-mono text-xs">{row.pending_count ?? 0}</TableCell>
                    <TableCell className="font-mono text-xs">{formatDayTime(row.last_ingested_at, { alwaysShowDate: true })}</TableCell>
                    <TableCell className="max-w-56 truncate pr-4 font-mono text-[11px] text-muted-foreground" title={row.last_filename}>
                      {row.last_filename}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>

          <Panel>
            <PanelHeader title="Recent messages" meta={`latest ${recent.length}`} />
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-4">Ingested</TableHead>
                  <TableHead>Bed</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((message) => (
                  <TableRow key={`${message.filename}-${message.ingested_at}`}>
                    <TableCell className="pl-4 font-mono text-xs">{formatDayTime(message.ingested_at, { alwaysShowDate: true })}</TableCell>
                    <TableCell className="font-mono text-xs">{message.bed_id ?? "–"}</TableCell>
                    <TableCell className="max-w-56 truncate font-mono text-[11px] text-muted-foreground" title={message.filename}>
                      {message.filename}
                    </TableCell>
                    <TableCell
                      className={cn("pr-4 text-xs font-medium", message.status === "SUCCESS" ? "text-good" : "text-critical")}
                      title={message.error_detail ?? undefined}
                    >
                      {message.status}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </div>
      </div>
    </>
  );
}
