import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { canAccessModule, type ModuleKey } from '@educonnect/shared';
import { useAuth } from '../contexts/AuthContext';

interface ModuleGuardProps {
  module: ModuleKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ModuleGuard: React.FC<ModuleGuardProps> = ({ module, children, fallback }) => {
  const { role, assignedModules, loading } = useAuth();

  if (loading) {
    return <div className="text-sm font-semibold text-slate-400">Loading access...</div>;
  }

  if (role && canAccessModule(role, module, assignedModules)) {
    return <>{children}</>;
  }

  return (
    <>
      {fallback || (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md text-center bg-white border border-slate-100 rounded-3xl p-10 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-5">
              <ShieldAlert size={28} />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Access denied</h1>
            <p className="text-slate-500 font-medium mt-2">
              Your account does not have access to this module.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
