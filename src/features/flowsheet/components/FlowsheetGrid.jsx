import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/common/Panel";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNow } from "@/hooks/useNow";
import { initials, observationTime } from "@/lib/clinical";
import { formatClock, formatDayTime, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exportFlowsheetCsv } from "../export-csv";
import { COLUMN_COUNT, FLOWSHEET_SECTIONS, INTERVALS, buildMatrix, buildSlots } from "../flowsheet-model";
import { flowsheetStore, useFlowsheetRecord } from "../flowsheet-store";
import { FlowsheetCell } from "./FlowsheetCell";

function latestTime(patient) {
  return Math.max(
    observationTime(patient.vitals.at(-1)) ?? 0,
    observationTime(patient.ventilator.at(-1)) ?? 0,
    observationTime(patient.anesthesia.at(-1)) ?? 0
  ) || null;
}

function rangeLabel(columns) {
  const first = columns[0].start;
  const last = columns.at(-1).start;
  const sameDay = new Date(first).toDateString() === new Date(last).toDateString();
  const time = (ms) => formatClock(ms, { seconds: false });
  return sameDay
    ? `${formatShortDate(first)} · ${time(first)} – ${time(last)}`
    : `${formatShortDate(first)} ${time(first)} – ${formatShortDate(last)} ${time(last)}`;
}

function canValidate(column, readOnly) {
  return !readOnly && column.hasData && !column.validation && !column.isCurrent && !column.isFuture;
}

