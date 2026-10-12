import { useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { Input } from "@/components/ui/input";
import { SignInTable } from "@/features/admin/components/SignInTable";
import { useUsersAndSignIns } from "@/features/admin/hooks/useAdminData";
import { recentFailures } from "@/features/admin/lib/users";
import { useNow } from "@/hooks/useNow";
import { cn } from "@/lib/utils";

const RESULTS = [
  { value: "all", label: "All" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

export function SignInLogPage() {
  const now = useNow(30_000);
  const { data, isLoading, error } = useUsersAndSignIns(500);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("all");

  const attempts = (data?.attempts ?? [])
    .filter((attempt) => result === "all" || (result === "success") === attempt.success)
    .filter((attempt) => attempt.username.toLowerCase().includes(query.trim().toLowerCase()));
  const failures = recentFailures(data?.attempts ?? [], now);

  return (
    <>
      <PageHeader
        title="Sign-in log"
        description="Latest 500 sign-in attempts. Failure reasons are internal and are never shown on the login screen."
      />
      <Panel>
        <PanelHeader
          title="Attempts"
          meta={`${attempts.length} shown`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {failures.length > 0 && (
                <span className="text-xs text-critical">
                  {failures.map((item) => `${item.count} failures for ${item.username} in 10 min`).join(" · ")}
                </span>
              )}
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Username"
                  aria-label="Filter by username"
                  className="h-8 w-40 pl-8"
                />
              </div>
              <div className="inline-flex rounded-lg border bg-muted p-0.5" role="tablist" aria-label="Filter by result">
                {RESULTS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="tab"
                    aria-selected={result === item.value}
                    onClick={() => setResult(item.value)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs text-muted-foreground",
                      result === item.value && "bg-card font-medium text-foreground shadow-xs"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          }
        />
        {error ? (
          <p className="p-6 text-sm text-critical">Could not load the sign-in log: {error.message}</p>
        ) : (
          <SignInTable attempts={attempts} loading={isLoading} />
        )}
      </Panel>
    </>
  );
}
