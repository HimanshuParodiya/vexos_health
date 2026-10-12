import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatClock, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function resultLabel(attempt) {
  if (attempt.success) return attempt.reason ? `Success · ${attempt.reason}` : "Success";
  return `Failed · ${attempt.reason ?? "unknown"}`;
}

// Login audit rows (GET /identity/login-attempts). `reason` is the real internal cause.
export function SignInTable({ attempts, loading, limit }) {
  if (loading) {
    return (
      <div className="grid gap-2 p-4">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-9" />
        ))}
      </div>
    );
  }
  const rows = limit ? attempts.slice(0, limit) : attempts;
  if (rows.length === 0) return <EmptyState title="No sign-in attempts recorded" />;

  const today = new Date().toDateString();
  return (
    <Table>
      <TableHeader>
        <TableRow className="text-xs">
          <TableHead className="pl-4 font-normal text-muted-foreground">Time</TableHead>
          <TableHead className="font-normal text-muted-foreground">Username</TableHead>
          <TableHead className="font-normal text-muted-foreground">Source IP</TableHead>
          <TableHead className="pr-4 font-normal text-muted-foreground">Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((attempt, index) => {
          const date = new Date(attempt.attempted_at);
          return (
            <TableRow key={`${attempt.attempted_at}-${attempt.username}-${index}`}>
              <TableCell className="pl-4 font-mono text-xs">
                {date.toDateString() !== today && <span className="mr-1.5 text-muted-foreground">{formatShortDate(date)}</span>}
                {formatClock(date)}
              </TableCell>
              <TableCell className="font-mono text-xs">{attempt.username}</TableCell>
              <TableCell className="font-mono text-xs">{attempt.ip_address ?? "–"}</TableCell>
              <TableCell className={cn("pr-4 text-xs font-medium", attempt.success ? "text-good" : "text-critical")}>
                {resultLabel(attempt)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
