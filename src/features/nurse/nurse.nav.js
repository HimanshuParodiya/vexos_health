import { Activity, Bell, LayoutGrid, Table2 } from "lucide-react";
import { ROUTES } from "@/config/routes";

export const nurseNav = [
  { to: ROUTES.NURSE, label: "Unit board", icon: LayoutGrid, end: true },
  { to: `${ROUTES.NURSE}/flowsheet`, label: "Flowsheet", icon: Table2 },
  { to: `${ROUTES.NURSE}/trends`, label: "Vitals trends", icon: Activity },
  { to: `${ROUTES.NURSE}/alerts`, label: "Alerts", icon: Bell, badge: "alerts" },
];
