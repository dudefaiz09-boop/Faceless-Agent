import React, { useEffect, useState } from 'react';
import { School, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listDocuments } from '../../lib/documents';
import { setStoredTenantId } from '../../lib/tenant';
import { cn } from '../../lib/utils';

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export const TenantSwitcher = () => {
  const { isSuperAdmin, managedTenantIds, schoolId } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isSuperAdmin && managedTenantIds.length > 0) {
      listDocuments<Tenant>('schools') // Legacy name for tenants in documents collection
        .then((data) => {
          setTenants(data.filter((t) => managedTenantIds.includes(t.id)));
        })
        .catch((err) => console.error('Failed to load tenants:', err));
    }
  }, [isSuperAdmin, managedTenantIds]);

  if (!isSuperAdmin || tenants.length <= 1) return null;

  const currentTenant = tenants.find((t) => t.id === schoolId) || {
    id: schoolId || '',
    name: 'Select School',
  };

  const switchTenant = (id: string) => {
    setStoredTenantId(id);
    setIsOpen(false);
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
      >
        <School size={18} className="text-blue-600" />
        <span className="truncate max-w-[120px]">{currentTenant.name}</span>
        <ChevronDown
          size={16}
          className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-2 left-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="px-4 py-2 mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Switch School
              </p>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => switchTenant(tenant.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-sm font-bold truncate',
                        tenant.id === schoolId
                          ? 'text-blue-600'
                          : 'text-slate-700 dark:text-slate-200'
                      )}
                    >
                      {tenant.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                      {tenant.slug}
                    </p>
                  </div>
                  {tenant.id === schoolId && <Check size={16} className="text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
