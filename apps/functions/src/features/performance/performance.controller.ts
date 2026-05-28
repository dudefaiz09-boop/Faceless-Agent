import { Request, Response, NextFunction } from 'express';
import { PerformanceRepository } from './performance.repository.js';
import { AppError } from '../../middleware/error.js';
import {
  actorHasRole,
  assertCanAccessClass,
  assertCanAccessStudent,
  assertStudentsBelongToClass,
} from '../../lib/authorization.js';

type AuthenticatedRequestUser = NonNullable<Request['user']>;

function canViewPerformance(user: AuthenticatedRequestUser) {
  return (
    user.isAdmin ||
    user.permissions?.viewPerformance ||
    user.permissions?.managePerformance ||
    user.permissions?.viewReports ||
    user.roles?.some((r: string) => ['principal', 'teacher'].includes(r))
  );
}
function canViewStudentPerformance(user: AuthenticatedRequestUser, studentId: string) {
  return (
    studentId === user.uid ||
    canViewPerformance(user) ||
    (actorHasRole(user, 'parent') && user.linkedStudentIds?.includes(studentId)) ||
    (user.permissions?.viewOwnRecords && user.linkedStudentIds?.includes(studentId))
  );
}

export class PerformanceController {
  static async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      await assertCanAccessClass(req.user!, req.params.classId, req.tenantId!);
      const result = await PerformanceRepository.getReport(req.params.classId, req.tenantId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      await Promise.all(
        req.body.records.map(async (record: { studentId: string; classId: string }) => {
          await assertCanAccessClass(req.user!, record.classId, req.tenantId!);
          await assertStudentsBelongToClass([record.studentId], record.classId, req.tenantId!);
        })
      );
      const result = await PerformanceRepository.upload(
        req.body.records,
        { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId },
        req.tenantId!
      );
      res.status(201).json({ success: true, imported: result });
    } catch (error) {
      next(error);
    }
  }

  static async getStudentPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      if (!canViewStudentPerformance(req.user!, studentId)) throw new AppError('Forbidden', 403);
      await assertCanAccessStudent(req.user!, studentId, req.tenantId!);
      const result = await PerformanceRepository.getStudentPerformance(studentId, req.tenantId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
