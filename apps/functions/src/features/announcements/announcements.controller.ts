import { Request, Response, NextFunction } from 'express';
import { AnnouncementsRepository } from './announcements.repository.js';

export class AnnouncementsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const role = req.user?.role || req.user?.roles?.[0] || 'student';
      const classIds = req.user?.classIds || (req.user?.classId ? [req.user.classId] : []);
      const announcements = await AnnouncementsRepository.list(req.tenantId!, role, classIds);
      res.json(announcements);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AnnouncementsRepository.create(
        req.body,
        {
          uid: req.user!.uid,
          email: req.user!.email,
          schoolId: req.user!.schoolId,
        },
        req.tenantId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async archive(req: Request, res: Response, next: NextFunction) {
    try {
      await AnnouncementsRepository.archive(req.params.id, req.tenantId!, req.user!.uid);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
