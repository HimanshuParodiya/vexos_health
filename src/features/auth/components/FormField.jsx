import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Label + control + hint/error, with accessible wiring.
// `children` is a render function that receives the props for the control.
export function FormField({ id, label, error, hint, action, className, children }) {
  const messageId = `${id}-message`;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error || hint ? messageId : undefined,
      })}
      {(error || hint) && (
        <p
          id={messageId}
          className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
