import { Request, Response, NextFunction } from 'express';
import { NotificationsRepository } from './notifications.repository.js';

export class NotificationsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await NotificationsRepository.list(req);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await NotificationsRepository.create(
        req.body,
        { uid: req.user!.uid },
        req.tenantId!
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await NotificationsRepository.markAllRead(req);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await NotificationsRepository.markRead(req.params.id, req);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async archiveRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await NotificationsRepository.archiveRead(req);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async archive(req: Request, res: Response, next: NextFunction) {
    try {
      await NotificationsRepository.archive(req.params.id, req);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
