import { Request, Response, NextFunction } from 'express';
import { logger } from '@educonnect/logger';
import { bindRequestTenantAndUser, getCorrelationId } from '../lib/context.js';
import { AppError } from './error.js';
import { getSupabaseAdmin } from '../lib/supabase.js';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

/**
 * Enterprise SaaS Tenancy Middleware
 * Ensures all API calls are strictly scoped to a specific school (tenant).
 */
export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  void resolveTenant(req, next);
};

const tenantCache = new Map<string, { active: boolean; expiresAt: number }>();
const TENANT_CACHE_TTL_MS = 60_000;

async function tenantExistsAndActive(tenantId: string) {
  const cached = tenantCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.active;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('data')
    .eq('collection', 'tenants')
    .eq('id', tenantId)
    .maybeSingle<{ data: Record<string, unknown> | null }>();

  if (error) throw error;

  if (!data?.data) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn(
        { tenantId, correlationId: getCorrelationId() },
        'Tenant record missing; allowing in non-production for migration compatibility'
      );
      return true;
    }
    return null;
  }

  const active = data.data.status !== 'inactive' && data.data.active !== false;
  tenantCache.set(tenantId, { active, expiresAt: Date.now() + TENANT_CACHE_TTL_MS });
  return active;
}

async function resolveTenant(req: Request, next: NextFunction) {
  if (!req.user) {
    return next(
      new AppError({
        code: 'AUTH_MISSING',
        message: 'Authentication required for tenant resolution',
        statusCode: 401,
      })
    );
  }

  const headerTenantId = String(req.headers['x-school-id'] || '').trim();
  const userTenantId = req.user.schoolId;
  const isSuperAdmin = req.user.isSuperAdmin;
  const managedTenantIds = req.user.managedTenantIds || [];

  let resolvedTenantId: string | null = null;

  if (isSuperAdmin && headerTenantId) {
    if (managedTenantIds.includes(headerTenantId)) {
      resolvedTenantId = headerTenantId;
      if (headerTenantId !== userTenantId) {
        logger.info(
          {
            uid: req.user.uid,
            requested: headerTenantId,
            correlationId: getCorrelationId(),
          },
          'Super admin tenant switch'
        );
      }
    } else {
      logger.warn(
        {
          uid: req.user.uid,
          requested: headerTenantId,
          managedTenantIds,
          correlationId: getCorrelationId(),
        },
        'Super admin tenant override denied'
      );
      return next(
        new AppError({
          code: 'TENANT_DENIED',
          message: 'Tenant Access Denied',
          statusCode: 403,
          details: { requestedTenantId: headerTenantId },
        })
      );
    }
  }

  if (!resolvedTenantId) {
    if (headerTenantId && userTenantId && headerTenantId !== userTenantId) {
      logger.warn(
        {
          uid: req.user.uid,
          requested: headerTenantId,
          actual: userTenantId,
          correlationId: getCorrelationId(),
        },
        'Tenant override attempt denied'
      );
      return next(
        new AppError({
          code: 'TENANT_MISMATCH',
          message: 'Tenant Access Denied',
          statusCode: 403,
          details: { requestedTenantId: headerTenantId, assignedTenantId: userTenantId },
        })
      );
    }
    resolvedTenantId = userTenantId;
  }

  if (!resolvedTenantId) {
    logger.warn(
      { path: req.path, uid: req.user.uid, correlationId: getCorrelationId() },
      'Missing Tenant ID'
    );
    return next(
      new AppError({
        code: 'TENANT_REQUIRED',
        message: 'Tenant Context Required',
        statusCode: 400,
      })
    );
  }

  const tenantStatus = await tenantExistsAndActive(resolvedTenantId);
  if (tenantStatus === null) {
    return next(
      new AppError({
        code: 'TENANT_NOT_FOUND',
        message: 'Tenant not found',
        statusCode: 403,
        details: { tenantId: resolvedTenantId },
      })
    );
  }
  if (tenantStatus === false) {
    return next(
      new AppError({
        code: 'TENANT_INACTIVE',
        message: 'Tenant is inactive',
        statusCode: 403,
        details: { tenantId: resolvedTenantId },
      })
    );
  }

  req.tenantId = resolvedTenantId;
  bindRequestTenantAndUser(resolvedTenantId, req.user as any);
  return next();
}
