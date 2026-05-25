import { Request, Response, NextFunction } from 'express';
import { FeesRepository } from './fees.repository.js';
import { AppError } from '../../middleware/error.js';

function hasFeeAccess(user: any) {
  return user.isAdmin || user.permissions?.manageFees || user.roles?.includes('accountant');
}
function canViewStudentFees(user: any, studentId: string) {
  return (
    hasFeeAccess(user) ||
    studentId === user.uid ||
    (user.permissions?.viewOwnRecords && user.linkedStudentIds?.includes(studentId))
  );
}

export class FeesController {
  static async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await FeesRepository.getReport(req.params.classId, req.tenantId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await FeesRepository.upload(
        req.body.records,
        { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId },
        req.tenantId!
      );
      res.status(201).json({ success: true, imported: result });
    } catch (error) {
      next(error);
    }
  }

  static async pay(req: Request, res: Response, next: NextFunction) {
    try {
      const { feeId, amount, method } = req.body;
      const result = await FeesRepository.pay(
        feeId,
        amount,
        method,
        { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId },
        req.tenantId!
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getStudentFees(req: Request, res: Response, next: NextFunction) {
    try {
      const { uid } = req.params;
      if (!canViewStudentFees(req.user!, uid)) throw new AppError('Forbidden', 403);
      const result = await FeesRepository.getStudentFees(uid, req.tenantId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
