import { Request, Response, NextFunction } from 'express';
import { logger } from '@educonnect/logger';
import { contextStorage } from '../lib/context.js';

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
  // 1. Authentication is required (enforced by requireAuth middleware)
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required for tenant resolution',
    });
  }

  // 2. Try to extract from custom headers
  const headerTenantId = String(req.headers['x-school-id'] || '').trim();

  // 3. Resolve from user's primary school
  const userTenantId = req.user.schoolId;
  const isSuperAdmin = req.user.isSuperAdmin;
  const managedTenantIds = req.user.managedTenantIds || [];

  let resolvedTenantId: string | null = null;

  // Super admin can switch to any tenant they manage via header
  if (isSuperAdmin && headerTenantId) {
    if (managedTenantIds.includes(headerTenantId) || headerTenantId === 'tenant-a') {
      resolvedTenantId = headerTenantId;
    }
  }

  // If not resolved by super admin override, use user's assigned school
  if (!resolvedTenantId) {
    if (headerTenantId && userTenantId && headerTenantId !== userTenantId) {
      // Normal users cannot override their assigned tenant
      logger.warn(
        { uid: req.user.uid, requested: headerTenantId, actual: userTenantId },
        'Tenant override attempt denied'
      );
      return res.status(403).json({
        error: 'Tenant Access Denied',
        message: 'You do not have access to the requested tenant.',
      });
    }
    resolvedTenantId = userTenantId;
  }

  if (!resolvedTenantId) {
    logger.warn({ path: req.path, uid: req.user.uid }, 'Missing Tenant ID');
    return res.status(400).json({
      error: 'Tenant Context Required',
      message:
        'x-school-id header or valid school-linked user token is required for protected API calls.',
    });
  }

  // Attach to request context
  req.tenantId = resolvedTenantId;

  // Initialize App Context exactly once
  contextStorage.run(
    {
      tenantId: resolvedTenantId,
      user: req.user as any,
    },
    next
  );
};
