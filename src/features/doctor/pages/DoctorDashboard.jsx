import { useState } from "react";
import { Clock, FlaskConical, RefreshCcw, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { StatTile } from "@/components/dashboard/StatTile";
import { useAuth } from "@/features/auth";
import { ConsultationsChart } from "@/features/doctor/components/ConsultationsChart";
import { DiagnosesChart } from "@/features/doctor/components/DiagnosesChart";
import { HourlyLoadChart } from "@/features/doctor/components/HourlyLoadChart";
import { LabResultsTable } from "@/features/doctor/components/LabResultsTable";
import { SchedulePanel } from "@/features/doctor/components/SchedulePanel";
import { useDoctorDashboard } from "@/features/doctor/hooks/useDoctorDashboard";
import { formatNumber, formatPercent } from "@/lib/format";

export function DoctorDashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const { data, isLoading, isRefetching, error, reload } = useDoctorDashboard(days);
  const period = `previous ${days} days`;

  return (
    <>
      <PageHeader
        title={`Good day, ${user?.fullName ?? "Doctor"}`}
        description={`${user?.department ?? "Clinical"} · your practice at a glance`}
        actions={<DateRangeFilter value={days} onChange={setDays} />}
      />

      <DashboardState isLoading={isLoading} isRefetching={isRefetching} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Patients seen"
                icon={Users}
                value={formatNumber(data.kpis.patientsSeen.current)}
                current={data.kpis.patientsSeen.current}
                previous={data.kpis.patientsSeen.previous}
                periodLabel={period}
                trend={data.kpis.patientsSeen.trend}
              />
              <StatTile
                label="Avg. consultation time"
                icon={Clock}
                value={`${data.kpis.avgConsultMins.current} min`}
                current={data.kpis.avgConsultMins.current}
                previous={data.kpis.avgConsultMins.previous}
                periodLabel="last month"
                upIsGood={false}
                trend={data.kpis.avgConsultMins.trend}
              />
              <StatTile
                label="Pending lab results"
                icon={FlaskConical}
                value={data.kpis.pendingLabs.current}
                footnote={`${data.kpis.pendingLabs.flagged} flagged abnormal or critical`}
              />
              <StatTile
                label="Follow-up adherence"
                icon={RefreshCcw}
                value={formatPercent(data.kpis.followUpRate.current, 1)}
                current={data.kpis.followUpRate.current}
                previous={data.kpis.followUpRate.previous}
                periodLabel={period}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <ConsultationsChart data={data.consultations} days={days} />
              <DiagnosesChart data={data.diagnoses} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <LabResultsTable results={data.labResults} />
              <HourlyLoadChart data={data.hourlyLoad} />
            </div>

            <SchedulePanel schedule={data.schedule} />
          </>
        )}
      </DashboardState>
    </>
  );
}
