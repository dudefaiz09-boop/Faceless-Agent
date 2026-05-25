import { Request, Response, NextFunction } from 'express';
import { UsersRepository } from './users.repository.js';

export class UsersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UsersRepository.list(req.query as any, req);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async listTenants(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UsersRepository.listTenants(req);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UsersRepository.getAuditLogs(req.query as any, req.tenantId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updateOwnProfile(req: Request, res: Response, next: NextFunction) {
    try {
      await UsersRepository.updateOwnProfile(req.user!.uid, req.body, req.user!.email);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await UsersRepository.create(req.body, {
        uid: req.user!.uid,
        email: req.user!.email,
        schoolId: req.user!.schoolId,
      });
      res.status(201).json({ success: true, profile });
    } catch (error) {
      next(error);
    }
  }

  static async bulkImport(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await UsersRepository.bulkImport(req.body.users, req, {
        uid: req.user!.uid,
        email: req.user!.email,
        schoolId: req.user!.schoolId,
      });
      res.json({ success: true, results });
    } catch (error) {
      next(error);
    }
  }

  static async importCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await UsersRepository.bulkImport(req.body.users, req, {
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
      const profile = await UsersRepository.update(req.params.uid, req.body, {
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
      const profile = await UsersRepository.deactivate(req.params.uid, {
        uid: req.user!.uid,
        email: req.user!.email,
        schoolId: req.user!.schoolId,
      });
      res.json({ success: true, profile });
    } catch (error) {
      next(error);
    }
  }

  static async deleteRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await UsersRepository.deleteRequest(req.params.uid, {
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
