import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemStatusStrip } from "@/features/admin/components/SystemStatusStrip";
import { useHl7Stats, useSystemStatus } from "@/features/admin/hooks/useAdminData";
import { summarizeHl7 } from "@/features/admin/lib/hl7";
import { useAsyncData } from "@/hooks/useAsyncData";
import { vexosApi } from "@/services/vexos-api";

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-4 border-b px-4 py-3 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{children}</span>
    </div>
  );
}

// Facility identity comes from the server's HOSPITAL_* settings; it is read-only here.
export function HospitalSettingsPage() {
  const hospital = useAsyncData(() => vexosApi.getHospitalInfo(), "hospital");
  const system = useSystemStatus();
  const hl7 = useHl7Stats(5);
  const info = hospital.data;

  return (
    <>
      <PageHeader title="Hospital settings" description="Facility identity shown across the app. Change it in the server's HOSPITAL_* environment settings." />
      <div className="grid gap-4">
        <SystemStatusStrip system={system.data} loading={system.isLoading} lastMessageAt={summarizeHl7(hl7.data).lastMessageAt} />
        <Panel className="max-w-2xl">
          <PanelHeader title="Facility" />
          {hospital.isLoading ? (
            <div className="grid gap-2 p-4">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : hospital.error ? (
            <p className="p-4 text-sm text-critical">{hospital.error.message}</p>
          ) : (
            <div>
              <Row label="Name">{info?.name ?? "–"}</Row>
              <Row label="Facility ID">{info?.facility_id ?? "–"}</Row>
              <Row label="Capacity">{info?.capacity ?? "–"} beds</Row>
              <Row label="Active beds">{info?.active_beds ?? "–"}</Row>
              <Row label="Logo">
                {info?.logo_url ? <img src={info.logo_url} alt={`${info.name} logo`} className="h-8" /> : "not set"}
              </Row>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
