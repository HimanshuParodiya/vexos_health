import { Check } from "lucide-react";
import { ROLE_CONFIG } from "@/config/roles";
import { cn } from "@/lib/utils";

// Radio group rendered as selectable cards.
export function RolePicker({ roles, value, onChange, invalid, name = "role" }) {
  return (
    <div
      role="radiogroup"
      aria-label="Role"
      aria-invalid={invalid || undefined}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {roles.map((role) => {
        const { label, description, icon: Icon } = ROLE_CONFIG[role];
        const selected = value === role;
        return (
          <label
            key={role}
            className={cn(
              "relative flex cursor-pointer gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/50",
              "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              selected && "border-primary bg-primary/5 ring-1 ring-primary",
              invalid && !value && "border-destructive"
            )}
          >
            <input
              type="radio"
              name={name}
              value={role}
              checked={selected}
              onChange={() => onChange(role)}
              className="sr-only"
            />
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors",
                selected && "bg-primary text-primary-foreground"
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="grid gap-0.5 pr-4">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs leading-snug text-muted-foreground">{description}</span>
            </span>
            {selected && <Check className="absolute top-3 right-3 size-4 text-primary" />}
          </label>
        );
      })}
    </div>
  );
}
