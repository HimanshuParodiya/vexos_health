import { useState, useMemo, useRef, useEffect } from "react";
import {
  Activity,
  Check,
  Edit2,
  FileSpreadsheet,
  Info,
  Maximize2,
  Minimize2,
  Pill,
  RotateCcw,
  Settings,
  Stethoscope,
  Syringe,
  Video,
  Wind,
} from "lucide-react";
import { toast } from "sonner";
import { useVitalsWebSocket } from "../hooks/useVitalsWebSocket";
import { vexosApi } from "@/services/vexos-api";
import { cn } from "@/lib/utils";
import { DEFAULT_ORGANIZATION } from "@/config/organization";
import { useAuth } from "@/features/auth";

const HOUR_MS = 3600 * 1000;

// 24 hourly columns ending at the hour that contains `endTime`.
function generateTimelineSlots(endTime) {
  const slots = [];
  const end = new Date(endTime);
  end.setMinutes(0, 0, 0);
  const start = new Date(end.getTime() - 23 * HOUR_MS);

  for (let i = 0; i < 24; i++) {
    const d = new Date(start.getTime() + i * HOUR_MS);
    const dateStr = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:00`;
    slots.push({
      key: `${dateStr}_${timeStr}`,
      dateStr,
      timeStr,
      timestamp: d.getTime(),
      isLatest: i === 23,
    });
  }
  return slots;
}

const HEART_RHYTHMS = [
  "NSR",
  "Sinus Tach",
  "Sinus Brady",
  "AFib",
  "A-Flutter",
  "Paced",
];

// First non-null value among the given keys; backends name some parameters differently.
function pick(obs, ...keys) {
  if (!obs) return null;
  for (const key of keys) {
    if (obs[key] != null && obs[key] !== "") return Number(obs[key]);
  }
  return null;
}

function round(value, digits = 0) {
  if (value == null || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function meanPressure(sys, dia) {
  return sys != null && dia != null ? (sys + 2 * dia) / 3 : null;
}

function observationTime(obs) {
  const raw = obs?.timestamp ?? obs?.observed_at ?? obs?.time;
  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(time) ? null : time;
}

export function ClinicalFlowsheet({ beds = [], currentBed, onSelectBed }) {
  const { user } = useAuth();
  const [selectedBedId, setSelectedBedId] = useState(
    currentBed?.bed_id || beds[0]?.bed_id || "",
  );
  const [now, setNow] = useState(() => Date.now());
  const [filterDate, setFilterDate] = useState(() =>
    new Date().toLocaleString(),
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [approvedSlots, setApprovedSlots] = useState({});
  const [rhythms, setRhythms] = useState({});
  const [liveHighlight, setLiveHighlight] = useState(false);
  const [activeTab, setActiveTab] = useState("MONITOR"); // MONITOR or VENTILATOR

  const containerRef = useRef(null);
  const scrollWrapperRef = useRef(null);

  // Active bed data
  const bed = beds.find((b) => b.bed_id === selectedBedId) || beds[0] || null;

  const patientMrn = bed?.patient?.mrn || null;
  const [historicalVitals, setHistoricalVitals] = useState([]);
  const [ventilatorData, setVentilatorData] = useState(null);
  const [loadingPatientData, setLoadingPatientData] = useState(false);

  // Move the 24-hour window forward as the clock passes each hour.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch telemetry whenever active bed changes
  useEffect(() => {
    let cancelled = false;
    async function fetchBedData() {
      // Never show the previous patient's readings under the new bed.
      setHistoricalVitals([]);
      setVentilatorData(null);
      if (!patientMrn) return;
      setLoadingPatientData(true);
      try {
        const [vitalsRes, ventRes] = await Promise.allSettled([
          vexosApi.getPatientVitals(patientMrn, 1440),
          vexosApi.getPatientVentilator(patientMrn),
        ]);
        if (!cancelled) {
          if (
            vitalsRes.status === "fulfilled" &&
            Array.isArray(vitalsRes.value)
          ) {
            setHistoricalVitals(vitalsRes.value);
          } else if (vitalsRes.status === "rejected") {
            toast.error(`Could not load vitals for ${patientMrn}`);
          }
          if (ventRes.status === "fulfilled" && ventRes.value) {
            setVentilatorData(ventRes.value);
          }
        }
      } catch {
        // keep current data
      } finally {
        if (!cancelled) setLoadingPatientData(false);
      }
    }
    fetchBedData();
    return () => {
      cancelled = true;
    };
  }, [patientMrn]);

  // WebSocket Live Streaming Hook
  const { isConnected, isConnecting, reconnect, lastMessageAt } =
    useVitalsWebSocket({
      onVitalUpdate: (liveVital) => {
        if (!liveVital) return;
        if (
          (selectedBedId && liveVital.bed_id === selectedBedId) ||
          (patientMrn && liveVital.mrn === patientMrn)
        ) {
          setHistoricalVitals((prev) => [...prev, liveVital]);
          setLiveHighlight(true);
          setTimeout(() => setLiveHighlight(false), 2000);
        }
      },
    });

  const timeSlots = useMemo(() => generateTimelineSlots(now), [now]);

  // Each hourly column shows the latest real observation recorded in that hour; empty hours stay blank.
  const matrixData = useMemo(() => {
    const vitalsBySlot = new Map();
    for (const obs of historicalVitals) {
      const time = observationTime(obs);
      if (time == null) continue;
      const slot = timeSlots.find(
        (s) => time >= s.timestamp && time < s.timestamp + HOUR_MS,
      );
      if (!slot) continue;
      const current = vitalsBySlot.get(slot.key);
      if (!current || observationTime(current) <= time)
        vitalsBySlot.set(slot.key, obs);
    }

    // The ventilator endpoint returns only the most recent reading.
    const ventTime = observationTime(ventilatorData);
    const ventSlotKey = ventilatorData
      ? ventTime == null
        ? timeSlots.at(-1).key
        : timeSlots.find(
            (s) => ventTime >= s.timestamp && ventTime < s.timestamp + HOUR_MS,
          )?.key
      : null;

    return timeSlots.map((slot) => {
      const obs = vitalsBySlot.get(slot.key);
      const vent = slot.key === ventSlotKey ? ventilatorData : null;

      const sysArtery = pick(obs, "arterial_systolic_bp", "systolic_bp");
      const diaArtery = pick(obs, "arterial_diastolic_bp", "diastolic_bp");
      const sysNi = pick(obs, "nbp_systolic_bp");
      const diaNi = pick(obs, "nbp_diastolic_bp");

      return {
        ...slot,
        cvp: round(pick(obs, "cvp")),
        pulse: round(pick(obs, "heart_rate", "pulse_rate")),
        heartRhythm: rhythms[slot.key] || "",
        meanArtery: round(
          pick(obs, "arterial_mean_bp", "mean_arterial_pressure") ??
            meanPressure(sysArtery, diaArtery),
        ),
        sysArtery: round(sysArtery),
        diaArtery: round(diaArtery),
        meanNi: round(pick(obs, "nbp_mean_bp") ?? meanPressure(sysNi, diaNi)),
        sysNi: round(sysNi),
        diaNi: round(diaNi),
        temperature: round(pick(obs, "temperature"), 1),
        resp: round(pick(obs, "respiratory_rate")),
        pa: round(pick(obs, "pa_mean_bp", "pulmonary_artery_pressure")),
        endTidal: round(pick(obs, "etco2", "end_tidal_co2")),
        perf: round(pick(obs, "perfusion_index", "perf"), 1),
        leftAtriumPressure: round(pick(obs, "lap", "left_atrium_pressure")),
        spo2: round(pick(obs, "spo2")),
        gcs: round(pick(obs, "gcs")),
        isApproved: approvedSlots[slot.key] || false,
        validationDate: approvedSlots[slot.key] ? slot.timeStr : "",
        // Ventilator
        oxygen: round(pick(vent, "oxygen"), 2),
        fio2: round(pick(vent, "fio2")),
        tidalVolume: round(pick(vent, "tidal_volume", "tidalvolume")),
        vte: round(pick(vent, "vte")),
        vti: round(pick(vent, "vti")),
        vtiSetting: round(pick(vent, "vti_setting")),
      };
    });
  }, [timeSlots, historicalVitals, ventilatorData, rhythms, approvedSlots]);

  const handleApprove = (slotKey) => {
    setApprovedSlots((prev) => {
      const next = !prev[slotKey];
      toast.success(
        next
          ? `Observation at ${slotKey.split("_")[1]} Approved`
          : "Approval Removed",
      );
      return { ...prev, [slotKey]: next };
    });
  };

  const scrollToLatest = () => {
    if (scrollWrapperRef.current) {
      scrollWrapperRef.current.scrollTo({
        left: scrollWrapperRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  };

  const handleExportCsv = () => {
    try {
      const headers = [
        "Metric",
        ...matrixData.map((d) => `${d.dateStr} ${d.timeStr}`),
      ];
      const rows = [
        ["CVP", ...matrixData.map((d) => d.cvp)],
        ["Pulse", ...matrixData.map((d) => d.pulse)],
        ["Heart Rhythm", ...matrixData.map((d) => d.heartRhythm)],
        ["Mean AP (Artery)", ...matrixData.map((d) => d.meanArtery)],
        ["Systolic (Artery)", ...matrixData.map((d) => d.sysArtery)],
        ["Diastolic (Artery)", ...matrixData.map((d) => d.diaArtery)],
        ["Temperature", ...matrixData.map((d) => d.temperature)],
        ["RESP", ...matrixData.map((d) => d.resp)],
        ["SPO2", ...matrixData.map((d) => d.spo2)],
        ["GCS", ...matrixData.map((d) => d.gcs)],
        ["OXYGEN", ...matrixData.map((d) => d.oxygen)],
        ["FIO2", ...matrixData.map((d) => d.fio2)],
        ["TIDALVOLUME", ...matrixData.map((d) => d.tidalVolume)],
        ["VTE", ...matrixData.map((d) => d.vte)],
        ["VTI", ...matrixData.map((d) => d.vti)],
        ["VTI SETTING", ...matrixData.map((d) => d.vtiSetting)],
      ];

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `VEXOS_Flowsheet_${selectedBedId}_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Flowsheet CSV exported successfully");
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  // Group columns by date header
  const dateGroups = useMemo(() => {
    const groups = [];
    matrixData.forEach((col) => {
      const lastGroup = groups.at(-1);
      if (lastGroup && lastGroup.dateStr === col.dateStr) {
        lastGroup.count += 1;
      } else {
        groups.push({ dateStr: col.dateStr, count: 1 });
      }
    });
    return groups;
  }, [matrixData]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all",
        isFullscreen
          ? "fixed inset-0 z-50 h-screen rounded-none"
          : "h-[calc(100vh-187px)]",
      )}
    >
      {/* 1. CLINICAL CONTEXT & PATIENT BANNER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-base font-semibold tracking-tight">
            Data Validation & Entry
          </h1>

          {/* Quick Clinical Tool Icons */}
          <div className="hidden items-center gap-1 rounded-lg border bg-muted/50 p-1 sm:flex">
            <button type="button" title="PACS" className={ICON_BUTTON}>
              <Video className="size-4" />
            </button>
            <span className="px-1 text-[10px] font-semibold text-muted-foreground">
              PACS
            </span>
            <button type="button" title="ECG Waveform" className={ICON_BUTTON}>
              <Activity className="size-4" />
            </button>
            <button type="button" title="Stethoscope" className={ICON_BUTTON}>
              <Stethoscope className="size-4" />
            </button>
            <button type="button" title="Medications" className={ICON_BUTTON}>
              <Pill className="size-4" />
            </button>
            <button
              type="button"
              title="Infusion/Syringe"
              className={ICON_BUTTON}
            >
              <Syringe className="size-4" />
            </button>
          </div>
        </div>

        {/* Center Patient Banner */}
        <div className="flex max-w-2xl flex-1 items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Bed Switcher Dropdown */}
            <div className="relative flex items-center">
              <select
                aria-label="Select ICU Bed"
                value={selectedBedId}
                onChange={(e) => {
                  setSelectedBedId(e.target.value);
                  onSelectBed?.(e.target.value);
                }}
                className="cursor-pointer rounded-md border border-input bg-background px-2 py-0.5 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {beds.map((b) => (
                  <option key={b.bed_id} value={b.bed_id}>
                    {b.bed_id} {b.patient?.name ? `(${b.patient.name})` : ""}
                  </option>
                ))}
              </select>
              {loadingPatientData && (
                <span className="ml-1 size-2 animate-spin rounded-full border border-primary border-t-transparent" />
              )}
            </div>

            {bed ? (
              <>
                <div className="truncate font-semibold text-foreground">
                  {bed.patient?.name || "Unknown patient"}
                  {bed.age != null && `, ${bed.age}y`}
                </div>
                <span>
                  MRN:{" "}
                  <strong className="font-medium text-foreground">
                    {bed.patient?.mrn || "—"}
                  </strong>
                </span>
                {bed.patient?.gender && bed.patient.gender !== "U" && (
                  <span>{bed.patient.gender}</span>
                )}
                <span>
                  Bed:{" "}
                  <strong className="font-medium text-foreground">
                    {bed.bed_id}
                  </strong>
                </span>
                <span>
                  LOS:{" "}
                  <strong className="font-medium text-foreground">
                    {bed.length_of_stay || "—"}
                  </strong>
                </span>
              </>
            ) : (
              <span>No beds available</span>
            )}
          </div>

          <button
            type="button"
            title="Edit Clinical Notes"
            className="p-1 hover:text-foreground"
          >
            <Edit2 className="size-3.5" />
          </button>
        </div>

        {/* Right Tools & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Toggle Ventilator Section"
            onClick={() =>
              setActiveTab((prev) =>
                prev === "VENTILATOR" ? "MONITOR" : "VENTILATOR",
              )
            }
            className={cn(
              "rounded-md border p-1.5 transition-colors",
              activeTab === "VENTILATOR"
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Wind className="size-4" />
          </button>
          <button
            type="button"
            title="Fullscreen"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-md border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {isFullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
        </div>
      </div>

      {/* 2. TOOLBAR: DATE FILTER, LIVE INDICATOR, BACK TO NOW, EXPORT CSV */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-medium text-muted-foreground">
            Filter by Date:
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              aria-label="Filter by Date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-44 rounded-md border border-input bg-background px-2.5 py-1 text-xs tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <button
              type="button"
              onClick={scrollToLatest}
              className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            >
              <RotateCcw className="size-3.5" />
              Back to Now
            </button>
            <Info className="size-4 cursor-pointer text-muted-foreground hover:text-foreground" />
          </div>
        </div>

        {/* Live WebSocket Status & CSV Export */}
        <div className="flex items-center gap-3">
          {/* Live Telemetry Beacon */}
          <div
            title={
              lastMessageAt
                ? `Last packet: ${new Date(lastMessageAt).toLocaleTimeString()}`
                : "Listening for telemetry..."
            }
            className={cn(
              "flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium",
              isConnected
                ? "bg-status-good/10 text-status-good"
                : isConnecting
                  ? "bg-status-warning/15 text-amber-700 dark:text-status-warning"
                  : "bg-status-critical/10 text-status-critical",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                isConnected
                  ? "animate-ping bg-status-good"
                  : isConnecting
                    ? "bg-status-warning"
                    : "bg-status-critical",
              )}
            />
            <span className="tracking-tight">
              {isConnected
                ? "LIVE TELEMETRY STREAM"
                : isConnecting
                  ? "Connecting Live Stream…"
                  : "Offline / Click Reconnect"}
            </span>
            {!isConnected && (
              <button
                type="button"
                onClick={reconnect}
                className="ml-1 cursor-pointer font-semibold hover:underline"
              >
                Reconnect
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-md border bg-background px-3 py-1 font-medium shadow-xs transition-colors hover:bg-accent"
          >
            <FileSpreadsheet className="size-3.5 text-status-good" />
            Export as CSV
          </button>

          <button
            type="button"
            className="p-1 text-muted-foreground hover:text-foreground"
            title="Table Settings"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </div>

      {/* 3. CLINICAL FLOWSHEET MATRIX GRID */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Vertical Section Rail */}
        <div className="flex w-8 shrink-0 select-none flex-col items-center justify-between border-r bg-muted/40 py-4">
          <span className="rotate-180 text-[10px] font-semibold uppercase tracking-widest text-primary [writing-mode:vertical-rl]">
            ◀ MONITOR ▶
          </span>
          <span className="rotate-180 text-[9px] font-medium uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl]">
            Patient Details
          </span>
        </div>

        {/* Scrollable Matrix Table Container */}
        <div
          ref={scrollWrapperRef}
          className="no-scrollbar relative w-0 min-w-0 max-w-full min-h-0 flex-1 overflow-x-auto overflow-y-auto"
        >
          <table className="w-full min-w-max select-none border-collapse text-xs">
            {/* Header Dates Row */}
            <thead>
              <tr className="sticky top-0 z-20 border-b bg-muted font-medium text-muted-foreground">
                <th className="sticky left-0 z-30 w-44 border-r bg-muted px-3 py-1.5 text-left font-semibold text-foreground">
                  TYPES
                </th>
                {dateGroups.map((group) => (
                  <th
                    key={group.dateStr}
                    colSpan={group.count}
                    className="border-r border-b py-1 text-center text-[11px] font-medium tabular-nums tracking-wider text-foreground"
                  >
                    {group.dateStr}
                  </th>
                ))}
              </tr>

              {/* Time Slots Row */}
              <tr className="sticky top-7 z-20 border-b bg-card text-[11px] tabular-nums text-muted-foreground">
                <th className="sticky left-0 z-30 border-r bg-card px-3 py-1 text-left text-[10px] font-medium uppercase">
                  Hourly Observation
                </th>
                {matrixData.map((slot) => (
                  <th
                    key={slot.key}
                    className={cn(
                      "min-w-[72px] border-r px-1 py-1.5 text-center font-medium",
                      slot.isLatest &&
                        "bg-primary/10 font-semibold text-primary",
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span>{slot.timeStr}</span>
                      {slot.isLatest && (
                        <span className="mt-0.5 inline-block animate-pulse rounded bg-primary px-1.5 text-[9px] font-semibold uppercase tracking-wider text-primary-foreground">
                          New
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* MONITOR SECTION ROWS */}
            <tbody className="divide-y text-[11px] tabular-nums">
              {/* CVP */}
              <FlowsheetRow
                label="CVP"
                data={matrixData}
                field="cvp"
                isLatestPulse={liveHighlight}
              />

              {/* Pulse */}
              <FlowsheetRow
                label="Pulse"
                data={matrixData}
                field="pulse"
                highlightBold
                isLatestPulse={liveHighlight}
              />

              {/* Heart Rhythm */}
              <tr className={ROW}>
                <td className={LABEL_CELL}>Heart Rhythm</td>
                {matrixData.map((slot) => (
                  <td key={slot.key} className="border-r px-1 py-1 text-center">
                    <select
                      aria-label="Heart Rhythm"
                      value={slot.heartRhythm}
                      onChange={(e) =>
                        setRhythms((prev) => ({
                          ...prev,
                          [slot.key]: e.target.value,
                        }))
                      }
                      className="w-14 cursor-pointer rounded border-none bg-transparent text-center text-[10px] outline-none focus:bg-background"
                    >
                      <option
                        value=""
                        className="bg-popover text-popover-foreground"
                      >
                        —
                      </option>
                      {HEART_RHYTHMS.map((r) => (
                        <option
                          key={r}
                          value={r}
                          className="bg-popover text-popover-foreground"
                        >
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>

              {/* Mean AP (Artery) */}
              <FlowsheetRow
                label="Mean AP (Artery)"
                data={matrixData}
                field="meanArtery"
                isLatestPulse={liveHighlight}
              />

              {/* Systolic (Artery) */}
              <FlowsheetRow
                label="Systolic (Artery)"
                data={matrixData}
                field="sysArtery"
                isLatestPulse={liveHighlight}
              />

              {/* Diastolic (Artery) */}
              <FlowsheetRow
                label="Diastolic (Artery)"
                data={matrixData}
                field="diaArtery"
                isLatestPulse={liveHighlight}
              />

              {/* Mean AP (NI) */}
              <FlowsheetRow
                label="Mean AP (NI)"
                data={matrixData}
                field="meanNi"
                muted
                isLatestPulse={liveHighlight}
              />

              {/* Systolic (NI) */}
              <FlowsheetRow
                label="Systolic (NI)"
                data={matrixData}
                field="sysNi"
                muted
                isLatestPulse={liveHighlight}
              />

              {/* Diastolic (NI) */}
              <FlowsheetRow
                label="Diastolic (NI)"
                data={matrixData}
                field="diaNi"
                muted
                isLatestPulse={liveHighlight}
              />

              {/* Temperature (CRITICAL: Red alert boxes for values >= 38) */}
              <tr className={ROW}>
                <td className={LABEL_CELL}>Temperature</td>
                {matrixData.map((slot) => {
                  const isHigh =
                    slot.temperature != null && slot.temperature >= 38;
                  return (
                    <td
                      key={slot.key}
                      className="border-r px-1 py-1 text-center"
                    >
                      <div
                        className={cn(
                          "inline-block rounded px-1.5 py-0.5",
                          isHigh
                            ? "border border-status-critical/50 bg-status-critical/10 font-semibold text-status-critical"
                            : "text-muted-foreground",
                        )}
                      >
                        {slot.temperature ?? "—"}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* RESP */}
              <FlowsheetRow
                label="RESP"
                data={matrixData}
                field="resp"
                isLatestPulse={liveHighlight}
              />

              {/* PA */}
              <FlowsheetRow label="PA" data={matrixData} field="pa" muted />

              {/* End Tidal */}
              <FlowsheetRow
                label="End Tidal"
                data={matrixData}
                field="endTidal"
                muted
              />

              {/* Perf */}
              <FlowsheetRow label="Perf" data={matrixData} field="perf" muted />

              {/* Left Atrium Pressure */}
              <FlowsheetRow
                label="Left Atrium Pressure"
                data={matrixData}
                field="leftAtriumPressure"
                muted
              />

              {/* SPO2 */}
              <FlowsheetRow
                label="SPO2"
                data={matrixData}
                field="spo2"
                highlightBold
                isLatestPulse={liveHighlight}
              />

              {/* GCS */}
              <FlowsheetRow
                label="GCS"
                data={matrixData}
                field="gcs"
                isLatestPulse={liveHighlight}
              />

              {/* Approve / Edit Row */}
              <tr className="bg-muted/30">
                <td className={cn(LABEL_CELL, "bg-muted py-1.5")}>
                  Approve / Edit
                </td>
                {matrixData.map((slot) => (
                  <td
                    key={slot.key}
                    className="border-r px-1 py-1.5 text-center"
                  >
                    <button
                      type="button"
                      onClick={() => handleApprove(slot.key)}
                      title={`Approve ${slot.timeStr}`}
                      className={cn(
                        "inline-flex size-5 cursor-pointer items-center justify-center rounded transition-colors",
                        slot.isApproved
                          ? "bg-status-good text-white shadow-xs"
                          : "border border-status-good/40 text-status-good hover:bg-status-good/10",
                      )}
                    >
                      <Check className="size-3.5 stroke-[3]" />
                    </button>
                  </td>
                ))}
              </tr>

              {/* Validation Date */}
              <tr className={ROW}>
                <td className={cn(LABEL_CELL, "text-muted-foreground")}>
                  Validation Date
                </td>
                {matrixData.map((slot) => (
                  <td
                    key={slot.key}
                    className="border-r px-1 py-1 text-center text-[10px] text-muted-foreground"
                  >
                    {slot.validationDate}
                  </td>
                ))}
              </tr>
            </tbody>

            {/* 4. VENTILATOR SECTION HEADER AND ROWS */}
            <thead>
              <tr className="sticky top-14 z-20 border-t-2 border-b bg-muted font-medium text-muted-foreground">
                <th className="sticky left-0 z-30 flex w-44 items-center gap-1.5 border-r bg-muted px-3 py-1.5 text-left font-semibold text-foreground">
                  <Wind className="size-3.5 text-primary" />
                  VENTILATOR TYPES
                </th>
                {matrixData.map((slot) => (
                  <th
                    key={`vent_${slot.key}`}
                    className={cn(
                      "min-w-[72px] border-r px-1 py-1 text-center text-[10px] font-medium tabular-nums",
                      slot.isLatest &&
                        "bg-primary/10 font-semibold text-primary",
                    )}
                  >
                    {slot.timeStr}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y text-[11px] tabular-nums">
              {/* OXYGEN */}
              <FlowsheetRow
                label="OXYGEN"
                data={matrixData}
                field="oxygen"
                isLatestPulse={liveHighlight}
              />

              {/* FIO2 */}
              <FlowsheetRow
                label="FIO2"
                data={matrixData}
                field="fio2"
                isLatestPulse={liveHighlight}
              />

              {/* TIDALVOLUME */}
              <FlowsheetRow
                label="TIDALVOLUME"
                data={matrixData}
                field="tidalVolume"
                isLatestPulse={liveHighlight}
              />

              {/* VTE */}
              <FlowsheetRow
                label="VTE"
                data={matrixData}
                field="vte"
                isLatestPulse={liveHighlight}
              />

              {/* VTI */}
              <FlowsheetRow
                label="VTI"
                data={matrixData}
                field="vti"
                isLatestPulse={liveHighlight}
              />

              {/* VTI SETTING */}
              <FlowsheetRow
                label="VTI SETTING"
                data={matrixData}
                field="vtiSetting"
                isLatestPulse={liveHighlight}
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. CLINICAL FOOTER */}
      <div className="flex flex-wrap items-center justify-between border-t bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
        <div>
          <span>© 2026 VEXOS Health · All Rights Reserved</span>
        </div>
        <span className="font-medium text-foreground">
          {user?.organization?.name || DEFAULT_ORGANIZATION.name}
        </span>
      </div>
    </div>
  );
}

const ICON_BUTTON =
  "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const ROW = "group transition-colors hover:bg-muted/50";
// Sticky label column needs an opaque background so scrolled cells stay hidden behind it.
const LABEL_CELL =
  "sticky left-0 z-10 border-r bg-card px-3 py-1 font-medium group-hover:bg-muted";

// Reusable table row for clinical matrix
function FlowsheetRow({
  label,
  data,
  field,
  highlightBold = false,
  muted = false,
  isLatestPulse = false,
}) {
  return (
    <tr className={ROW}>
      <td className={LABEL_CELL}>{label}</td>
      {data.map((slot) => {
        const val = slot[field];
        const isLatest = slot.isLatest;

        return (
          <td
            key={slot.key}
            className={cn(
              "border-r px-1 py-1 text-center transition-all",
              highlightBold
                ? "font-semibold text-foreground"
                : muted
                  ? "text-muted-foreground"
                  : "text-foreground/80",
              isLatest && isLatestPulse && "bg-primary/10 text-primary",
            )}
          >
            {val !== "" && val !== undefined && val !== null ? val : "—"}
          </td>
        );
      })}
    </tr>
  );
}
