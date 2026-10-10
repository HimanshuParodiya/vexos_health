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

// 24-hour column generation helper based on target date
function generateTimelineSlots(baseDate = new Date()) {
  const slots = [];
  const start = new Date(baseDate.getTime() - 23 * 3600 * 1000);

  for (let i = 0; i < 24; i++) {
    const d = new Date(start.getTime() + i * 3600 * 1000);
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

const HEART_RHYTHMS = ["NSR", "Sinus Tach", "Sinus Brady", "AFib", "A-Flutter", "Paced"];

export function ClinicalFlowsheet({ beds = [], currentBed, onSelectBed }) {
  const [selectedBedId, setSelectedBedId] = useState(currentBed?.bed_id || beds[0]?.bed_id || "BED-01");
  const [filterDate, setFilterDate] = useState("09/24/2026 12:00 PM");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [approvedSlots, setApprovedSlots] = useState({});
  const [rhythms, setRhythms] = useState({});
  const [liveHighlight, setLiveHighlight] = useState(false);
  const [activeTab, setActiveTab] = useState("MONITOR"); // MONITOR or VENTILATOR

  const containerRef = useRef(null);
  const scrollWrapperRef = useRef(null);

  // Active bed data
  const bed = beds.find((b) => b.bed_id === selectedBedId) || beds[0] || {
    bed_id: "BED-01",
    patient: { mrn: "ZeroOne", name: "Jessica Marie Farley", gender: "Female" },
    admitted_at: "2026-09-24T13:50:29.86Z",
    length_of_stay: "966",
  };

  const patientMrn = bed.patient?.mrn || "ZeroOne";
  const [historicalVitals, setHistoricalVitals] = useState([]);
  const [ventilatorData, setVentilatorData] = useState(null);
  const [loadingPatientData, setLoadingPatientData] = useState(false);

  // Fetch telemetry whenever active bed changes
  useEffect(() => {
    let cancelled = false;
    async function fetchBedData() {
      if (!patientMrn) return;
      setLoadingPatientData(true);
      try {
        const [vitalsRes, ventRes] = await Promise.allSettled([
          vexosApi.getPatientVitals(patientMrn, 1440),
          vexosApi.getPatientVentilator(patientMrn),
        ]);
        if (!cancelled) {
          if (vitalsRes.status === "fulfilled" && Array.isArray(vitalsRes.value)) {
            setHistoricalVitals(vitalsRes.value);
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
  const { isConnected, isConnecting, reconnect, lastMessageAt } = useVitalsWebSocket({
    onVitalUpdate: (liveVital) => {
      if (!liveVital) return;
      if (liveVital.bed_id === selectedBedId || liveVital.mrn === patientMrn) {
        setHistoricalVitals((prev) => [...prev, liveVital]);
        setLiveHighlight(true);
        setTimeout(() => setLiveHighlight(false), 2000);
      }
    },
  });

  const timeSlots = useMemo(() => generateTimelineSlots(new Date(2026, 8, 24, 12, 0)), []);

  // Compute values for each time slot from telemetry or seed baselines
  const matrixData = useMemo(() => {
    // Fixed seed values matching clinical reference screenshot
    const cvpSeed = [5, 6, 5, 5, 7, 9, 8, 8, 9, 9, 7, 7, 5, 7, 5, 6, 7, 8, 7, 9, 8, 7, 7, 9];
    const pulseSeed = [86, 111, 63, 112, 73, 109, 62, 114, 82, 106, 98, 93, 83, 111, 118, 77, 101, 107, 101, 64, 112, 102, 63, 102];
    const meanArterySeed = [99, 84, 99, 104, 103, 98, 90, 101, 104, 104, 93, 106, 93, 97, 87, 99, 102, 93, 87, 99, 84, 94, 102, 90];
    const sysArterySeed = [144, 130, 136, 135, 144, 144, 135, 142, 149, 141, 148, 145, 147, 130, 130, 130, 138, 148, 138, 131, 132, 145, 145, 147];
    const diaArterySeed = [77, 61, 81, 89, 82, 75, 67, 80, 82, 86, 65, 86, 66, 80, 66, 83, 84, 66, 61, 83, 60, 68, 80, 61];
    const tempSeed = [38, 38, 38, 38, 37, 36, 38, 39, 39, 38, 38, 38, 37, 38, 37, 38, 38, 39, 36, 36, 37, 38, 38, 38];
    const respSeed = [25, 21, 24, 22, 22, 21, 25, 25, 20, 21, 21, 22, 20, 25, 22, 22, 25, 21, 21, 21, 21, 22, 25, 24];
    const spo2Seed = [96, 97, 98, 96, 99, 95, 98, 95, 98, 97, 99, 98, 98, 95, 97, 97, 98, 97, 95, 97, 95, 97, 95, 98];

    // Ventilator seed values
    const o2Seed = [59.31, 34.29, 76.64, 50.09, 70.65, 79.12, 92.87, 79.5, 98.06, 73.79, 79.95, 76.18, 63.99, 22.53, 71.8, 76.75, 54.03, 78.26, 33.61, 42.68, 30.42, 45.2, 52.1, 60.5];
    const fio2Seed = [34, 33, 91, 93, 54, 76, 97, 58, 74, 75, 63, 61, 97, 57, 88, 37, 82, 73, 55, 98, 22, 40, 50, 45];
    const vteSeed = [489, 483, 396, 446, 355, 467, 493, 395, 380, 497, 358, 412, 418, 453, 416, 372, 378, 389, 456, 486, 444, 460, 455, 462];
    const vtiSeed = [452, 457, 437, 446, 383, 409, 423, 469, 484, 368, 443, 435, 447, 351, 469, 367, 369, 443, 367, 490, 380, 448, 452, 450];

    // Merge latest historical observation into latest slot if present
    const latestObs = historicalVitals.at(-1);

    return timeSlots.map((slot, index) => {
      const isLatest = slot.isLatest;

      const cvp = isLatest && latestObs?.cvp != null ? Math.round(latestObs.cvp) : cvpSeed[index % cvpSeed.length];
      const pulse = isLatest && latestObs?.heart_rate != null ? Math.round(latestObs.heart_rate) : pulseSeed[index % pulseSeed.length];
      const meanArtery = isLatest && latestObs?.arterial_systolic_bp != null ? Math.round((2 * (latestObs.arterial_diastolic_bp || 80) + latestObs.arterial_systolic_bp) / 3) : meanArterySeed[index % meanArterySeed.length];
      const sysArtery = isLatest && latestObs?.arterial_systolic_bp != null ? Math.round(latestObs.arterial_systolic_bp) : sysArterySeed[index % sysArterySeed.length];
      const diaArtery = isLatest && latestObs?.arterial_diastolic_bp != null ? Math.round(latestObs.arterial_diastolic_bp) : diaArterySeed[index % diaArterySeed.length];
      const temp = isLatest && latestObs?.temperature != null ? Math.round(latestObs.temperature) : tempSeed[index % tempSeed.length];
      const resp = isLatest && latestObs?.respiratory_rate != null ? Math.round(latestObs.respiratory_rate) : respSeed[index % respSeed.length];
      const spo2 = isLatest && latestObs?.spo2 != null ? Math.round(latestObs.spo2) : spo2Seed[index % spo2Seed.length];

      const oxygen = isLatest && ventilatorData?.oxygen != null ? Number(ventilatorData.oxygen).toFixed(2) : o2Seed[index % o2Seed.length];
      const fio2 = isLatest && ventilatorData?.fio2 != null ? Math.round(ventilatorData.fio2) : fio2Seed[index % fio2Seed.length];
      const vte = isLatest && ventilatorData?.vte != null ? Math.round(ventilatorData.vte) : vteSeed[index % vteSeed.length];
      const vti = isLatest && ventilatorData?.vti != null ? Math.round(ventilatorData.vti) : vtiSeed[index % vtiSeed.length];

      return {
        ...slot,
        cvp,
        pulse,
        heartRhythm: rhythms[slot.key] || "NSR",
        meanArtery,
        sysArtery,
        diaArtery,
        meanNi: Math.round(meanArtery * 0.96),
        sysNi: Math.round(sysArtery * 0.98),
        diaNi: Math.round(diaArtery * 0.95),
        temperature: temp,
        resp,
        pa: "",
        endTidal: "",
        perf: "",
        leftAtriumPressure: "",
        spo2,
        gcs: 15,
        isApproved: approvedSlots[slot.key] || false,
        validationDate: approvedSlots[slot.key] ? slot.timeStr : "",
        // Ventilator
        oxygen,
        fio2,
        tidalVolume: 450,
        vte,
        vti,
        vtiSetting: 450,
      };
    });
  }, [timeSlots, historicalVitals, ventilatorData, rhythms, approvedSlots]);

  const handleApprove = (slotKey) => {
    setApprovedSlots((prev) => {
      const next = !prev[slotKey];
      toast.success(next ? `Observation at ${slotKey.split("_")[1]} Approved` : "Approval Removed");
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
      const headers = ["Metric", ...matrixData.map((d) => `${d.dateStr} ${d.timeStr}`)];
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
      link.setAttribute("download", `VEXOS_Flowsheet_${selectedBedId}_${new Date().toISOString().slice(0, 10)}.csv`);
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
        isFullscreen ? "fixed inset-0 z-50 h-screen rounded-none" : "h-[calc(100vh-187px)]"
      )}
    >
      {/* 1. CLINICAL CONTEXT & PATIENT BANNER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-base font-semibold tracking-tight">Data Validation & Entry</h1>

          {/* Quick Clinical Tool Icons */}
          <div className="hidden items-center gap-1 rounded-lg border bg-muted/50 p-1 sm:flex">
            <button type="button" title="PACS" className={ICON_BUTTON}>
              <Video className="size-4" />
            </button>
            <span className="px-1 text-[10px] font-semibold text-muted-foreground">PACS</span>
            <button type="button" title="ECG Waveform" className={ICON_BUTTON}>
              <Activity className="size-4" />
            </button>
            <button type="button" title="Stethoscope" className={ICON_BUTTON}>
              <Stethoscope className="size-4" />
            </button>
            <button type="button" title="Medications" className={ICON_BUTTON}>
              <Pill className="size-4" />
            </button>
            <button type="button" title="Infusion/Syringe" className={ICON_BUTTON}>
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

            <div className="truncate font-semibold text-foreground">
              {bed.patient?.name || "Jessica Marie Farley"}, {bed.age || 55}y
            </div>
            <span>MRN: <strong className="font-medium text-foreground">{bed.patient?.mrn || "123"}</strong></span>
            <span>FIN: -</span>
            <span>{bed.patient?.gender === "U" ? "Female" : bed.patient?.gender || "Female"}</span>
            <span>Bed: <strong className="font-medium text-foreground">{bed.bed_id}</strong></span>
            <span>LOS: <strong className="font-medium text-foreground">{bed.length_of_stay || "966"}</strong></span>
            <span className="hidden truncate xl:inline">Relative: 83993739404</span>
          </div>

          <button type="button" title="Edit Clinical Notes" className="p-1 hover:text-foreground">
            <Edit2 className="size-3.5" />
          </button>
        </div>

        {/* Right Tools & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Toggle Ventilator Section"
            onClick={() => setActiveTab((prev) => (prev === "VENTILATOR" ? "MONITOR" : "VENTILATOR"))}
            className={cn(
              "rounded-md border p-1.5 transition-colors",
              activeTab === "VENTILATOR"
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
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
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>

      {/* 2. TOOLBAR: DATE FILTER, LIVE INDICATOR, BACK TO NOW, EXPORT CSV */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-medium text-muted-foreground">Filter by Date:</span>
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
            title={lastMessageAt ? `Last packet: ${new Date(lastMessageAt).toLocaleTimeString()}` : "Listening for telemetry..."}
            className={cn(
              "flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium",
              isConnected
                ? "bg-status-good/10 text-status-good"
                : isConnecting
                  ? "bg-status-warning/15 text-amber-700 dark:text-status-warning"
                  : "bg-status-critical/10 text-status-critical"
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                isConnected ? "animate-ping bg-status-good" : isConnecting ? "bg-status-warning" : "bg-status-critical"
              )}
            />
            <span className="tracking-tight">
              {isConnected ? "LIVE TELEMETRY STREAM" : isConnecting ? "Connecting Live Stream…" : "Offline / Click Reconnect"}
            </span>
            {!isConnected && (
              <button type="button" onClick={reconnect} className="ml-1 cursor-pointer font-semibold hover:underline">
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

          <button type="button" className="p-1 text-muted-foreground hover:text-foreground" title="Table Settings">
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
        <div ref={scrollWrapperRef} className="no-scrollbar relative w-0 min-w-0 max-w-full min-h-0 flex-1 overflow-x-auto overflow-y-auto">
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
                      slot.isLatest && "bg-primary/10 font-semibold text-primary"
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
              <FlowsheetRow label="CVP" data={matrixData} field="cvp" isLatestPulse={liveHighlight} />

              {/* Pulse */}
              <FlowsheetRow label="Pulse" data={matrixData} field="pulse" highlightBold isLatestPulse={liveHighlight} />

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
                      {HEART_RHYTHMS.map((r) => (
                        <option key={r} value={r} className="bg-popover text-popover-foreground">
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>

              {/* Mean AP (Artery) */}
              <FlowsheetRow label="Mean AP (Artery)" data={matrixData} field="meanArtery" isLatestPulse={liveHighlight} />

              {/* Systolic (Artery) */}
              <FlowsheetRow label="Systolic (Artery)" data={matrixData} field="sysArtery" isLatestPulse={liveHighlight} />

              {/* Diastolic (Artery) */}
              <FlowsheetRow label="Diastolic (Artery)" data={matrixData} field="diaArtery" isLatestPulse={liveHighlight} />

              {/* Mean AP (NI) */}
              <FlowsheetRow label="Mean AP (NI)" data={matrixData} field="meanNi" muted isLatestPulse={liveHighlight} />

              {/* Systolic (NI) */}
              <FlowsheetRow label="Systolic (NI)" data={matrixData} field="sysNi" muted isLatestPulse={liveHighlight} />

              {/* Diastolic (NI) */}
              <FlowsheetRow label="Diastolic (NI)" data={matrixData} field="diaNi" muted isLatestPulse={liveHighlight} />

              {/* Temperature (CRITICAL: Red alert boxes for values >= 38) */}
              <tr className={ROW}>
                <td className={LABEL_CELL}>Temperature</td>
                {matrixData.map((slot) => {
                  const isHigh = slot.temperature >= 38;
                  return (
                    <td key={slot.key} className="border-r px-1 py-1 text-center">
                      <div
                        className={cn(
                          "inline-block rounded px-1.5 py-0.5",
                          isHigh
                            ? "border border-status-critical/50 bg-status-critical/10 font-semibold text-status-critical"
                            : "text-muted-foreground"
                        )}
                      >
                        {slot.temperature}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* RESP */}
              <FlowsheetRow label="RESP" data={matrixData} field="resp" isLatestPulse={liveHighlight} />

              {/* PA */}
              <FlowsheetRow label="PA" data={matrixData} field="pa" muted />

              {/* End Tidal */}
              <FlowsheetRow label="End Tidal" data={matrixData} field="endTidal" muted />

              {/* Perf */}
              <FlowsheetRow label="Perf" data={matrixData} field="perf" muted />

              {/* Left Atrium Pressure */}
              <FlowsheetRow label="Left Atrium Pressure" data={matrixData} field="leftAtriumPressure" muted />

              {/* SPO2 */}
              <FlowsheetRow label="SPO2" data={matrixData} field="spo2" highlightBold isLatestPulse={liveHighlight} />

              {/* GCS */}
              <FlowsheetRow label="GCS" data={matrixData} field="gcs" isLatestPulse={liveHighlight} />

              {/* Approve / Edit Row */}
              <tr className="bg-muted/30">
                <td className={cn(LABEL_CELL, "bg-muted py-1.5")}>Approve / Edit</td>
                {matrixData.map((slot) => (
                  <td key={slot.key} className="border-r px-1 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleApprove(slot.key)}
                      title={`Approve ${slot.timeStr}`}
                      className={cn(
                        "inline-flex size-5 cursor-pointer items-center justify-center rounded transition-colors",
                        slot.isApproved
                          ? "bg-status-good text-white shadow-xs"
                          : "border border-status-good/40 text-status-good hover:bg-status-good/10"
                      )}
                    >
                      <Check className="size-3.5 stroke-[3]" />
                    </button>
                  </td>
                ))}
              </tr>

              {/* Validation Date */}
              <tr className={ROW}>
                <td className={cn(LABEL_CELL, "text-muted-foreground")}>Validation Date</td>
                {matrixData.map((slot) => (
                  <td key={slot.key} className="border-r px-1 py-1 text-center text-[10px] text-muted-foreground">
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
                      slot.isLatest && "bg-primary/10 font-semibold text-primary"
                    )}
                  >
                    {slot.timeStr}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y text-[11px] tabular-nums">
              {/* OXYGEN */}
              <FlowsheetRow label="OXYGEN" data={matrixData} field="oxygen" isLatestPulse={liveHighlight} />

              {/* FIO2 */}
              <FlowsheetRow label="FIO2" data={matrixData} field="fio2" isLatestPulse={liveHighlight} />

              {/* TIDALVOLUME */}
              <FlowsheetRow label="TIDALVOLUME" data={matrixData} field="tidalVolume" isLatestPulse={liveHighlight} />

              {/* VTE */}
              <FlowsheetRow label="VTE" data={matrixData} field="vte" isLatestPulse={liveHighlight} />

              {/* VTI */}
              <FlowsheetRow label="VTI" data={matrixData} field="vti" isLatestPulse={liveHighlight} />

              {/* VTI SETTING */}
              <FlowsheetRow label="VTI SETTING" data={matrixData} field="vtiSetting" isLatestPulse={liveHighlight} />
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. CLINICAL FOOTER */}
      <div className="flex flex-wrap items-center justify-between border-t bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
        <div>
          <span>© 2026 VEXOS Health · All Rights Reserved</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium text-foreground">Saint Joseph Medical Center</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">ICU Central Pod</span>
          <span className="tabular-nums">version 6.7.48</span>
        </div>
      </div>
    </div>
  );
}

const ICON_BUTTON = "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const ROW = "group transition-colors hover:bg-muted/50";
// Sticky label column needs an opaque background so scrolled cells stay hidden behind it.
const LABEL_CELL = "sticky left-0 z-10 border-r bg-card px-3 py-1 font-medium group-hover:bg-muted";

// Reusable table row for clinical matrix
function FlowsheetRow({ label, data, field, highlightBold = false, muted = false, isLatestPulse = false }) {
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
              highlightBold ? "font-semibold text-foreground" : muted ? "text-muted-foreground" : "text-foreground/80",
              isLatest && isLatestPulse && "bg-primary/10 text-primary"
            )}
          >
            {val !== "" && val !== undefined && val !== null ? val : "—"}
          </td>
        );
      })}
    </tr>
  );
}
