import { AsyncLocalStorage } from 'node:async_hooks';
import { AppError } from '../middleware/error.js';

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

// Backward-compatible alias for older middleware imports.
export const tenantContextStorage = contextStorage;

export function getContext(): AppContext {
  const context = contextStorage.getStore();
  if (!context) {
    throw new AppError('Tenant application context is not initialized for this request.', 500);
  }
  return context;
}

export function tryGetContext(): AppContext | undefined {
  return contextStorage.getStore();
}

export function getTenantId(): string {
  return getContext().tenantId;
}

export function tryGetTenantId(): string | undefined {
  return contextStorage.getStore()?.tenantId;
}

export function getUser(): UserContext | undefined {
  return contextStorage.getStore()?.user;
}

export function runWithContext<T>(context: AppContext, fn: () => T): T {
  return contextStorage.run(context, fn);
}
