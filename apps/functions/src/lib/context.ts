import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.js';

export interface UserContext {
  uid: string;
  email?: string;
  displayName?: string;
  role: string;
  roles: string[];
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  managedTenantIds?: string[];
  schoolId: string | null;
  classId?: string | null;
  classIds: string[];
  subjectIds?: string[];
  sectionIds?: string[];
  linkedStudentIds: string[];
  assignedModules?: string[];
  permissions: Record<string, boolean>;
  status?: 'active' | 'inactive';
}

export interface AppContext {
  correlationId: string;
  requestId: string;
  tenantId?: string;
  user?: UserContext;
  route?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  startedAt: number;
}

export const contextStorage = new AsyncLocalStorage<AppContext>();

// Backward-compatible alias for older middleware imports.
export const tenantContextStorage = contextStorage;

export function getContext(): AppContext {
  const context = contextStorage.getStore();
  if (!context) {
    throw new AppError({
      code: 'REQUEST_CONTEXT_MISSING',
      message: 'Request context is not initialized.',
      statusCode: 500,
      expose: false,
    });
  }
  return context;
}

export function tryGetContext(): AppContext | undefined {
  return contextStorage.getStore();
}

export function getTenantId(): string {
  const tenantId = getContext().tenantId;
  if (!tenantId) {
    throw new AppError({
      code: 'TENANT_REQUIRED',
      message: 'Tenant Context Required',
      statusCode: 400,
    });
  }
  return tenantId;
}

export function tryGetTenantId(): string | undefined {
  return contextStorage.getStore()?.tenantId;
}

export function getCorrelationId(): string | undefined {
  return contextStorage.getStore()?.correlationId;
}

export function getUser(): UserContext | undefined {
  return contextStorage.getStore()?.user;
}

export function requireRequestTenantId(): string {
  return getTenantId();
}

export function getRequestTenantId(): string | undefined {
  return tryGetTenantId();
}

export function getRequestUser(): UserContext | undefined {
  return getUser();
}

export function requireRequestUser(): UserContext {
  const user = getUser();
  if (!user) {
    throw new AppError({
      code: 'AUTH_MISSING',
      message: 'Authentication required',
      statusCode: 401,
    });
  }
  return user;
}

export function runWithContext<T>(context: AppContext, fn: () => T): T {
  return contextStorage.run(context, fn);
}

function normalizeCorrelationId(value: unknown) {
  if (typeof value !== 'string') return randomUUID();
  const trimmed = value.trim();
  return /^[a-zA-Z0-9._:-]{8,128}$/.test(trimmed) ? trimmed : randomUUID();
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = normalizeCorrelationId(req.headers['x-correlation-id']);
  const requestId = randomUUID();
  const context: AppContext = {
    correlationId,
    requestId,
    route: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    startedAt: Date.now(),
  };

  res.setHeader('x-correlation-id', correlationId);
  contextStorage.run(context, next);
}

export function bindRequestTenantAndUser(tenantId: string, user: UserContext) {
  const context = getContext();
  context.tenantId = tenantId;
  context.user = user;
}
