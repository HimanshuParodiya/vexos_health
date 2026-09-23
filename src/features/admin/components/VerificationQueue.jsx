import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { ROLE_CONFIG } from "@/config/roles";
import { adminService } from "@/features/admin/api";

function timeAgo(isoDate) {
  const hours = Math.round((Date.now() - new Date(isoDate).getTime()) / 3_600_000);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

export function VerificationQueue({ items }) {
  const [queue, setQueue] = useState(items);
  const [busyId, setBusyId] = useState(null);

  const review = async (item, decision) => {
    setBusyId(item.id);
    try {
      await adminService.reviewVerification(item.id, decision);
      setQueue((current) => current.filter((entry) => entry.id !== item.id));
      toast.success(`${item.name} ${decision === "approve" ? "approved" : "rejected"}`);
    } catch (error) {
      toast.error(error.message ?? "Could not update verification");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ChartCard
      title="Account verifications"
      description={`${queue.length} waiting for license check`}
      contentClassName="grid gap-2"
    >
      {queue.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          All caught up.
        </p>
      )}
      {queue.map((item) => (
        <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <div className="grid min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-medium">
              {item.name}
              <Badge variant="secondary">{ROLE_CONFIG[item.role]?.label}</Badge>
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {item.department} · {item.licenseNumber} · {timeAgo(item.submittedAt)}
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              aria-label={`Reject ${item.name}`}
              disabled={busyId === item.id}
              onClick={() => review(item, "reject")}
            >
              <X />
            </Button>
            <Button
              size="sm"
              disabled={busyId === item.id}
              onClick={() => review(item, "approve")}
            >
              <Check /> Approve
            </Button>
          </div>
        </div>
      ))}
    </ChartCard>
  );
}
