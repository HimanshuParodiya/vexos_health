import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Wraps dashboard content with loading / error handling.
// On refetch the previous render stays in place, dimmed.
export function DashboardState({ isLoading, isRefetching, error, onRetry, children }) {
  if (isLoading) return <DashboardSkeleton />;

  if (error && !children) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
        <AlertTriangle className="size-6 text-status-critical" />
        <p className="text-sm text-muted-foreground">Could not load dashboard data.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div
      aria-busy={isRefetching || undefined}
      className={cn("grid gap-6 transition-opacity", isRefetching && "opacity-60")}
    >
      {children}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-xl bg-muted lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
