import { CalendarDays, ClipboardList, FlaskConical, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { useAuth } from "@/features/auth";

// Placeholder data until the doctor API exists.
const STATS = [
  { label: "Today's appointments", value: 14, hint: "3 remaining this morning", icon: CalendarDays },
  { label: "Active patients", value: 86, hint: "+4 this week", icon: Users },
  { label: "Pending lab results", value: 7, hint: "2 flagged abnormal", icon: FlaskConical },
  { label: "Notes to sign", value: 5, hint: "Oldest from yesterday", icon: ClipboardList },
];

const SCHEDULE = [
  { time: "09:30", patient: "Anita Verma", reason: "Follow-up, hypertension", status: "Checked in" },
  { time: "10:00", patient: "Karan Singh", reason: "Chest pain evaluation", status: "Waiting" },
  { time: "10:45", patient: "Meera Nair", reason: "Post-op review", status: "Scheduled" },
  { time: "11:30", patient: "Rohit Das", reason: "ECG results", status: "Scheduled" },
];

export function DoctorDashboard() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title={`Good day, ${user?.fullName ?? "Doctor"}`}
        description="Here is your clinical overview for today."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Today's schedule</CardTitle>
          <CardDescription>Upcoming consultations</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {SCHEDULE.map((slot) => (
            <div
              key={slot.time}
              className="flex flex-wrap items-center gap-4 rounded-lg border p-3"
            >
              <span className="w-14 font-mono text-sm text-muted-foreground">{slot.time}</span>
              <div className="grid min-w-0 flex-1">
                <span className="text-sm font-medium">{slot.patient}</span>
                <span className="truncate text-xs text-muted-foreground">{slot.reason}</span>
              </div>
              <Badge variant={slot.status === "Checked in" ? "default" : "secondary"}>
                {slot.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
