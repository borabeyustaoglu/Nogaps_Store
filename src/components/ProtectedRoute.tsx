import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { ReactNode } from 'react';
import { hasAnyRole } from '../utils/roles';

interface Props {
  children: ReactNode;
  requiredPermission?: string;
  requiredRoles?: string[];
}

export const ProtectedRoute = ({
  children,
  requiredPermission,
  requiredRoles,
}: Props) => {
  const { user, isAuthenticated, hasPermission } = useAuthStore();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasAnyRole(user?.role, requiredRoles)) {
      return <Navigate to="/403" replace />;
    }
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
