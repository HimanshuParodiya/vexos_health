import { createBrowserRouter } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ROLES, ROLE_CONFIG } from "@/config/roles";
import { ROUTES } from "@/config/routes";
import { GuestRoute, LoginPage, ProtectedRoute, RoleRedirect, SignupPage } from "@/features/auth";
import { adminNav } from "@/features/admin/admin.nav";
import { doctorNav } from "@/features/doctor/doctor.nav";
import { nurseNav } from "@/features/nurse/nurse.nav";
import { ComingSoonPage } from "@/pages/ComingSoonPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { UnauthorizedPage } from "@/pages/UnauthorizedPage";

// One entry per role module. Dashboards are code-split (route `lazy`),
// so each role only downloads its own charts. Adding a role = add it to config/roles.js,
// create its feature folder, and register it here.
const ROLE_MODULES = [
  {
    role: ROLES.DOCTOR,
    nav: doctorNav,
    loadDashboard: async () => (await import("@/features/doctor/pages/DoctorDashboard")).DoctorDashboard,
  },
  {
    role: ROLES.NURSE,
    nav: nurseNav,
    loadDashboard: async () => (await import("@/features/nurse/pages/NurseDashboard")).NurseDashboard,
  },
  {
    role: ROLES.ADMIN,
    nav: adminNav,
    loadDashboard: async () => (await import("@/features/admin/pages/AdminDashboard")).AdminDashboard,
  },
];

const roleRoutes = ROLE_MODULES.map(({ role, nav, loadDashboard }) => ({
  path: ROLE_CONFIG[role].dashboardPath,
  element: <ProtectedRoute allowedRoles={[role]} />,
  children: [
    {
      element: <DashboardLayout navItems={nav} />,
      children: [
        { index: true, lazy: async () => ({ Component: await loadDashboard() }) },
        { path: "*", element: <ComingSoonPage /> },
      ],
    },
  ],
}));

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
