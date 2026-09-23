import { Activity } from "lucide-react";
import { env } from "@/config/env";
import { cn } from "@/lib/utils";

export function BrandMark({ inverted = false, className }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold", inverted && "text-white", className)}>
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          inverted ? "bg-white/15 text-white" : "bg-primary text-primary-foreground"
        )}
      >
        <Activity className="size-4" />
      </span>
      {env.appName}
    </div>
  );
}
