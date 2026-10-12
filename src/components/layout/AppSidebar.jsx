import { NavLink } from "react-router-dom";
import { Activity, LogOut } from "lucide-react";
import { env } from "@/config/env";
import { initials } from "@/lib/clinical";
import { cn } from "@/lib/utils";

// Dark navigation rail. `badges` maps a nav item's `badge` key to a count.
export function AppSidebar({ navLabel, navItems, badges = {}, user, roleLabel, onLogout }) {
  return (
    <aside className="sticky top-0 hidden h-svh w-[200px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-[58px] items-center gap-2.5 px-5">
        <span className="flex size-7 items-center justify-center rounded-md bg-white/10 text-[#7fd6b8]">
          <Activity className="size-4" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-white">{env.appName}</span>
      </div>

      <p className="mt-3 px-5 font-mono text-[10px] tracking-[0.16em] text-sidebar-foreground/60 uppercase">{navLabel}</p>
      <nav className="mt-2 grid gap-0.5 px-2.5" aria-label="Main">
        {navItems.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-white/5 hover:text-white",
                isActive && "bg-sidebar-accent font-medium text-white hover:bg-sidebar-accent"
              )
            }
          >
            <Icon className="size-4 opacity-80" />
            {label}
            {badge && badges[badge] > 0 && (
              <span className="ml-auto rounded bg-[#e2672b] px-1.5 font-mono text-[11px] leading-5 text-white">
                {badges[badge]}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 px-4 py-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
          {initials(user?.fullName)}
        </span>
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-sm font-medium text-white">{user?.fullName}</span>
          <span className="truncate text-xs text-sidebar-foreground/70">
            {roleLabel}
            {user?.department ? ` · ${user.department}` : ""}
          </span>
        </span>
        <button
          type="button"
          onClick={onLogout}
          title="Sign out"
          className="rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" />
          <span className="sr-only">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
