import { createBrowserRouter } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ROLES, ROLE_CONFIG } from "@/config/roles";
import { ROUTES } from "@/config/routes";
import { GuestRoute, LoginPage, ProtectedRoute, RoleRedirect, SignupPage } from "@/features/auth";
import { AdminDashboard } from "@/features/admin/pages/AdminDashboard";
import { adminNav } from "@/features/admin/admin.nav";
import { DoctorDashboard } from "@/features/doctor/pages/DoctorDashboard";
import { doctorNav } from "@/features/doctor/doctor.nav";
import { NurseDashboard } from "@/features/nurse/pages/NurseDashboard";
import { nurseNav } from "@/features/nurse/nurse.nav";
import { ComingSoonPage } from "@/pages/ComingSoonPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { UnauthorizedPage } from "@/pages/UnauthorizedPage";

// One entry per role module. Adding a role = add it to config/roles.js,
// create its feature folder, and register it here.
const ROLE_MODULES = [
  { role: ROLES.DOCTOR, nav: doctorNav, Dashboard: DoctorDashboard },
  { role: ROLES.NURSE, nav: nurseNav, Dashboard: NurseDashboard },
  { role: ROLES.ADMIN, nav: adminNav, Dashboard: AdminDashboard },
];

const roleRoutes = ROLE_MODULES.map(({ role, nav, Dashboard }) => ({
  path: ROLE_CONFIG[role].dashboardPath,
  element: <ProtectedRoute allowedRoles={[role]} />,
  children: [
    {
      element: <DashboardLayout navItems={nav} />,
      children: [
        { index: true, element: <Dashboard /> },
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
