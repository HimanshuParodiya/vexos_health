import { useState } from "react";
import { BedDouble, IndianRupee, Timer, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { StatTile } from "@/components/dashboard/StatTile";
import { AuditLogTable } from "@/features/admin/components/AuditLogTable";
import { PatientFlowChart } from "@/features/admin/components/PatientFlowChart";
import { PayerMixCard } from "@/features/admin/components/PayerMixCard";
import { RevenueChart } from "@/features/admin/components/RevenueChart";
import { StaffingChart } from "@/features/admin/components/StaffingChart";
import { VerificationQueue } from "@/features/admin/components/VerificationQueue";
import { useAdminDashboard } from "@/features/admin/hooks/useAdminDashboard";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export function AdminDashboard() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isRefetching, error, reload } = useAdminDashboard(days);
  const period = `previous ${days} days`;

  return (
    <>
      <PageHeader
        title="Hospital overview"
        description="Operations, staffing and access control"
        actions={<DateRangeFilter value={days} onChange={setDays} />}
      />

      <DashboardState isLoading={isLoading} isRefetching={isRefetching} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Revenue"
                icon={IndianRupee}
                value={formatCurrency(data.kpis.revenue.current)}
                current={data.kpis.revenue.current}
                previous={data.kpis.revenue.previous}
                periodLabel={period}
                trend={data.kpis.revenue.trend}
              />
              <StatTile
                label="Bed occupancy"
                icon={BedDouble}
                value={formatPercent(data.kpis.bedOccupancy.current, 1)}
                current={data.kpis.bedOccupancy.current}
                previous={data.kpis.bedOccupancy.previous}
                periodLabel="last month"
                trend={data.kpis.bedOccupancy.trend}
              />
              <StatTile
                label="Avg. ER wait time"
                icon={Timer}
                value={`${data.kpis.erWaitMins.current} min`}
                current={data.kpis.erWaitMins.current}
                previous={data.kpis.erWaitMins.previous}
                periodLabel="last month"
                upIsGood={false}
                trend={data.kpis.erWaitMins.trend}
              />
              <StatTile
                label="Clinical staff"
                icon={Users}
                value={formatNumber(data.kpis.totalStaff.current)}
                footnote={`${data.kpis.totalStaff.doctors} doctors · ${data.kpis.totalStaff.nurses} nurses`}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <PatientFlowChart data={data.patientFlow} days={days} />
              <StaffingChart data={data.staffing} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <RevenueChart data={data.monthlyRevenue} />
              <PayerMixCard data={data.payerMix} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <AuditLogTable entries={data.auditLog} />
              <VerificationQueue items={data.verifications} />
            </div>
          </>
        )}
      </DashboardState>
    </>
  );
}
