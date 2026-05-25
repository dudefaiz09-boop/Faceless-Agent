import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/documents.js';
import { logger } from '@educonnect/logger';
import { getUserRole, hasPermission as userHasPermission } from '@educonnect/shared';
import { AppError } from './error.js';
import { getCorrelationId, getContext, type UserContext } from '../lib/context.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        displayName?: string;
        role: string;
        roles: string[];
        isAdmin: boolean;
        isSuperAdmin?: boolean;
        managedTenantIds?: string[];
        schoolId: string | null;
        classId: string | null;
        classIds: string[];
        subjectIds: string[];
        sectionIds: string[];
        linkedStudentIds: string[];
        assignedModules: string[];
        permissions: Record<string, boolean>;
        status: 'active' | 'inactive';
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const roles = (decodedToken.roles as string[]) || [];
      const role = (decodedToken.role as string) || getUserRole(roles);
      const classId = (decodedToken.classId as string) || null;
      const classIds = (decodedToken.classIds as string[]) || (classId ? [classId] : []);
      const isSuperAdmin = !!decodedToken.isSuperAdmin;
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: (decodedToken as { name?: string }).name,
        role,
        roles: roles.length > 0 ? roles : [role],
        isAdmin:
          !!decodedToken.isAdmin || role === 'admin' || roles.includes('admin') || isSuperAdmin,
        isSuperAdmin,
        managedTenantIds: (decodedToken.managedTenantIds as string[]) || [],
        schoolId: (decodedToken.schoolId as string) || null,
        classId,
        classIds,
        subjectIds: (decodedToken.subjectIds as string[]) || [],
        sectionIds: (decodedToken.sectionIds as string[]) || [],
        linkedStudentIds: (decodedToken.linkedStudentIds as string[]) || [],
        assignedModules: (decodedToken.assignedModules as string[]) || [],
        permissions: (decodedToken.permissions as Record<string, boolean>) || {},
        status: (decodedToken.status as string) === 'inactive' ? 'inactive' : 'active',
      };

      if (req.user.status === 'inactive') {
        return next(
          new AppError({
            code: 'USER_INACTIVE',
            message: 'User account is inactive',
            statusCode: 403,
          })
        );
      }

      const context = getContext();
      context.user = req.user as UserContext;
    } catch (error: unknown) {
      const errRecord =
        error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
      const providerStatus = Number(errRecord.status || errRecord.statusCode || 401);
      const message = String(errRecord.message || '').toLowerCase();
      const code = message.includes('expired') ? 'AUTH_EXPIRED' : 'AUTH_INVALID';

      logger.warn(
        {
          providerStatus,
          path: req.path,
          correlationId: getCorrelationId(),
        },
        'Token verification failed'
      );

      return next(
        new AppError({
          code,
          message: code === 'AUTH_EXPIRED' ? 'Authentication token expired' : 'Invalid token',
          statusCode: 401,
        })
      );
    }
  }
  next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(
      new AppError({
        code: 'AUTH_MISSING',
        message: 'Authentication required',
        statusCode: 401,
      })
    );
  }
  return next();
};

export const checkPermission =
  (perm: string) => (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return next(
        new AppError({
          code: 'AUTH_MISSING',
          message: 'Authentication required',
          statusCode: 401,
        })
      );
    }
    if (userHasPermission(user, perm)) {
      return next();
    }

    logger.warn(
      { uid: user.uid, roles: user.roles, perm, path: req.path, correlationId: getCorrelationId() },
      'Permission denied'
    );
    return next(
      new AppError({
        code: 'PERMISSION_DENIED',
        message: `Missing required permission: ${perm}`,
        statusCode: 403,
        details: { permission: perm, roles: user.roles },
      })
    );
  };

export const checkAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return next(
      new AppError({
        code: 'AUTH_MISSING',
        message: 'Authentication required',
        statusCode: 401,
      })
    );
  }
  if (user.isAdmin || user.role === 'admin' || user.roles.includes('admin')) return next();

  logger.warn(
    { uid: user.uid, roles: user.roles, path: req.path, correlationId: getCorrelationId() },
    'Admin access denied'
  );
  return next(
    new AppError({
      code: 'PERMISSION_DENIED',
      message: 'Admin access required',
      statusCode: 403,
      details: { role: 'admin' },
    })
  );
};
