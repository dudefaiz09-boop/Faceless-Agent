import { Router } from 'express';
import { db } from '../lib/documents.js';
import { requireAnyPermission, requirePermission } from '../middleware/permissions.js';
import { AttendanceAnalytics } from '@educonnect/shared-analytics';
import { appEvents } from '../lib/events.js';
import {
  attendanceHistoryParamsSchema,
  attendanceListParamsSchema,
  attendanceListQuerySchema,
  attendanceReportParamsSchema,
  attendanceReportQuerySchema,
  markAttendanceSchema,
} from '../schemas/attendance.js';

const router: Router = Router();

type AttendanceStatus = 'present' | 'absent' | 'late';

type AttendanceEntry = {
  studentId: string;
  studentName?: string;
  status: AttendanceStatus;
};

type AttendanceDayRecord = {
  date?: string;
  classId?: string;
  records?: AttendanceEntry[];
  tenantId?: string;
  schoolId?: string | null;
};

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

function isTenantAttendance(
  record: Pick<AttendanceDayRecord, 'tenantId' | 'schoolId'>,
  tenantId?: string
) {
  return record.tenantId === tenantId || record.schoolId === tenantId;
}

const requireAttendanceViewer = requireAnyPermission([
  'viewAttendance',
  'manageAttendance',
  'markAttendance',
  'viewReports',
]);

router.get('/report/:classId', requireAttendanceViewer, async (req, res, next) => {
  try {
    const { classId } = attendanceReportParamsSchema.parse(req.params);
    const { startDate, endDate } = attendanceReportQuerySchema.parse(req.query);

    let query = db
      .collection('attendance')
      .where('tenantId', '==', req.tenantId)
      .where('classId', '==', classId);

    if (startDate) query = query.where('date', '>=', startDate);
    if (endDate) query = query.where('date', '<=', endDate);

    const snapshot = await query.get();

    const stats = snapshot.docs.map((doc) => {
      const data = (doc.data() || {}) as AttendanceDayRecord;
      const records = data.records || [];
      return AttendanceAnalytics.calculateStats(records, req.tenantId!, data.date);
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get('/history/:uid', async (req, res, next) => {
  try {
    const { uid } = attendanceHistoryParamsSchema.parse(req.params);

    if (!canViewStudentAttendance(req.user!, uid)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() || {} : {};

    if (userDoc.exists && userData.tenantId !== req.tenantId && userData.schoolId !== req.tenantId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
    }

    const classId = userData.classId;

    if (!classId) return res.json([]);

    const snapshot = await db
      .collection('attendance')
      .where('tenantId', '==', req.tenantId)
      .where('classId', '==', classId)
      .get();

    const history = snapshot.docs
      .map((doc) => {
        const data = (doc.data() || {}) as AttendanceDayRecord;
        const record = data.records?.find((entry) => entry.studentId === uid);

        return record
          ? {
              id: doc.id,
              date: data.date,
              status: record.status,
            }
          : null;
      })
      .filter(Boolean);

    res.json(history);
  } catch (error) {
    next(error);
  }
});

router.get('/:classId?', requireAttendanceViewer, async (req, res, next) => {
  try {
    const { classId: paramClassId } = attendanceListParamsSchema.parse(req.params);
    const { classId: queryClassId, date } = attendanceListQuerySchema.parse(req.query);
    const classId = paramClassId || queryClassId;

    if (!classId) {
      return res.status(400).json({ error: 'classId is required' });
    }

    let query = db
      .collection('attendance')
      .where('tenantId', '==', req.tenantId)
      .where('classId', '==', classId);

    if (date) {
      query = query.where('date', '==', date);
    }

    const snapshot = await query.get();
    const days = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as AttendanceDayRecord),
    }));

    if (date) {
      const day = days[0];
      const records = day?.records || [];

      return res.json(
        records.map((record) => ({
          id: `${day.id}_${record.studentId}`,
          classId,
          date,
          ...record,
        }))
      );
    }

    res.json(days);
  } catch (error) {
    next(error);
  }
});

router.post('/mark', requirePermission('markAttendance'), async (req, res, next) => {
  try {
    const { classId, date, records } = markAttendanceSchema.parse(req.body);

    const docId = `${classId}_${date}`;
    const attendanceRef = db.collection('attendance').doc(docId);
    const existing = await attendanceRef.get();

    if (existing.exists && !isTenantAttendance(existing.data() as AttendanceDayRecord, req.tenantId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
    }

    const normalizedRecords = records.map((record) => ({
      studentId: record.studentId,
      studentName: record.studentName || '',
      status: record.status,
    }));

    await attendanceRef.set({
      tenantId: req.tenantId,
      schoolId: req.tenantId,
      classId,
      date,
      records: normalizedRecords,
      markedBy: req.user!.uid,
      updatedAt: new Date().toISOString(),
    });

    appEvents.emit('attendanceMarked', {
      tenantId: req.tenantId,
      schoolId: req.tenantId,
      actorId: req.user!.uid,
      classId,
      date,
      records: normalizedRecords,
    });

    res.json({ success: true, count: normalizedRecords.length });
  } catch (error) {
    next(error);
  }
});

export default router;
