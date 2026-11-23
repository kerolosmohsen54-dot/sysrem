import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PageState } from '../components/PageState';
import { useAuth } from './AuthProvider';

type PermissionGateProps = {
  permission?: string | string[];
  children: ReactNode;
};

export function PermissionGate({ permission, children }: PermissionGateProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageState kind="loading" />;
  if (status === 'error') return <PageState kind="error" />;
  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  const hasPermission = Array.isArray(permission)
    ? permission.some((item) => user.permissions.includes(item))
    : !permission || user.permissions.includes(permission);
  if (permission && !user.permissions.includes('*') && !hasPermission) {
    return <PageState kind="denied" />;
  }
  return children;
}
