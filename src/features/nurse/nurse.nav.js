import { Activity, BedDouble, LayoutDashboard, Pill } from "lucide-react";
import { ROUTES } from "@/config/routes";

export const nurseNav = [
  { to: ROUTES.NURSE, label: "Overview", icon: LayoutDashboard, end: true },
  { to: `${ROUTES.NURSE}/ward`, label: "Ward", icon: BedDouble },
  { to: `${ROUTES.NURSE}/vitals`, label: "Vitals", icon: Activity },
  { to: `${ROUTES.NURSE}/medication`, label: "Medication", icon: Pill },
];
