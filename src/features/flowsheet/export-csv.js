import { formatRatio } from "./flowsheet-model";

function csvCell(value) {
  if (value == null) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function stamp(ms) {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Downloads the visible flowsheet window as CSV (UTF-8 with BOM so Excel keeps ₂ and °).
export function exportFlowsheetCsv({ bed, matrix, intervalMinutes, exportedBy }) {
  const { columns, sections } = matrix;
  const lines = [
    ["Patient", bed.name ?? "Unidentified patient"],
    ["MRN", bed.mrn],
    ["Bed", bed.id],
    ["Interval (min)", intervalMinutes],
    ["Exported", stamp(Date.now())],
    ["Exported by", exportedBy],
    [],
    ["Parameter", "Unit", ...columns.map((column) => stamp(column.start))],
  ];

  for (const section of sections) {
    lines.push([section.label.toUpperCase()]);
    for (const row of section.rows) {
      lines.push([
        row.label,
        row.unit ?? "",
        ...row.cells.map((cell) => {
          const value = formatRatio(row, cell.value);
          return cell.source === "manual" && value != null ? `${value} (manual)` : value;
        }),
      ]);
    }
  }

  lines.push([]);
  lines.push([
    "Validated by",
    "",
    ...columns.map((column) =>
      column.validation ? `${column.validation.by} ${stamp(new Date(column.validation.at).getTime())}` : column.hasData ? "Not validated" : ""
    ),
  ]);

  const csv = "﻿" + lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `flowsheet_${bed.id}_${bed.mrn}_${stamp(columns[0].start).replace(" ", "_").replace(":", "")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
