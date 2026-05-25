import { Request, Response, NextFunction } from 'express';
import { LibraryRepository } from './library.repository.js';

export class LibraryController {
  static async getBorrowHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LibraryRepository.getBorrowHistory(
        req.params.uid,
        req.tenantId!,
        req.user!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async listResources(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LibraryRepository.listResources(req.tenantId!, req.user!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async listBooks(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LibraryRepository.listBooks(req.tenantId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LibraryRepository.upload(
        req.body,
        { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId },
        req.tenantId!
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async borrow(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LibraryRepository.borrow(
        req.body.resourceId,
        { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId },
        req.tenantId!
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async return(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LibraryRepository.return(
        req.body.recordId,
        { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId },
        req.tenantId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updateResource(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LibraryRepository.updateResource(
        req.params.id,
        req.body,
        { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId },
        req.tenantId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async archiveResource(req: Request, res: Response, next: NextFunction) {
    try {
      await LibraryRepository.archiveResource(
        req.params.id,
        { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId },
        req.tenantId!
      );
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
