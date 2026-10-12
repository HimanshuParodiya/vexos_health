import { NavLink, Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { OrganizationBadge } from "@/components/common/OrganizationBadge";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { LiveStatus, PlainClock } from "@/components/layout/LiveStatus";
import { ROLES, ROLE_CONFIG } from "@/config/roles";
import { useAuth } from "@/features/auth";
import { PatientSearch } from "@/features/unit/components/PatientSearch";
import { useOptionalUnitData } from "@/features/unit/unit-context";
import { cn } from "@/lib/utils";

const ROLE_BADGE = {
  [ROLES.NURSE]: "bg-[#e3e8f6] text-[#2c3e75]",
  [ROLES.DOCTOR]: "bg-good-surface text-good",
  [ROLES.ADMIN]: "bg-[#ece6f6] text-[#4b3b78]",
};

// Shared shell for every role. Clinical roles (nurse, doctor) render inside
// <ClinicalProviders>, which adds the live stream, bed search and alert badge.
export function DashboardLayout({ navItems, navLabel, clinical = false }) {
  const { user, role, logout } = useAuth();
  const unit = useOptionalUnitData();
  const roleConfig = ROLE_CONFIG[role];

  const hospital = unit?.hospital;
  const organization = hospital
    ? { name: hospital.name, logoUrl: hospital.logo_url || null }
    : user?.organization;
  const subtitle = clinical
    ? [hospital?.facility_id, unit?.beds.length ? `${unit.beds.length} beds` : null].filter(Boolean).join(" · ") || "ICU"
    : "Organization · all units";

  return (
    <div className="flex min-h-svh bg-background">
      <AppSidebar
        navLabel={navLabel}
        navItems={navItems}
        badges={{ alerts: unit?.alerts.length ?? 0 }}
        user={user}
        roleLabel={roleConfig?.label}
        onLogout={logout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[58px] items-center gap-4 border-b bg-card px-4 sm:px-6">
          <OrganizationBadge organization={organization} subtitle={subtitle} className="shrink-0" />
          {clinical && <PatientSearch className="mx-auto max-w-md" />}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {clinical ? <LiveStatus /> : <PlainClock />}
            <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", ROLE_BADGE[role])}>
              {roleConfig?.label}
            </span>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden"
            >
              <LogOut className="size-4" />
              <span className="sr-only">Sign out</span>
            </button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b bg-card px-4 py-2 md:hidden" aria-label="Main">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground",
                  isActive && "bg-sidebar font-medium text-white"
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
