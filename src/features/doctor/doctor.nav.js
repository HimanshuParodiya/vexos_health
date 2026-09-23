import { CalendarDays, FileText, LayoutDashboard, Users } from "lucide-react";
import { ROUTES } from "@/config/routes";

export const doctorNav = [
  { to: ROUTES.DOCTOR, label: "Overview", icon: LayoutDashboard, end: true },
  { to: `${ROUTES.DOCTOR}/patients`, label: "My patients", icon: Users },
  { to: `${ROUTES.DOCTOR}/appointments`, label: "Appointments", icon: CalendarDays },
  { to: `${ROUTES.DOCTOR}/prescriptions`, label: "Prescriptions", icon: FileText },
];
