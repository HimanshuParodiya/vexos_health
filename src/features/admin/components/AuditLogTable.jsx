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

const SEVERITY_LABEL = { good: "Info", warning: "Review", serious: "Security", critical: "Critical" };

export function AuditLogTable({ entries }) {
  return (
    <ChartCard title="Audit log" description="Latest access and configuration events" className="lg:col-span-2">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground tabular-nums">{formatTime(entry.at)}</TableCell>
                <TableCell className="font-medium">{entry.actor}</TableCell>
                <TableCell>{entry.action}</TableCell>
                <TableCell className="text-muted-foreground">{entry.target}</TableCell>
                <TableCell>
                  <StatusBadge status={entry.severity} label={SEVERITY_LABEL[entry.severity]} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ChartCard>
  );
}
