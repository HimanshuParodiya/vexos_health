import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}
