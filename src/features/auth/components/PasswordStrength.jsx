import { cn } from "@/lib/utils";

const RULES = [
  (value) => value.length >= 8,
  (value) => /[A-Z]/.test(value) && /[a-z]/.test(value),
  (value) => /[0-9]/.test(value),
  (value) => /[^A-Za-z0-9]/.test(value),
];

const LEVELS = [
  { label: "Too weak", color: "bg-destructive" },
  { label: "Weak", color: "bg-destructive" },
  { label: "Fair", color: "bg-amber-500" },
  { label: "Good", color: "bg-primary/70" },
  { label: "Strong", color: "bg-primary" },
];

export function PasswordStrength({ value = "" }) {
  if (!value) return null;
  const score = RULES.filter((rule) => rule(value)).length;
  const level = LEVELS[score];

  return (
    <div className="grid gap-1" aria-live="polite">
      <div className="flex gap-1">
        {RULES.map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full bg-muted transition-colors",
              index < score && level.color
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Password strength: {level.label}</p>
    </div>
  );
}
