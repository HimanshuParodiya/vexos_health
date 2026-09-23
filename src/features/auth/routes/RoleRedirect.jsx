import { Navigate } from "react-router-dom";
import { getDashboardPath } from "@/config/roles";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { FullPageLoader } from "@/features/auth/components/FullPageLoader";

// Sends "/" to the right place based on the role inside the JWT.
export function RoleRedirect() {
  const { status, role } = useAuth();

  if (status === "loading") return <FullPageLoader />;
  if (status !== "authenticated") return <Navigate to={ROUTES.LOGIN} replace />;

  return <Navigate to={getDashboardPath(role)} replace />;
}
