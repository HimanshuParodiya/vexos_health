import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UnitLoadError({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card p-12 text-center">
      <AlertTriangle className="size-6 text-critical" />
      <p className="text-sm font-medium">Could not load the unit</p>
      <p className="max-w-md text-xs text-muted-foreground">{error?.message ?? "The VEXOS API did not respond."}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCw /> Try again
      </Button>
    </div>
  );
}
