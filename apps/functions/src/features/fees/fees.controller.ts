import { Request, Response, NextFunction } from 'express';
import { FeesRepository } from './fees.repository.js';
import { AppError } from '../../middleware/error.js';
import {
  actorHasRole,
  assertCanAccessClass,
  assertCanAccessStudent,
  assertStudentsBelongToClass,
} from '../../lib/authorization.js';

type AuthenticatedRequestUser = NonNullable<Request['user']>;

function hasFeeAccess(user: AuthenticatedRequestUser | undefined) {
  return (
    !!user && (user.isAdmin || user.permissions?.manageFees || user.roles?.includes('accountant'))
  );
}
function canViewStudentFees(user: AuthenticatedRequestUser, studentId: string) {
  return (
    hasFeeAccess(user) ||
    studentId === user.uid ||
    (actorHasRole(user, 'parent') && user.linkedStudentIds?.includes(studentId)) ||
    (user.permissions?.viewOwnRecords && user.linkedStudentIds?.includes(studentId))
  );
}

export class FeesController {
  static async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      if (!hasFeeAccess(req.user)) {
        await assertCanAccessClass(req.user!, req.params.classId, req.tenantId!);
      }
      const result = await FeesRepository.getReport(req.params.classId, req.tenantId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      await Promise.all(
        req.body.records.map(async (record: { studentId: string; classId: string }) => {
          if (!hasFeeAccess(req.user)) {
            await assertCanAccessClass(req.user!, record.classId, req.tenantId!);
          }
          await assertStudentsBelongToClass([record.studentId], record.classId, req.tenantId!);
        })
      );
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
      const result = await FeesRepository.pay(feeId, amount, method, req.user!, req.tenantId!);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getStudentFees(req: Request, res: Response, next: NextFunction) {
    try {
      const { uid } = req.params;
      if (!canViewStudentFees(req.user!, uid)) throw new AppError('Forbidden', 403);
      if (!hasFeeAccess(req.user)) {
        await assertCanAccessStudent(req.user!, uid, req.tenantId!);
      }
      const result = await FeesRepository.getStudentFees(uid, req.tenantId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
