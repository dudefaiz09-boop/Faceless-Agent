import type { Request, Response, NextFunction } from 'express';
import { hasPermission } from '@educonnect/shared';
import { AppError } from './error.js';

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError({
      code: 'AUTH_MISSING',
      message: 'Authentication required',
      statusCode: 401,
    });
  }
  return req.user;
}

function denied(details: Record<string, unknown>) {
  return new AppError({
    code: 'PERMISSION_DENIED',
    message: 'You do not have permission to perform this action.',
    statusCode: 403,
    details,
  });
}

export const requirePermission =
  (permission: string) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      if (hasPermission(user, permission) || user.permissions[permission]) return next();
      return next(denied({ permission }));
    } catch (error) {
      return next(error);
    }
  };

export const requireAnyPermission =
  (permissions: string[]) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      if (
        permissions.some(
          (permission) => hasPermission(user, permission) || user.permissions[permission]
        )
      ) {
        return next();
      }
      return next(denied({ permissions }));
    } catch (error) {
      return next(error);
    }
  };

export const requireRole = (role: string) => requireAnyRole([role]);

export const requireAnyRole =
  (roles: string[]) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      if (roles.some((role) => user.roles.includes(role) || user.role === role)) return next();
      return next(denied({ roles }));
    } catch (error) {
      return next(error);
    }
  };

export const requireModuleAccess =
  (module: string) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      if (user.isAdmin || user.isSuperAdmin || user.assignedModules.includes(module)) return next();
      return next(denied({ module }));
    } catch (error) {
      return next(error);
    }
  };

export const requireTenantAdmin = requireAnyRole(['admin', 'tenant_admin']);
export const requireSuperAdmin = requireAnyRole(['super_admin']);

export const requireStudentSelfOrLinkedParent =
  (studentIdParam: string) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      const studentId = req.params[studentIdParam];
      if (
        user.isAdmin ||
        user.isSuperAdmin ||
        user.uid === studentId ||
        user.linkedStudentIds.includes(studentId)
      ) {
        return next();
      }
      return next(denied({ studentIdParam }));
    } catch (error) {
      return next(error);
    }
  };

export const requireClassAccess =
  (classIdParam: string) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      const classId = req.params[classIdParam];
      if (user.isAdmin || user.isSuperAdmin || user.classIds.includes(classId)) return next();
      return next(denied({ classIdParam }));
    } catch (error) {
      return next(error);
    }
  };
