import { useState } from "react";
import { Activity, AlertTriangle, BedDouble, FileSpreadsheet, LayoutGrid, LineChart, Pill } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { StatTile } from "@/components/dashboard/StatTile";
import { useAuth } from "@/features/auth";
import { CareTasks } from "@/features/nurse/components/CareTasks";
import { MedRoundsChart } from "@/features/nurse/components/MedRoundsChart";
import { PatientAcuityTable } from "@/features/nurse/components/PatientAcuityTable";
import { VitalsPanel } from "@/features/nurse/components/VitalsPanel";
import { WardOccupancyCard } from "@/features/nurse/components/WardOccupancyCard";
import { ClinicalFlowsheet } from "@/features/nurse/components/ClinicalFlowsheet";
import { useNurseDashboard } from "@/features/nurse/hooks/useNurseDashboard";
import { formatPercent, formatTime } from "@/lib/format";

export function NurseDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isRefetching, error, reload } = useNurseDashboard();
  const [currentView, setCurrentView] = useState("flowsheet"); // 'flowsheet' | 'overview' | 'charts'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title={`Welcome, ${user?.fullName ?? "Nurse"}`}
          description={
            data
              ? `${data.shift.name} · ${formatTime(data.shift.start)} – ${formatTime(data.shift.end)} · ${user?.department ?? "ICU"}`
              : "Your ICU shift at a glance"
          }
        />

        {/* View Switcher Controls */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setCurrentView("flowsheet")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              currentView === "flowsheet"
                ? "bg-purple-700 text-white shadow"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <FileSpreadsheet className="size-3.5" />
            Flowsheet Matrix
          </button>
          <button
            type="button"
            onClick={() => setCurrentView("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              currentView === "overview"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <LayoutGrid className="size-3.5" />
            Shift Overview
          </button>
          <button
            type="button"
            onClick={() => setCurrentView("charts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              currentView === "charts"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <LineChart className="size-3.5" />
            Vitals Trends
          </button>
        </div>
      </div>

      <DashboardState isLoading={isLoading} isRefetching={isRefetching} error={error} onRetry={reload}>
        {data && (
          <>
            {/* 1. CLINICAL FLOWSHEET (DEFAULT & PRIMARY FOR REALTIME TELEMETRY) */}
            {currentView === "flowsheet" && (
              <div className="space-y-4">
                <ClinicalFlowsheet
                  beds={data.rawBeds || []}
                  currentBed={data.rawBeds?.[0]}
                />
              </div>
            )}

            {/* 2. OVERVIEW VIEW */}
            {currentView === "overview" && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatTile
                    label="Assigned ICU beds"
                    icon={BedDouble}
                    value={`${data.kpis.assignedPatients.current}/${data.kpis.assignedPatients.capacity}`}
                    footnote="Occupied telemetry beds"
                  />
                  <StatTile
                    label="Telemetry observations"
                    icon={Activity}
                    value={`${data.kpis.vitalsRecorded.current}/${data.kpis.vitalsRecorded.due}`}
                    footnote="Streaming every few seconds"
                  />
                  <StatTile
                    label="Medications on time"
                    icon={Pill}
                    value={formatPercent(data.kpis.medsOnTime.current, 1)}
                    current={data.kpis.medsOnTime.current}
                    previous={data.kpis.medsOnTime.previous}
                    periodLabel="last shift"
                  />
                  <StatTile
                    label="Active alerts"
                    icon={AlertTriangle}
                    value={data.kpis.activeAlerts.current}
                    footnote={`${data.kpis.activeAlerts.critical} critical NEWS2 alert`}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <PatientAcuityTable patients={data.patients} />
                  <CareTasks tasks={data.tasks} />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <MedRoundsChart data={data.medRounds} />
                  <WardOccupancyCard wards={data.wardOccupancy} />
                </div>
              </div>
            )}

            {/* 3. CHARTS VIEW */}
            {currentView === "charts" && (
              <div className="space-y-6">
                <VitalsPanel patients={data.patients} vitals={data.vitals} />
              </div>
            )}
          </>
        )}
      </DashboardState>
    </div>
  );
}
