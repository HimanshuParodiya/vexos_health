import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const PRIORITY = {
  urgent: { status: "critical", label: "Urgent" },
  high: { status: "serious", label: "High" },
  normal: null,
};

// Completion is local for now; call the API from toggle() once it exists.
export function CareTasks({ tasks }) {
  const [done, setDone] = useState(() => new Set());
  const toggle = (id) =>
    setDone((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ChartCard
      title="Care tasks"
      description={`${tasks.length - done.size} open · ordered by due time`}
      contentClassName="grid gap-2"
    >
      {tasks.map((task) => {
        const priority = PRIORITY[task.priority];
        const completed = done.has(task.id);
        return (
          <label
            key={task.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-opacity",
              completed && "opacity-50"
            )}
          >
            <Checkbox checked={completed} onCheckedChange={() => toggle(task.id)} />
            <div className="grid min-w-0 flex-1">
              <span className={cn("truncate text-sm font-medium", completed && "line-through")}>
                {task.task}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {task.bed} · {task.patient} · due {formatTime(task.due)}
              </span>
            </div>
            {priority && !completed && <StatusBadge status={priority.status} label={priority.label} />}
          </label>
        );
      })}
    </ChartCard>
  );
}
