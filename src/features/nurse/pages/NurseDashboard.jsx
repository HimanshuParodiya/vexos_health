import { Activity, AlertTriangle, BedDouble, Pill } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { StatTile } from "@/components/dashboard/StatTile";
import { useAuth } from "@/features/auth";
import { CareTasks } from "@/features/nurse/components/CareTasks";
import { MedRoundsChart } from "@/features/nurse/components/MedRoundsChart";
import { PatientAcuityTable } from "@/features/nurse/components/PatientAcuityTable";
import { VitalsPanel } from "@/features/nurse/components/VitalsPanel";
import { WardOccupancyCard } from "@/features/nurse/components/WardOccupancyCard";
import { useNurseDashboard } from "@/features/nurse/hooks/useNurseDashboard";
import { formatPercent, formatTime } from "@/lib/format";

export function NurseDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isRefetching, error, reload } = useNurseDashboard();

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.fullName ?? "Nurse"}`}
        description={
          data
            ? `${data.shift.name} · ${formatTime(data.shift.start)} – ${formatTime(data.shift.end)} · ${user?.department ?? ""}`
            : "Your shift at a glance"
        }
      />

      <DashboardState isLoading={isLoading} isRefetching={isRefetching} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Assigned patients"
                icon={BedDouble}
                value={`${data.kpis.assignedPatients.current}/${data.kpis.assignedPatients.capacity}`}
                footnote="Beds assigned this shift"
              />
              <StatTile
                label="Vitals recorded"
                icon={Activity}
                value={`${data.kpis.vitalsRecorded.current}/${data.kpis.vitalsRecorded.due}`}
                footnote={`${data.kpis.vitalsRecorded.due - data.kpis.vitalsRecorded.current} observations still due`}
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
                footnote={`${data.kpis.activeAlerts.critical} critical NEWS2 score`}
              />
            </div>

            <VitalsPanel patients={data.patients} vitals={data.vitals} />

            <div className="grid gap-4 lg:grid-cols-3">
              <PatientAcuityTable patients={data.patients} />
              <CareTasks tasks={data.tasks} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <MedRoundsChart data={data.medRounds} />
              <WardOccupancyCard wards={data.wardOccupancy} />
            </div>
          </>
        )}
      </DashboardState>
    </>
  );
}
