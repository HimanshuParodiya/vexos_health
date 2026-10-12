import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUnitData } from "@/features/unit/unit-context";

export function AcknowledgeButton({ alert, size = "sm", className }) {
  const { acknowledgeAlert } = useUnitData();
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    setPending(true);
    try {
      await acknowledgeAlert(alert.alert_id);
      toast.success(`Acknowledged: ${alert.message}`);
    } catch (error) {
      toast.error(error.message || "Could not acknowledge alert");
      setPending(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={onClick} disabled={pending} className={className}>
      {pending && <Loader2 className="animate-spin" />}
      Acknowledge
    </Button>
  );
}
