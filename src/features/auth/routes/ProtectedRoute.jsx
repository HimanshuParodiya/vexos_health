import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { FullPageLoader } from "@/features/auth/components/FullPageLoader";

// Guards a route tree. Pass `allowedRoles` to restrict it to specific roles.
export function ProtectedRoute({ allowedRoles }) {
  const { status, role } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageLoader />;

  if (status !== "authenticated") {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return <Outlet />;
}
