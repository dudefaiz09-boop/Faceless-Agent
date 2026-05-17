import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/documents.js';
import { logger } from '@educonnect/logger';
import { getUserRole, hasPermission as userHasPermission } from '@educonnect/shared';

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
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: (decodedToken as any).name,
        role,
        roles: roles.length > 0 ? roles : [role],
        isAdmin: !!decodedToken.isAdmin || role === 'admin' || roles.includes('admin'),
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
        return res.status(403).json({ error: 'User account is inactive' });
      }
    } catch (error: any) {
      logger.error({ err: error, path: req.path }, 'Error verifying token');
    }
  }
  next();
};

export const checkPermission =
  (perm: string) => (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (userHasPermission(user, perm)) {
      return next();
    }

    logger.warn({ uid: user.uid, roles: user.roles, perm, path: req.path }, 'Permission denied');
    res.status(403).json({
      error: 'Forbidden',
      message: `Missing required permission: ${perm}`,
      userRole: user.roles,
    });
  };

export const checkAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.isAdmin || user.role === 'admin' || user.roles.includes('admin')) return next();

  logger.warn({ uid: user.uid, roles: user.roles, path: req.path }, 'Admin access denied');
  return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
};
