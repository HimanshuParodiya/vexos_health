import { createBrowserRouter } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ROLES, ROLE_CONFIG } from "@/config/roles";
import { ROUTES } from "@/config/routes";
import { GuestRoute, LoginPage, ProtectedRoute, RoleRedirect, SignupPage } from "@/features/auth";
import { adminNav } from "@/features/admin/admin.nav";
import { doctorNav } from "@/features/doctor/doctor.nav";
import { nurseNav } from "@/features/nurse/nurse.nav";
import { FullPageLoader } from "@/features/auth/components/FullPageLoader";
import { ClinicalProviders } from "@/features/unit/ClinicalProviders";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { UnauthorizedPage } from "@/pages/UnauthorizedPage";

// Code-split page loaders (route `lazy`), so each role only downloads its own screens.
const page = (load, props) => async () => {
  const Component = await load();
  return props ? { element: <Component {...props} /> } : { Component };
};

const unitBoard = page(async () => (await import("@/features/unit/pages/UnitBoardPage")).UnitBoardPage);
const flowsheet = (props) => page(async () => (await import("@/features/flowsheet/pages/FlowsheetPage")).FlowsheetPage, props);
const trends = page(async () => (await import("@/features/trends/pages/VitalsTrendsPage")).VitalsTrendsPage);
const alerts = page(async () => (await import("@/features/unit/pages/AlertsPage")).AlertsPage);

// One entry per role module. Adding a role = add it to config/roles.js,
// create its feature folder, and register it here.
const ROLE_MODULES = [
  {
    role: ROLES.NURSE,
    nav: nurseNav,
    navLabel: "Nursing",
    clinical: true,
    routes: [
      { index: true, lazy: unitBoard },
      { path: "flowsheet", lazy: flowsheet() },
      { path: "trends", lazy: trends },
      { path: "alerts", lazy: alerts },
    ],
  },
  {
    role: ROLES.DOCTOR,
    nav: doctorNav,
    navLabel: "Clinician",
    clinical: true,
    routes: [
      { index: true, lazy: page(async () => (await import("@/features/doctor/pages/MyPatientsPage")).MyPatientsPage) },
      { path: "board", lazy: unitBoard },
      { path: "chart", lazy: flowsheet({ readOnly: true }) },
      { path: "trends", lazy: trends },
      { path: "alerts", lazy: alerts },
      { path: "analytics", lazy: page(async () => (await import("@/features/doctor/pages/AnalyticsPage")).AnalyticsPage) },
    ],
  },
  {
    role: ROLES.ADMIN,
    nav: adminNav,
    navLabel: "Administration",
    clinical: false,
    routes: [
      { index: true, lazy: page(async () => (await import("@/features/admin/pages/UsersAccessPage")).UsersAccessPage) },
      { path: "sign-ins", lazy: page(async () => (await import("@/features/admin/pages/SignInLogPage")).SignInLogPage) },
      { path: "hl7", lazy: page(async () => (await import("@/features/admin/pages/Hl7IngestionPage")).Hl7IngestionPage) },
      { path: "beds", lazy: page(async () => (await import("@/features/admin/pages/BedsPage")).BedsPage) },
      { path: "settings", lazy: page(async () => (await import("@/features/admin/pages/HospitalSettingsPage")).HospitalSettingsPage) },
    ],
  },
];

const roleRoutes = ROLE_MODULES.map(({ role, nav, navLabel, clinical, routes }) => {
  const layout = <DashboardLayout navItems={nav} navLabel={navLabel} clinical={clinical} />;
  return {
    path: ROLE_CONFIG[role].dashboardPath,
    element: <ProtectedRoute allowedRoles={[role]} />,
    hydrateFallbackElement: <FullPageLoader />,
    children: [
      {
        element: clinical ? <ClinicalProviders>{layout}</ClinicalProviders> : layout,
        children: [...routes, { path: "*", element: <NotFoundPage /> }],
      },
    ],
  };
});

export const router = createBrowserRouter([
  { path: "/", element: <RoleRedirect /> },
  {
    element: <GuestRoute />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.SIGNUP, element: <SignupPage /> },
    ],
  },
  ...roleRoutes,
  { path: ROUTES.UNAUTHORIZED, element: <UnauthorizedPage /> },
  { path: "*", element: <NotFoundPage /> },
]);
