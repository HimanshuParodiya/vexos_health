import { Activity, AlertTriangle, BedDouble, Pill } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { useAuth } from "@/features/auth";

// Placeholder data until the nurse API exists.
const STATS = [
  { label: "Assigned beds", value: 12, hint: "Ward B, east wing", icon: BedDouble },
  { label: "Vitals due", value: 6, hint: "Next round at 14:00", icon: Activity },
  { label: "Medications due", value: 9, hint: "Within the next hour", icon: Pill },
  { label: "Alerts", value: 2, hint: "Needs attention", icon: AlertTriangle },
];

const TASKS = [
  { bed: "B-04", patient: "Suresh Iyer", task: "Record vitals", due: "13:45", urgent: true },
  { bed: "B-07", patient: "Fatima Khan", task: "IV antibiotics", due: "14:00", urgent: false },
  { bed: "B-11", patient: "Arjun Patel", task: "Wound dressing", due: "14:30", urgent: false },
];

export function NurseDashboard() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.fullName ?? "Nurse"}`}
        description="Your shift at a glance."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Care tasks</CardTitle>
          <CardDescription>Ordered by due time</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {TASKS.map((item) => (
            <div key={item.bed} className="flex flex-wrap items-center gap-4 rounded-lg border p-3">
              <span className="w-12 font-mono text-sm text-muted-foreground">{item.bed}</span>
              <div className="grid min-w-0 flex-1">
                <span className="text-sm font-medium">{item.task}</span>
                <span className="truncate text-xs text-muted-foreground">{item.patient}</span>
              </div>
              <Badge variant={item.urgent ? "destructive" : "secondary"}>Due {item.due}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
