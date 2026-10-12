import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

// Pill-style tab bar whose tabs are routes (Board | Flowsheet | Trends).
// item: { to, label, end? }
export function SegmentedNav({ items, className }) {
  return (
    <nav className={cn("inline-flex rounded-lg border bg-muted p-0.5", className)} aria-label="Views">
      {items.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
              isActive && "bg-card font-medium text-foreground shadow-xs"
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
