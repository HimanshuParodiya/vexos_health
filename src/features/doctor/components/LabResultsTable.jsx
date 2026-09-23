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

export function LabResultsTable({ results }) {
  return (
    <ChartCard
      title="Recent lab results"
      description="Newest first · abnormal values flagged"
      className="lg:col-span-2"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Test</TableHead>
              <TableHead className="text-right">Result</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Reported</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.id}>
                <TableCell className="font-medium">{result.patient}</TableCell>
                <TableCell>{result.test}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {result.value} <span className="text-muted-foreground">{result.unit}</span>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{result.reference}</TableCell>
                <TableCell>
                  <StatusBadge status={result.status} />
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {formatTime(result.reportedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ChartCard>
  );
}
