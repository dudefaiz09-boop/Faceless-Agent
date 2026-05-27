export const SELECTED_TENANT_STORAGE_KEY = 'educonnect_selected_tenant_id';
export const LEGACY_TENANT_STORAGE_KEY = 'educonnect_school_id';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function isValidTenantId(
  value: string | null | undefined,
  allowedTenantIds?: string[]
): value is string {
  if (!value) return false;
  if (allowedTenantIds?.length) return allowedTenantIds.includes(value);
  return false;
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
    return managedTenantIds[0] || options.defaultTenantId || null;
  }

  const profileTenantId = options.profileTenantId || options.defaultTenantId || null;
  if (profileTenantId) {
    return profileTenantId;
  }

  return getStoredTenantId();
}

export function getActiveTenantId(defaultTenantId?: string | null) {
  return getStoredTenantId() || defaultTenantId || null;
}
