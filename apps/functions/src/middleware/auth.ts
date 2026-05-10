import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/firebase';
import { logger } from '@educonnect/logger';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: (decodedToken as any).name,
        roles: (decodedToken.roles as string[]) || [],
        isAdmin: !!decodedToken.isAdmin,
        classId: (decodedToken.classId as string) || null,
        permissions: (decodedToken.permissions as Record<string, boolean>) || {}
      };
    } catch (error: any) {
      logger.error({ err: error, path: req.path }, 'Error verifying token');
    }
  }
  next();
};

export const checkPermission = (perm: string) => (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.isAdmin || (user.permissions && user.permissions[perm])) {
    return next();
  }
  
  logger.warn({ uid: user.uid, roles: user.roles, perm, path: req.path }, 'Permission denied');
  res.status(403).json({ 
    error: 'Forbidden', 
    message: `Missing required permission: ${perm}`,
    userRole: user.roles
  });
};
