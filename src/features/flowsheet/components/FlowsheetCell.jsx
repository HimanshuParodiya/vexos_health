import { useRef, useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDayTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatRatio } from "../flowsheet-model";

const CLEAR_VALUE = "__clear__";

const STATUS_CLASS = {
  outside: "bg-warning-surface font-semibold text-warning",
  critical: "bg-critical-surface font-semibold text-critical ring-1 ring-critical/60 ring-inset",
};

// One flowsheet value. Editable cells open an inline editor; Enter/blur saves, Esc cancels.
// Saving an empty value (or the monitor's own value) removes the manual entry.
export function FlowsheetCell({ row, cell, column, editable, isEditing, onEdit, onCommit, onCancel, flash }) {
  const display = formatRatio(row, cell.value);
  const unvalidatedMonitor = cell.source === "monitor" && !column.validation;

  if (isEditing) {
    return (
      <td className="h-9 border-l px-1 text-center">
        {row.entry === "select" ? (
          <SelectEditor row={row} value={cell.value} onCommit={onCommit} onCancel={onCancel} />
        ) : (
          <InputEditor row={row} cell={cell} onCommit={onCommit} onCancel={onCancel} />
        )}
      </td>
    );
  }

  const title = cell.entry
    ? `Entered by ${cell.entry.by} · ${formatDayTime(cell.entry.at, { alwaysShowDate: true })}${cell.monitor != null ? ` · monitor: ${formatRatio(row, cell.monitor)}` : ""}`
    : unvalidatedMonitor
      ? "From monitor, not validated"
      : undefined;

  const content = (
    <span
      className={cn(
        "relative inline-block",
        unvalidatedMonitor && "underline decoration-muted-foreground/60 decoration-dotted underline-offset-4"
      )}
    >
      {display ?? (column.hasData || cell.entry ? "·" : "")}
      {cell.source === "manual" && (
        <span className="absolute -top-0.5 -right-1.5 size-1.5 rounded-full bg-[#2a78d6]" aria-label="manual entry" />
      )}
    </span>
  );

  return (
    <td
      className={cn(
        "h-9 border-l px-1 text-center font-mono text-[13px] whitespace-nowrap",
        column.isCurrent && "bg-muted/60",
        STATUS_CLASS[cell.status],
        flash && "animate-[cell-flash_1.6s_ease-out]"
      )}
      title={title}
    >
      {editable ? (
        <button
          type="button"
          onClick={onEdit}
          className="h-full w-full min-w-12 cursor-text rounded-sm px-1 hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={`${row.label} at ${new Date(column.start).toLocaleTimeString()}: ${display ?? "empty"}. Edit`}
        >
          {content}
        </button>
      ) : (
        content
      )}
    </td>
  );
}

function InputEditor({ row, cell, onCommit, onCancel }) {
  const [draft, setDraft] = useState(cell.value == null ? "" : String(cell.value));
  // Enter/Escape unmount the input, which can fire a trailing blur; act only once.
  const doneRef = useRef(false);

  const cancel = () => {
    doneRef.current = true;
    onCancel();
  };

  const commit = () => {
    if (doneRef.current) return;
    const text = draft.trim();
    if (row.entry === "number" && text !== "") {
      const number = Number(text);
      if (Number.isNaN(number)) {
        toast.error(`${row.label}: enter a number`);
        return;
      }
      doneRef.current = true;
      onCommit(number === cell.monitor ? "" : number);
      return;
    }
    doneRef.current = true;
    onCommit(text);
  };

  return (
    <input
      autoFocus
      inputMode={row.entry === "number" ? "decimal" : "text"}
      value={draft}
      placeholder={row.placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.target.select()}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        if (event.key === "Escape") cancel();
      }}
      aria-label={`${row.label} value`}
      className="h-7 w-full min-w-14 rounded border border-ring bg-background px-1 text-center font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    />
  );
}

function SelectEditor({ row, value, onCommit, onCancel }) {
  const items = [...row.options.map((option) => ({ value: option, label: option })), { value: CLEAR_VALUE, label: "Clear" }];
  return (
    <Select
      items={items}
      defaultOpen
      value={value ?? null}
      onValueChange={(next) => onCommit(next === CLEAR_VALUE ? "" : next)}
      onOpenChange={(open) => !open && onCancel()}
    >
      <SelectTrigger size="sm" className="h-7 w-full min-w-16 px-1.5 font-mono text-xs" aria-label={`${row.label} value`}>
        <SelectValue placeholder="–" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className={item.value === CLEAR_VALUE ? "text-muted-foreground" : "font-mono"}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
