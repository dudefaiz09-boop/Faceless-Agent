import { Request, Response, NextFunction } from 'express';
import { TeachersRepository } from './teachers.repository.js';

export class TeachersController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await TeachersRepository.create(req.body, {
        uid: req.user!.uid,
        email: req.user!.email,
        schoolId: req.user!.schoolId,
      });
      res.json({ success: true, uid: profile.uid, profile });
    } catch (error) {
      next(error);
    }
  }

  static async bulkImport(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await TeachersRepository.bulkImport(req.body.teachers, {
        uid: req.user!.uid,
        email: req.user!.email,
        schoolId: req.user!.schoolId,
      });
      res.json({ success: true, results });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await TeachersRepository.update(req.params.uid, req.body, {
        uid: req.user!.uid,
        email: req.user!.email,
        schoolId: req.user!.schoolId,
      });
      res.json({ success: true, profile });
    } catch (error) {
      next(error);
    }
  }

  static async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await TeachersRepository.deactivate(req.params.uid, {
        uid: req.user!.uid,
        email: req.user!.email,
        schoolId: req.user!.schoolId,
      });
      res.json({ success: true, profile });
    } catch (error) {
      next(error);
    }
  }
}
