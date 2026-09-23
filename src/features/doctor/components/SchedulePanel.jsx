import { Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_LABEL = {
  completed: "Completed",
  "in-progress": "In consultation",
  waiting: "Waiting",
  scheduled: "Scheduled",
};

export function SchedulePanel({ schedule }) {
  const remaining = schedule.filter((slot) => slot.status !== "completed").length;

  return (
    <ChartCard
      title="Today's schedule"
      description={`${schedule.length} appointments · ${remaining} remaining`}
      contentClassName="grid gap-2"
    >
      {schedule.map((slot) => (
        <div
          key={slot.id}
          className={cn(
            "flex items-center gap-3 rounded-lg border p-3",
            slot.status === "in-progress" && "border-primary/40 bg-primary/5",
            slot.status === "completed" && "opacity-60"
          )}
        >
          <span className="w-12 shrink-0 text-sm text-muted-foreground tabular-nums">
            {formatTime(slot.time)}
          </span>
          <div className="grid min-w-0 flex-1">
            <span className="flex items-center gap-1.5 truncate text-sm font-medium">
              {slot.patient}
              <span className="font-normal text-muted-foreground">· {slot.age}y</span>
              {slot.type === "Video" && (
                <Video className="size-3.5 text-muted-foreground" aria-label="Video consultation" />
              )}
            </span>
            <span className="truncate text-xs text-muted-foreground">{slot.reason}</span>
          </div>
          <Badge variant={slot.status === "in-progress" ? "default" : "secondary"} className="shrink-0">
            {STATUS_LABEL[slot.status]}
          </Badge>
        </div>
      ))}
    </ChartCard>
  );
}
