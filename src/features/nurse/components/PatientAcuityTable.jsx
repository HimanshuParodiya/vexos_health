import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatTime } from "@/lib/format";

const RESPONSE = {
  critical: "Urgent response",
  serious: "Urgent review",
  warning: "Increase monitoring",
  good: "Routine",
};

export function PatientAcuityTable({ patients }) {
  return (
    <ChartCard
      title="My patients"
      description="Sorted by NEWS2 early-warning score"
      className="lg:col-span-2"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bed</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Diagnosis</TableHead>
              <TableHead className="text-right">NEWS2</TableHead>
              <TableHead>Response</TableHead>
              <TableHead className="text-right">Last vitals</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="text-muted-foreground tabular-nums">{patient.bed}</TableCell>
                <TableCell className="font-medium">
                  {patient.name} <span className="font-normal text-muted-foreground">· {patient.age}y</span>
                </TableCell>
                <TableCell>{patient.diagnosis}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{patient.news2}</TableCell>
                <TableCell>
                  <StatusBadge status={patient.status} label={RESPONSE[patient.status]} />
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {formatTime(patient.lastVitalsAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ChartCard>
  );
}
