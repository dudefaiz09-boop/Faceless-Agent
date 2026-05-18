import { Request, Response, NextFunction } from 'express';
import { logger } from '@educonnect/logger';
import { tenantContextStorage } from '../lib/context.js';

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
  // 1. Try to extract from custom headers (e.g. injected by API Gateway or Frontend Client)
  const headerTenantId = req.headers['x-school-id'] as string;

  // 2. Try to infer from the authenticated user's custom claims (set during signup/provisioning)
  const userTenantId = (req.user as any)?.schoolId as string;
  const isSuperAdmin = (req.user as any)?.isSuperAdmin;
  const managedTenantIds = (req.user as any)?.managedTenantIds || [];

  let resolvedTenantId = headerTenantId || userTenantId;

  // Super admin can switch to any tenant they manage via header
  if (isSuperAdmin && headerTenantId && managedTenantIds.includes(headerTenantId)) {
    resolvedTenantId = headerTenantId;
  } else if (!isSuperAdmin && headerTenantId && headerTenantId !== userTenantId) {
    // Normal users cannot override their assigned tenant
    logger.warn(
      { uid: req.user?.uid, requested: headerTenantId, actual: userTenantId },
      'Tenant override attempt denied'
    );
    resolvedTenantId = userTenantId;
  }

  if (!resolvedTenantId) {
    logger.warn({ path: req.path, uid: req.user?.uid }, 'Missing Tenant ID (x-school-id)');
    // If strict multi-tenancy is fully enforced, this should return a 400 or 403.
    // For rolling migration, we attach 'default' or let it pass with a warning, but
    // since we want production-grade SaaS, we mandate it unless it's a public route.

    // Bypass for health checks
    if (req.path === '/api/health') {
      return next();
    }

    return res.status(400).json({
      error: 'Tenant Context Required',
      message:
        'x-school-id header or valid school-linked user token is required for all API calls.',
    });
  }

  // Attach to request context for downstream services
  req.tenantId = resolvedTenantId;

  // Initialize Enterprise Tenant Context Store
  tenantContextStorage.run({ tenantId: resolvedTenantId }, () => {
    next();
  });
};
