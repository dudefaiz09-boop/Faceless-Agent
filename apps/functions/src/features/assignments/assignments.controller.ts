import { Request, Response, NextFunction } from 'express';
import { AssignmentsRepository } from './assignments.repository.js';
import { AppError } from '../../middleware/error.js';

function canViewStudentAssignments(user: NonNullable<Express.Request['user']>, studentId: string) {
  return (
    studentId === user.uid ||
    user.isAdmin ||
    user.permissions?.manageAssignments ||
    user.permissions?.viewReports ||
    (user.permissions?.viewOwnRecords && user.linkedStudentIds?.includes(studentId))
  );
}

export class AssignmentsController {
  static async getClassReport(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await AssignmentsRepository.getClassReport(req.params.classId, req.tenantId!);
      res.json(report);
    } catch (error) {
      next(error);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { uid } = req.params;
      if (!canViewStudentAssignments(req.user!, uid)) throw new AppError('Forbidden', 403);
      const history = await AssignmentsRepository.getHistory(uid, req.tenantId!);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  static async getSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const submissions = await AssignmentsRepository.getSubmissions(
        req.params.assignmentId,
        req.tenantId!
      );
      res.json(submissions);
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const classId = req.params.classId || (req.query.classId as string);
      const assignments = await AssignmentsRepository.list(classId, req.tenantId!);
      res.json(assignments);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AssignmentsRepository.create(
        req.body,
        { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId },
        req.tenantId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async archive(req: Request, res: Response, next: NextFunction) {
    try {
      await AssignmentsRepository.archive(req.params.id, req.tenantId!, req.user!.uid);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id || req.body.assignmentId;
      const result = await AssignmentsRepository.submit(
        id,
        req.body,
        { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId },
        req.tenantId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async recheck(req: Request, res: Response, next: NextFunction) {
    try {
      await AssignmentsRepository.recheck(
        req.body,
        { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId },
        req.tenantId!
      );
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
