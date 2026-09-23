import { Building2, LayoutDashboard, ScrollText, UserCog } from "lucide-react";
import { ROUTES } from "@/config/routes";

export const adminNav = [
  { to: ROUTES.ADMIN, label: "Overview", icon: LayoutDashboard, end: true },
  { to: `${ROUTES.ADMIN}/staff`, label: "Staff", icon: UserCog },
  { to: `${ROUTES.ADMIN}/departments`, label: "Departments", icon: Building2 },
  { to: `${ROUTES.ADMIN}/audit-log`, label: "Audit log", icon: ScrollText },
];
