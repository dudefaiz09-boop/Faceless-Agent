import { AsyncLocalStorage } from 'node:async_hooks';

<<<<<<< HEAD
export interface TenantContext {
  tenantId: string;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantId(): string {
  const context = tenantContextStorage.getStore();
  return context?.tenantId || 'default-school';
=======
export interface UserContext {
  uid: string;
  email?: string;
  displayName?: string;
  role: string;
  roles: string[];
  schoolId: string;
  classId?: string | null;
  classIds: string[];
  linkedStudentIds: string[];
  permissions: Record<string, boolean>;
}

export interface AppContext {
  tenantId: string;
  user?: UserContext;
}

export const contextStorage = new AsyncLocalStorage<AppContext>();

export function getContext(): AppContext {
  const context = contextStorage.getStore();
  if (!context) {
    throw new Error('AppContext not found in current execution context');
  }
  return context;
}

export function getTenantId(): string {
  return getContext().tenantId;
}

export function getUser(): UserContext | undefined {
  return getContext().user;
}

export function runWithContext<T>(context: AppContext, fn: () => T): T {
  return contextStorage.run(context, fn);
>>>>>>> origin/main
}