// Time-by-parameter matrix with nurse validation and manual entry.
// anchor: null = auto (now, or the last data when the bed has gone quiet),
//         "now" = follow the clock, number = fixed window end chosen with the arrows.
export function FlowsheetGrid({ bed, patient, readOnly, author, loadPatientDetail }) {
  const now = useNow(30_000);
  const record = useFlowsheetRecord(bed.mrn);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [anchor, setAnchor] = useState(null);
  const [editing, setEditing] = useState(null); // { slotKey, rowId }
  const [unvalidateKey, setUnvalidateKey] = useState(null);
  const scrollRef = useRef(null);

  const spanMs = COLUMN_COUNT * intervalMinutes * 60_000;
  const lastDataAt = latestTime(patient);
  const autoEnd = lastDataAt && lastDataAt < now - spanMs ? lastDataAt : now;
  const windowEnd = anchor === null ? autoEnd : anchor === "now" ? now : anchor;

  const slots = useMemo(() => buildSlots(windowEnd, intervalMinutes, now), [windowEnd, intervalMinutes, now]);
  const matrix = useMemo(
    () => buildMatrix({ slots, patient, record, sections: FLOWSHEET_SECTIONS }),
    [slots, patient, record]
  );
  const { columns, sections } = matrix;
  const pending = columns.filter((column) => canValidate(column, readOnly));
  const windowHasData = columns.some((column) => column.hasData);

  // Ask the API for the series covering the visible window (rounded to the hour to avoid refetch churn).
  const lookbackMinutes = Math.ceil((now - slots[0].start) / 3_600_000) * 60;
  useEffect(() => {
    loadPatientDetail(bed.mrn, Math.max(lookbackMinutes, 60));
  }, [bed.mrn, lookbackMinutes, loadPatientDetail]);

  // Keep the newest column in view when the window moves (matters on narrow screens).
  const firstSlotStart = slots[0].start;
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [firstSlotStart, intervalMinutes]);

  const shiftWindow = (direction) => {
    const next = windowEnd + direction * spanMs;
    setAnchor(next >= now ? "now" : next);
  };

  const commitEntry = (slotKey, rowId, value) => {
    flowsheetStore.setEntry(bed.mrn, slotKey, rowId, value, author);
    setEditing(null);
  };

  const validate = (keys) => {
    flowsheetStore.validate(bed.mrn, keys, author);
    toast.success(keys.length === 1 ? "Column validated" : `${keys.length} columns validated`);
  };

  const onExport = () => {
    try {
      exportFlowsheetCsv({ bed, matrix, intervalMinutes, exportedBy: author });
      toast.success("Flowsheet exported as CSV");
    } catch {
      toast.error("Could not export the flowsheet");
    }
  };

  return (
    <Panel className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="icon-sm" onClick={() => shiftWindow(-1)} aria-label="Previous window">
            <ChevronLeft />
          </Button>
          <span className="text-center font-mono text-xs sm:min-w-44">{rangeLabel(columns)}</span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => shiftWindow(1)}
            disabled={windowEnd >= now - 60_000}
            aria-label="Next window"
          >
            <ChevronRight />
          </Button>
          <Button variant="outline" size="sm" className="sm:ml-1" onClick={() => setAnchor("now")}>
            Jump to now
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Interval
          <Select
            items={INTERVALS}
            value={intervalMinutes}
            onValueChange={(value) => {
              setIntervalMinutes(value);
              setEditing(null);
            }}
          >
            <SelectTrigger size="sm" className="text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVALS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Legend />

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download /> Export CSV
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={() => validate(pending.map((column) => column.key))} disabled={pending.length === 0}>
              Validate {pending.length} pending
            </Button>
          )}
        </div>
      </div>

      {bed.isLoading && (
        <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2 text-xs text-muted-foreground" role="status">
          <Loader2 className="size-3.5 animate-spin" /> Loading observations…
        </div>
      )}
      {!windowHasData && !bed.isLoading && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
          No observations in this window.
          {lastDataAt ? (
            <>
              Last data {formatDayTime(lastDataAt, { alwaysShowDate: true })}.
              <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => setAnchor(lastDataAt)}>
                Go to last data
              </button>
            </>
          ) : (
            "This bed has not sent any monitor data yet."
          )}
        </div>
      )}

      <div ref={scrollRef} className="max-h-[calc(100svh-19rem)] min-h-64 overflow-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-10 w-48 border-b bg-card px-4 py-2.5 text-left font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Parameter
              </th>
              {columns.map((column, index) => {
                const showDate = index === 0 || new Date(column.start).getHours() + new Date(column.start).getMinutes() === 0;
                return (
                  <th
                    key={column.key}
                    className={cn(
                      "min-w-[72px] border-b border-l bg-card px-1 py-1.5 text-center font-mono text-xs font-normal text-muted-foreground",
                      column.isCurrent && "bg-good-surface font-medium text-good"
                    )}
                  >
                    {showDate && <span className="block text-[10px] leading-none opacity-70">{formatShortDate(column.start)}</span>}
                    {formatClock(column.start, { seconds: false })}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {sections.map((section) => (
              <Fragment key={section.id}>
                <tr>
                  <th
                    colSpan={columns.length + 1}
                    className="border-b bg-muted/60 px-4 py-1.5 text-left font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase"
                  >
                    <span className="sticky left-4">{section.label}</span>
                  </th>
                </tr>
                {section.rows.map((row) => (
                  <tr key={row.id} className="group">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b bg-card px-4 py-1.5 text-left font-medium whitespace-nowrap group-hover:bg-muted"
                    >
                      {row.label}
                      {row.unit && <span className="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">{row.unit}</span>}
                    </th>
                    {row.cells.map((cell, index) => {
                      const column = columns[index];
                      const editable = !readOnly && Boolean(row.entry) && !column.validation && !column.isFuture;
                      const isEditing = editing?.slotKey === cell.slotKey && editing?.rowId === row.id;
                      // Current-column cells are keyed by the latest packet time, so each live
                      // update remounts them and replays the highlight animation.
                      return (
                        <FlowsheetCell
                          key={column.isCurrent ? `${cell.slotKey}-${lastDataAt}` : cell.slotKey}
                          row={row}
                          cell={cell}
                          column={column}
                          editable={editable}
                          isEditing={isEditing}
                          flash={column.isCurrent && cell.source === "monitor"}
                          onEdit={() => setEditing({ slotKey: cell.slotKey, rowId: row.id })}
                          onCommit={(value) => commitEntry(cell.slotKey, row.id, value)}
                          onCancel={() => setEditing(null)}
                        />
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>

          <tfoot className="sticky bottom-0 z-10">
            <tr>
              <th scope="row" className="sticky left-0 z-10 border-t bg-muted px-4 py-2 text-left font-semibold">
                Validated by
              </th>
              {columns.map((column) => (
                <td key={column.key} className="border-t border-l bg-muted px-1 py-1.5 text-center font-mono text-[11px]">
                  <ValidationCell
                    column={column}
                    readOnly={readOnly}
                    onValidate={() => validate([column.key])}
                    onUnvalidate={() => setUnvalidateKey(column.key)}
                  />
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <AlertDialog open={unvalidateKey != null} onOpenChange={(open) => !open && setUnvalidateKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove validation?</AlertDialogTitle>
            <AlertDialogDescription>
              The column goes back to "from monitor, not validated" and its values can be edited again. The removal is not
              logged anywhere else.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep validation</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                flowsheetStore.unvalidate(bed.mrn, unvalidateKey);
                setUnvalidateKey(null);
              }}
            >
              Remove validation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

function ValidationCell({ column, readOnly, onValidate, onUnvalidate }) {
  if (column.validation) {
    const label = `${initials(column.validation.by)} ${formatClock(column.validation.at, { seconds: false })}`;
    const title = `Validated by ${column.validation.by} · ${formatDayTime(column.validation.at, { alwaysShowDate: true })}`;
    return readOnly ? (
      <span className="text-good" title={title}>
        {label}
      </span>
    ) : (
      <button type="button" onClick={onUnvalidate} title={`${title}. Click to remove.`} className="rounded px-1 text-good hover:bg-good-surface">
        {label}
      </button>
    );
  }
  if (column.isCurrent) return <span className="text-muted-foreground">in progress</span>;
  if (canValidate(column, readOnly)) {
    return (
      <Button variant="outline" size="xs" onClick={onValidate} className="border-primary/60 font-sans text-primary hover:bg-good-surface hover:text-primary">
        Validate
      </Button>
    );
  }
  if (readOnly && column.hasData && !column.isFuture) return <span className="text-muted-foreground">pending</span>;
  return <span className="text-muted-foreground/50">–</span>;
}

function Legend() {
  return (
    <div className="hidden items-center gap-2.5 text-[11px] text-muted-foreground lg:flex">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-warning-surface" /> Outside limits
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-critical-surface ring-1 ring-critical/60 ring-inset" /> Critical
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 border-b border-dotted border-muted-foreground" /> From monitor, not validated
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-[#2a78d6]" /> Manual entry
      </span>
    </div>
  );
}
