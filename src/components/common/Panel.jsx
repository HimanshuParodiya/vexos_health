import { cn } from "@/lib/utils";

// White bordered surface used for every board section.
export function Panel({ className, children, ...props }) {
  return (
    <section className={cn("min-w-0 rounded-lg border bg-card text-card-foreground", className)} {...props}>
      {children}
    </section>
  );
}

export function PanelHeader({ title, meta, actions, className }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3", className)}>
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {meta && <span className="font-mono text-xs text-muted-foreground">{meta}</span>}
      </div>
      {actions}
    </div>
  );
}
