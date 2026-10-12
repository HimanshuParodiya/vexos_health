import { ROLES } from "@/config/roles";
import { useAuth } from "@/features/auth";

// Where each clinical view lives for the signed-in role. Doctors open the flowsheet read-only as "chart".
const CLINICAL_PATHS = {
  [ROLES.NURSE]: {
    board: "/nurse",
    flowsheet: "/nurse/flowsheet",
    trends: "/nurse/trends",
    alerts: "/nurse/alerts",
  },
  [ROLES.DOCTOR]: {
    board: "/doctor/board",
    flowsheet: "/doctor/chart",
    trends: "/doctor/trends",
    alerts: "/doctor/alerts",
  },
};

export function useClinicalPaths() {
  const { role } = useAuth();
  return CLINICAL_PATHS[role] ?? CLINICAL_PATHS[ROLES.NURSE];
}

export function withBed(path, bedId) {
  return bedId ? `${path}?bed=${encodeURIComponent(bedId)}` : path;
}

// Board | Flowsheet | Trends tabs, keeping the selected bed when there is one.
export function useViewTabs(bedId) {
  const paths = useClinicalPaths();
  return [
    { to: paths.board, label: "Board", end: true },
    { to: withBed(paths.flowsheet, bedId), label: "Flowsheet" },
    { to: withBed(paths.trends, bedId), label: "Trends" },
  ];
}
