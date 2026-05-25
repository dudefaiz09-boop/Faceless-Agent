import { Request, Response, NextFunction } from 'express';
import { AttendanceRepository } from './attendance.repository.js';
import { AppError } from '../../middleware/error.js';

function canViewAttendance(user: NonNullable<Express.Request['user']>) {
  return (
    user.isAdmin ||
    user.permissions?.viewAttendance ||
    user.permissions?.manageAttendance ||
    user.permissions?.markAttendance ||
    user.permissions?.viewReports ||
    user.roles?.some((role) => ['principal', 'teacher', 'staff'].includes(role))
  );
}

function canViewStudentAttendance(user: NonNullable<Express.Request['user']>, studentId: string) {
  return (
    studentId === user.uid ||
    canViewAttendance(user) ||
    (user.permissions?.viewOwnRecords && user.linkedStudentIds?.includes(studentId))
  );
}

export class AttendanceController {
  static async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { classId } = req.params;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const stats = await AttendanceRepository.getReport(
        classId,
        req.tenantId!,
        startDate,
        endDate
      );
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { uid } = req.params;
      if (!canViewStudentAttendance(req.user!, uid)) {
        throw new AppError('Forbidden', 403);
      }
      const history = await AttendanceRepository.getHistory(uid, req.tenantId!);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const classId = req.params.classId || (req.query.classId as string);
      if (!classId) throw new AppError('classId is required', 400);
      const date = req.query.date as string | undefined;
      const result = await AttendanceRepository.list(classId, req.tenantId!, date);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async mark(req: Request, res: Response, next: NextFunction) {
    try {
      const { classId, date, records } = req.body;
      const result = await AttendanceRepository.mark(
        classId,
        date,
        records,
        req.tenantId!,
        req.user!.uid
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
