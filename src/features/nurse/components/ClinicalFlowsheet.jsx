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
      className={`flex flex-col bg-[#14171d] text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "min-h-[820px]"
      }`}
    >
      {/* 1. TOP CEIBA / VEXOS CLINICAL NAVIGATION BAR */}
      <div className="bg-[#240b3b] border-b border-purple-900/60 px-4 py-2 flex items-center justify-between text-xs text-purple-200">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 font-bold text-white tracking-wide pr-3 border-r border-purple-800">
            <span className="flex size-6 items-center justify-center rounded bg-purple-600 text-white font-black text-sm">
              V
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">VEXOS eClinics</span>
          </div>

          <div className="flex items-center gap-3">
            {[
              "CMS Prime",
              "Digital CMU",
              "Population Management",
              "Patient Timeline",
              "Admission",
              "Patient",
              "Doctor",
              "Nurse",
              "Report",
              "Patient List View",
              "Alarm Command Center",
            ].map((navItem) => (
              <button
                key={navItem}
                type="button"
                className={`whitespace-nowrap px-2 py-1 rounded transition-colors ${
                  navItem === "Nurse"
                    ? "bg-purple-800/80 font-bold text-white shadow-sm"
                    : "hover:bg-purple-900/50 hover:text-white text-purple-300"
                }`}
              >
                {navItem}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-purple-800">
          <button
            type="button"
            className="rounded bg-purple-900/70 hover:bg-purple-800 px-2 py-1 font-semibold text-purple-100 border border-purple-700/50"
          >
            NEED HELP
          </button>
          <div className="flex items-center gap-1.5 text-slate-300">
            <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-white">Nurse Chaitanya JSK</span>
          </div>
        </div>
      </div>

      {/* 2. CLINICAL CONTEXT & PATIENT BANNER (DEEP PURPLE) */}
      <div className="bg-[#2c124d] border-b border-purple-950 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Data Validation & Entry
          </h1>

          {/* Quick Clinical Tool Icons */}
          <div className="hidden sm:flex items-center gap-1 bg-purple-950/60 p-1 rounded-lg border border-purple-800/50">
            <button type="button" title="PACS" className="p-1.5 hover:bg-purple-800 rounded text-purple-300 hover:text-white">
              <Video className="size-4" />
            </button>
            <span className="text-[10px] font-bold text-purple-400 px-1">PACS</span>
            <button type="button" title="ECG Waveform" className="p-1.5 hover:bg-purple-800 rounded text-purple-300 hover:text-white">
              <Activity className="size-4" />
            </button>
            <button type="button" title="Stethoscope" className="p-1.5 hover:bg-purple-800 rounded text-purple-300 hover:text-white">
              <Stethoscope className="size-4" />
            </button>
            <button type="button" title="Medications" className="p-1.5 hover:bg-purple-800 rounded text-purple-300 hover:text-white">
              <Pill className="size-4" />
            </button>
            <button type="button" title="Infusion/Syringe" className="p-1.5 hover:bg-purple-800 rounded text-purple-300 hover:text-white">
              <Syringe className="size-4" />
            </button>
          </div>
        </div>

        {/* Center Patient Banner */}
        <div className="flex items-center gap-3 bg-purple-950/70 border border-purple-800/60 rounded-lg px-3 py-1.5 text-xs text-purple-100 flex-1 max-w-2xl justify-between">
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
                className="bg-purple-900 border border-purple-700 font-bold text-white rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-purple-400 cursor-pointer"
              >
                {beds.map((b) => (
                  <option key={b.bed_id} value={b.bed_id}>
                    {b.bed_id} {b.patient?.name ? `(${b.patient.name})` : ""}
                  </option>
                ))}
              </select>
              {loadingPatientData && (
                <span className="size-2 rounded-full border border-purple-300 border-t-transparent animate-spin ml-1" />
              )}
            </div>

            <div className="truncate font-semibold text-white">
              {bed.patient?.name || "Jessica Marie Farley"}, {bed.age || 55}y
            </div>
            <span className="text-purple-300">MRN: <strong className="text-white">{bed.patient?.mrn || "123"}</strong></span>
            <span className="text-purple-300">FIN: -</span>
            <span className="text-purple-300">{bed.patient?.gender === "U" ? "Female" : bed.patient?.gender || "Female"}</span>
            <span className="text-purple-300">Bed: <strong className="text-white">{bed.bed_id}</strong></span>
            <span className="text-purple-300">LOS: <strong className="text-white">{bed.length_of_stay || "966"}</strong></span>
            <span className="hidden xl:inline text-purple-300 truncate">Relative: 83993739404</span>
          </div>

          <button type="button" title="Edit Clinical Notes" className="p-1 hover:text-white text-purple-300">
            <Edit2 className="size-3.5" />
          </button>
        </div>

        {/* Right Tools & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Toggle Ventilator Section"
            onClick={() => setActiveTab((prev) => (prev === "VENTILATOR" ? "MONITOR" : "VENTILATOR"))}
            className={`p-1.5 rounded border ${
              activeTab === "VENTILATOR"
                ? "bg-purple-700 text-white border-purple-500"
                : "bg-purple-950/60 text-purple-300 border-purple-800 hover:text-white"
            }`}
          >
            <Wind className="size-4" />
          </button>
          <button
            type="button"
            title="Fullscreen"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded bg-purple-950/60 hover:bg-purple-800 text-purple-300 hover:text-white border border-purple-800"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>

      {/* 3. TOOLBAR: DATE FILTER, LIVE INDICATOR, BACK TO NOW, EXPORT CSV */}
      <div className="bg-[#1b1e25] border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-300">Filter by Date:</span>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              aria-label="Filter by Date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-[#242933] border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs w-44 font-mono focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={scrollToLatest}
              className="flex items-center gap-1 bg-[#4c1d95] hover:bg-[#5b21b6] text-white px-3 py-1 rounded font-medium shadow-sm transition-all"
            >
              <RotateCcw className="size-3.5" />
              Back to Now
            </button>
            <Info className="size-4 text-slate-400 hover:text-slate-200 cursor-pointer" />
          </div>
        </div>

        {/* Live WebSocket Status & CSV Export */}
        <div className="flex items-center gap-3">
          {/* Live Telemetry Beacon */}
          <div
            title={lastMessageAt ? `Last packet: ${new Date(lastMessageAt).toLocaleTimeString()}` : "Listening for telemetry..."}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs ${
              isConnected
                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                : isConnecting
                ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
                : "bg-rose-950/60 border-rose-500/50 text-rose-300"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                isConnected ? "bg-emerald-400 animate-ping" : isConnecting ? "bg-amber-400" : "bg-rose-400"
              }`}
            />
            <span className="font-medium tracking-tight">
              {isConnected ? "LIVE TELEMETRY STREAM" : isConnecting ? "Connecting Live Stream…" : "Offline / Click Reconnect"}
            </span>
            {!isConnected && (
              <button
                type="button"
                onClick={reconnect}
                className="hover:underline font-bold text-xs ml-1 cursor-pointer"
              >
                Reconnect
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-[#252a36] hover:bg-[#313746] text-slate-200 border border-slate-700 px-3 py-1 rounded font-medium shadow-sm transition-colors"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-400" />
            Export as CSV
          </button>

          <button type="button" className="p-1 text-slate-400 hover:text-slate-200" title="Table Settings">
            <Settings className="size-4" />
          </button>
        </div>
      </div>

      {/* 4. CLINICAL FLOWSHEET MATRIX GRID */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Vertical Section Rail */}
        <div className="w-8 shrink-0 bg-[#1e232d] border-r border-slate-800 flex flex-col items-center justify-between py-4 select-none">
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">
            ◀ MONITOR ▶
          </span>
          <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider [writing-mode:vertical-rl] rotate-180">
            Patient Details
          </span>
        </div>

        {/* Scrollable Matrix Table Container */}
        <div ref={scrollWrapperRef} className="flex-1 overflow-x-auto overflow-y-auto relative no-scrollbar">
          <table className="w-full border-collapse text-xs select-none">
            {/* Header Dates Row */}
            <thead>
              <tr className="bg-[#1e232d] text-slate-300 font-semibold border-b border-slate-700/80 sticky top-0 z-20">
                <th className="sticky left-0 z-30 bg-[#1e232d] px-3 py-1.5 text-left border-r border-slate-800 w-44 font-bold text-slate-300">
                  TYPES
                </th>
                {dateGroups.map((group) => (
                  <th
                    key={group.dateStr}
                    colSpan={group.count}
                    className="border-r border-slate-700 text-center py-1 text-[11px] font-mono tracking-wider bg-[#222733] text-purple-200 border-b border-slate-800"
                  >
                    {group.dateStr}
                  </th>
                ))}
              </tr>

              {/* Time Slots Row */}
              <tr className="bg-[#1b1e25] text-slate-400 text-[11px] font-mono border-b border-slate-800 sticky top-7 z-20">
                <th className="sticky left-0 z-30 bg-[#1b1e25] px-3 py-1 text-left border-r border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                  Hourly Observation
                </th>
                {matrixData.map((slot) => (
                  <th
                    key={slot.key}
                    className={`min-w-[72px] px-1 py-1.5 text-center border-r border-slate-800 font-mono ${
                      slot.isLatest ? "bg-[#3b1263] text-white font-bold" : "text-slate-300"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span>{slot.timeStr}</span>
                      {slot.isLatest && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] bg-purple-500 font-bold text-white uppercase tracking-wider animate-pulse">
                          New
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* MONITOR SECTION ROWS */}
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {/* CVP */}
              <FlowsheetRow label="CVP" data={matrixData} field="cvp" isLatestPulse={liveHighlight} />

              {/* Pulse */}
              <FlowsheetRow label="Pulse" data={matrixData} field="pulse" highlightBold isLatestPulse={liveHighlight} />

              {/* Heart Rhythm */}
              <tr className="hover:bg-slate-800/40">
                <td className="sticky left-0 z-10 bg-[#181c23] px-3 py-1 border-r border-slate-800 font-sans font-semibold text-slate-300">
                  Heart Rhythm
                </td>
                {matrixData.map((slot) => (
                  <td key={slot.key} className="px-1 py-1 text-center border-r border-slate-800/70">
                    <select
                      aria-label="Heart Rhythm"
                      value={slot.heartRhythm}
                      onChange={(e) =>
                        setRhythms((prev) => ({
                          ...prev,
                          [slot.key]: e.target.value,
                        }))
                      }
                      className="w-14 bg-transparent text-[10px] text-slate-300 text-center focus:bg-slate-900 border-none outline-none cursor-pointer"
                    >
                      {HEART_RHYTHMS.map((r) => (
                        <option key={r} value={r} className="bg-slate-900 text-white">
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
              <tr className="hover:bg-slate-800/40">
                <td className="sticky left-0 z-10 bg-[#181c23] px-3 py-1 border-r border-slate-800 font-sans font-semibold text-slate-300">
                  Temperature
                </td>
                {matrixData.map((slot) => {
                  const isHigh = slot.temperature >= 38;
                  return (
                    <td key={slot.key} className="px-1 py-1 text-center border-r border-slate-800/70">
                      <div
                        className={`inline-block px-1.5 py-0.5 rounded ${
                          isHigh
                            ? "border border-red-600/80 bg-red-950/40 text-red-500 font-bold"
                            : "text-slate-400"
                        }`}
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
              <tr className="bg-[#161a22] hover:bg-slate-800/40">
                <td className="sticky left-0 z-10 bg-[#161a22] px-3 py-1.5 border-r border-slate-800 font-sans font-semibold text-slate-300">
                  Approve / Edit
                </td>
                {matrixData.map((slot) => (
                  <td key={slot.key} className="px-1 py-1.5 text-center border-r border-slate-800/70">
                    <button
                      type="button"
                      onClick={() => handleApprove(slot.key)}
                      title={`Approve ${slot.timeStr}`}
                      className={`inline-flex items-center justify-center size-5 rounded transition-all cursor-pointer ${
                        slot.isApproved
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-emerald-600/70 hover:bg-emerald-500 text-white"
                      }`}
                    >
                      <Check className="size-3.5 stroke-[3]" />
                    </button>
                  </td>
                ))}
              </tr>

              {/* Validation Date */}
              <tr className="hover:bg-slate-800/40">
                <td className="sticky left-0 z-10 bg-[#181c23] px-3 py-1 border-r border-slate-800 font-sans font-semibold text-slate-400">
                  Validation Date
                </td>
                {matrixData.map((slot) => (
                  <td key={slot.key} className="px-1 py-1 text-center border-r border-slate-800/70 text-[10px] text-slate-500">
                    {slot.validationDate}
                  </td>
                ))}
              </tr>
            </tbody>

            {/* 5. VENTILATOR SECTION HEADER AND ROWS */}
            <thead>
              <tr className="bg-[#240b3b] text-purple-200 font-semibold border-t-2 border-b border-purple-900 sticky top-14 z-20">
                <th className="sticky left-0 z-30 bg-[#240b3b] px-3 py-1.5 text-left border-r border-purple-950 w-44 font-bold text-white flex items-center gap-1.5">
                  <Wind className="size-3.5 text-purple-300" />
                  VENTILATOR TYPES
                </th>
                {matrixData.map((slot) => (
                  <th
                    key={`vent_${slot.key}`}
                    className={`min-w-[72px] px-1 py-1 text-center border-r border-purple-950/70 font-mono text-[10px] ${
                      slot.isLatest ? "bg-[#45166f] text-white font-bold" : "text-purple-300/80"
                    }`}
                  >
                    {slot.timeStr}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
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

      {/* 6. CLINICAL FOOTER */}
      <div className="bg-[#181a20] border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
        <div>
          <span>© 2026 CEIBA Health · All Rights Reserved</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium text-slate-300">Saint Joseph Medical Center</span>
          <span className="text-purple-400 font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
            ICU Central Pod
          </span>
          <span className="font-mono text-slate-500">version 6.7.48</span>
        </div>
      </div>
    </div>
  );
}

// Reusable table row for clinical matrix
function FlowsheetRow({ label, data, field, highlightBold = false, muted = false, isLatestPulse = false }) {
  return (
    <tr className="hover:bg-slate-800/40 transition-colors">
      <td className="sticky left-0 z-10 bg-[#181c23] px-3 py-1 border-r border-slate-800 font-sans font-semibold text-slate-300">
        {label}
      </td>
      {data.map((slot) => {
        const val = slot[field];
        const isLatest = slot.isLatest;

        return (
          <td
            key={slot.key}
            className={`px-1 py-1 text-center border-r border-slate-800/70 transition-all ${
              isLatest && isLatestPulse ? "bg-purple-900/40 text-purple-200" : ""
            } ${highlightBold ? "font-bold text-slate-200" : muted ? "text-slate-500" : "text-slate-300"}`}
          >
            {val !== "" && val !== undefined && val !== null ? val : "—"}
          </td>
        );
      })}
    </tr>
  );
}
