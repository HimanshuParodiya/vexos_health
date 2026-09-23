import { Navigate, Outlet } from "react-router-dom";
import { getDashboardPath } from "@/config/roles";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { FullPageLoader } from "@/features/auth/components/FullPageLoader";

// For login/signup: signed-in users go straight to their dashboard.
export function GuestRoute() {
  const { status, role } = useAuth();

  if (status === "loading") return <FullPageLoader />;
  if (status === "authenticated") return <Navigate to={getDashboardPath(role)} replace />;

  return <Outlet />;
}
