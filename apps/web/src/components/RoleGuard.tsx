import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles, fallback = null }) => {
  const { role, loading } = useAuth();

  if (loading) return <div>Loading permissions...</div>;
  
  if (role && allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
