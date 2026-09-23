import { HeartPulse } from "lucide-react";

export function FullPageLoader() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background">
      <HeartPulse className="size-8 animate-pulse text-primary" />
      <p className="text-sm text-muted-foreground">Securing your session…</p>
    </div>
  );
}
