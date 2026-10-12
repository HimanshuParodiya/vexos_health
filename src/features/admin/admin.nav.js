import { AlignLeft, BedDouble, Network, Settings, Users } from "lucide-react";
import { ROUTES } from "@/config/routes";

export const adminNav = [
  { to: ROUTES.ADMIN, label: "Users & access", icon: Users, end: true },
  { to: `${ROUTES.ADMIN}/sign-ins`, label: "Sign-in log", icon: AlignLeft },
  { to: `${ROUTES.ADMIN}/hl7`, label: "HL7 ingestion", icon: Network },
  { to: `${ROUTES.ADMIN}/beds`, label: "Beds", icon: BedDouble },
  { to: `${ROUTES.ADMIN}/settings`, label: "Hospital settings", icon: Settings },
];
