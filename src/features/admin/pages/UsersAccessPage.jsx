import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { useAuth } from "@/features/auth";
import { AddUserCard } from "@/features/admin/components/AddUserCard";
import { Hl7IngestionCard } from "@/features/admin/components/Hl7IngestionCard";
import { SignInTable } from "@/features/admin/components/SignInTable";
import { SourceConfigCard } from "@/features/admin/components/SourceConfigCard";
import { SystemStatusStrip } from "@/features/admin/components/SystemStatusStrip";
import { UsersTable } from "@/features/admin/components/UsersTable";
import { useHl7SourceConfig, useHl7Stats, useSystemStatus, useUsersAndSignIns } from "@/features/admin/hooks/useAdminData";
import { summarizeHl7 } from "@/features/admin/lib/hl7";
import { recentFailures } from "@/features/admin/lib/users";
import { useNow } from "@/hooks/useNow";

export function UsersAccessPage() {
  const { user } = useAuth();
  const now = useNow(30_000);
  const system = useSystemStatus();
  const hl7 = useHl7Stats();
  const source = useHl7SourceConfig();
  const accounts = useUsersAndSignIns();
  const attempts = accounts.data?.attempts ?? [];
  const failures = recentFailures(attempts, now);

  return (
    <>
      <PageHeader title="Users & system" />
      <div className="grid gap-4">
        <SystemStatusStrip system={system.data} loading={system.isLoading} lastMessageAt={summarizeHl7(hl7.data).lastMessageAt} />

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Hl7IngestionCard stats={hl7.data} loading={hl7.isLoading} onSwept={hl7.reload} now={now} />
          <SourceConfigCard config={source.data} loading={source.isLoading} onSaved={source.reload} />
        </div>

        {accounts.error ? (
          <Panel className="p-6 text-sm text-critical">Could not load users: {accounts.error.message}</Panel>
        ) : (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <UsersTable
              users={accounts.data?.users}
              attempts={attempts}
              loading={accounts.isLoading}
              onChanged={accounts.reload}
              currentUsername={user?.username}
            />
            <AddUserCard onCreated={accounts.reload} />
          </div>
        )}

        <Panel>
          <PanelHeader
            title="Recent sign-in attempts"
            actions={
              failures.length > 0 ? (
                <span className="text-xs text-critical">
                  {failures.map((item) => `${item.count} failures for ${item.username} in 10 min`).join(" · ")}
                </span>
              ) : (
                <Link to="sign-ins" className="text-xs font-medium text-primary underline underline-offset-2">
                  Full sign-in log
                </Link>
              )
            }
          />
          {accounts.error ? (
            <p className="p-6 text-sm text-critical">Could not load sign-in attempts: {accounts.error.message}</p>
          ) : (
            <SignInTable attempts={attempts} loading={accounts.isLoading} limit={8} />
          )}
        </Panel>
      </div>
    </>
  );
}
