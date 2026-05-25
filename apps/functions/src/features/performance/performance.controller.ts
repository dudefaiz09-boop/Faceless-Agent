import { Request, Response, NextFunction } from 'express';
import { PerformanceRepository } from './performance.repository.js';
import { AppError } from '../../middleware/error.js';

function canViewPerformance(user: any) {
  return (
    user.isAdmin ||
    user.permissions?.viewPerformance ||
    user.permissions?.managePerformance ||
    user.permissions?.viewReports ||
    user.roles?.some((r: string) => ['principal', 'teacher'].includes(r))
  );
}
function canViewStudentPerformance(user: any, studentId: string) {
  return (
    studentId === user.uid ||
    canViewPerformance(user) ||
    (user.permissions?.viewOwnRecords && user.linkedStudentIds?.includes(studentId))
  );
}

export class PerformanceController {
  static async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PerformanceRepository.getReport(req.params.classId, req.tenantId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
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
      const result = await PerformanceRepository.getStudentPerformance(studentId, req.tenantId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
