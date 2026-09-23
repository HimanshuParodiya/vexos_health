import { NavLink, Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandMark } from "@/components/common/BrandMark";
import { OrganizationBadge } from "@/components/common/OrganizationBadge";
import { SearchBar } from "@/components/common/SearchBar";
import { ROLE_CONFIG } from "@/config/roles";
import { useAuth } from "@/features/auth";
import { cn } from "@/lib/utils";

function initials(name = "") {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// Shared shell for every role. Each role passes its own navigation items.
export function DashboardLayout({ navItems }) {
  const { user, role, logout } = useAuth();
  const roleConfig = ROLE_CONFIG[role];

  return (
    <div className="min-h-svh bg-muted/40 md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r bg-background md:flex md:flex-col">
        <div className="flex h-16 items-center border-b px-5">
          <BrandMark />
        </div>
        <nav className="grid gap-1 p-3" aria-label="Main">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary"
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <OrganizationBadge organization={user?.organization} />

          <SearchBar
            basePath={roleConfig?.dashboardPath ?? ""}
            placeholder={roleConfig?.searchPlaceholder}
            className="max-w-xl flex-1"
          />

          <Badge variant="secondary" className="hidden shrink-0 gap-1.5 xl:inline-flex">
            {roleConfig && <roleConfig.icon className="size-3.5" />}
            {roleConfig?.label}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" className="h-10 gap-2 px-2" />}
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                  {initials(user?.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left sm:grid">
                <span className="text-sm leading-tight font-medium">{user?.fullName}</span>
                <span className="text-xs leading-tight text-muted-foreground">
                  {user?.department}
                </span>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="grid">
                  <span className="text-foreground">{user?.fullName}</span>
                  <span className="truncate font-normal">{user?.email}</span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={logout}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <nav
          className="flex gap-1 overflow-x-auto border-b bg-background px-4 py-2 md:hidden"
          aria-label="Main"
        >
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground",
                  isActive && "bg-primary/10 font-medium text-primary"
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
