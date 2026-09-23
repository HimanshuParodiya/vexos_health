import { Building2, ShieldAlert, UserCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ROLE_CONFIG } from "@/config/roles";

// Placeholder data until the admin API exists.
const STATS = [
  { label: "Total staff", value: 248, hint: "112 doctors, 136 nurses", icon: Users },
  { label: "Pending verifications", value: 4, hint: "License checks", icon: UserCheck },
  { label: "Departments", value: 11, icon: Building2 },
  { label: "Security events", value: 0, hint: "Last 24 hours", icon: ShieldAlert },
];

const PENDING = [
  { name: "Dr. Vikram Joshi", role: "doctor", license: "NMC-448120", department: "Neurology" },
  { name: "Sneha Pillai", role: "nurse", license: "RN-302215", department: "Pediatrics" },
  { name: "Dr. Neha Kapoor", role: "doctor", license: "NMC-551907", department: "Oncology" },
];

export function AdminDashboard() {
  return (
    <>
      <PageHeader title="Administration" description="Staff access and system health." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pending account verifications</CardTitle>
          <CardDescription>Confirm registration numbers before granting access</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {PENDING.map((person) => (
            <div
              key={person.license}
              className="flex flex-wrap items-center gap-4 rounded-lg border p-3"
            >
              <div className="grid min-w-0 flex-1">
                <span className="text-sm font-medium">{person.name}</span>
                <span className="text-xs text-muted-foreground">
                  {person.department} · {person.license}
                </span>
              </div>
              <Badge variant="secondary">{ROLE_CONFIG[person.role].label}</Badge>
              <Button size="sm" variant="outline">Review</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
