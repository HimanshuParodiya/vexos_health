import { Bell, ChartLine, LayoutGrid, User } from "lucide-react";
import { ROUTES } from "@/config/routes";

export const doctorNav = [
  { to: ROUTES.DOCTOR, label: "My patients", icon: User, end: true },
  { to: `${ROUTES.DOCTOR}/board`, label: "Unit board", icon: LayoutGrid },
  { to: `${ROUTES.DOCTOR}/alerts`, label: "Alerts", icon: Bell, badge: "alerts" },
  { to: `${ROUTES.DOCTOR}/analytics`, label: "Analytics", icon: ChartLine },
];
