export const SELECTED_TENANT_STORAGE_KEY = 'educonnect_selected_tenant_id';
export const LEGACY_TENANT_STORAGE_KEY = 'educonnect_school_id';

export const DEMO_TENANTS = [
  { id: 'tenant-a', name: 'EduConnect Demo Academy', slug: 'educonnect-demo-academy' },
  {
    id: 'tenant-b',
    name: 'EduConnect International School',
    slug: 'educonnect-international-school',
  },
] as const;

export const DEMO_TENANT_IDS = ['tenant-a', 'tenant-b'] as const;

export const DEMO_CLASSES_BY_TENANT: Record<
  (typeof DEMO_TENANT_IDS)[number],
  Array<{ id: string; label: string; section: string }>
> = {
  'tenant-a': [
    { id: 'A1', label: 'Class 10A', section: 'A' },
    { id: 'A2', label: 'Class 10B', section: 'B' },
  ],
  'tenant-b': [
    { id: 'B1', label: 'Class 9A', section: 'A' },
    { id: 'B2', label: 'Class 9B', section: 'B' },
  ],
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function isValidTenantId(value: string | null | undefined, allowedTenantIds?: string[]) {
  if (!value) return false;
  if (allowedTenantIds?.length) return allowedTenantIds.includes(value);
  return DEMO_TENANT_IDS.includes(value as (typeof DEMO_TENANT_IDS)[number]);
}

export function getStoredTenantId(allowedTenantIds?: string[]) {
  if (!isBrowser()) return null;

  const selected = window.localStorage.getItem(SELECTED_TENANT_STORAGE_KEY);
  if (isValidTenantId(selected, allowedTenantIds)) return selected;

  const legacy = window.localStorage.getItem(LEGACY_TENANT_STORAGE_KEY);
  if (isValidTenantId(legacy, allowedTenantIds)) {
    window.localStorage.setItem(SELECTED_TENANT_STORAGE_KEY, legacy);
    return legacy;
  }

  return null;
}

export function setStoredTenantId(tenantId: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SELECTED_TENANT_STORAGE_KEY, tenantId);
  window.localStorage.setItem(LEGACY_TENANT_STORAGE_KEY, tenantId);
}

export function clearStoredTenantId() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SELECTED_TENANT_STORAGE_KEY);
}

export function resolveActiveTenantId(options: {
  isSuperAdmin?: boolean;
  managedTenantIds?: string[];
  profileTenantId?: string | null;
  defaultTenantId?: string | null;
}) {
  const managedTenantIds = options.managedTenantIds || [];

  if (options.isSuperAdmin) {
    const stored = getStoredTenantId(managedTenantIds);
    if (stored) return stored;
    if (managedTenantIds.includes('tenant-a')) return 'tenant-a';
    return managedTenantIds[0] || options.defaultTenantId || null;
  }

  const profileTenantId = options.profileTenantId || options.defaultTenantId || null;
  if (profileTenantId) {
    return profileTenantId;
  }

  return getStoredTenantId();
}

export function getDefaultClassId(tenantId?: string | null) {
  if (tenantId === 'tenant-b') return 'B1';
  return 'A1';
}

export function getDemoClassesForTenant(tenantId?: string | null) {
  const validTenantId = isValidTenantId(tenantId) ? tenantId : 'tenant-a';
  return DEMO_CLASSES_BY_TENANT[validTenantId as (typeof DEMO_TENANT_IDS)[number]];
}

export function getActiveTenantId(defaultTenantId?: string | null) {
  return getStoredTenantId() || defaultTenantId || 'tenant-a';
}
