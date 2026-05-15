import { Router } from 'express';
import { db } from '../lib/documents.js';
import { checkPermission } from '../middleware/auth.js';
import { AttendanceAnalytics } from '@educonnect/shared-analytics';
import { createNotification } from '../lib/notifications.js';
import { logger } from '@educonnect/logger';

const router: Router = Router();

type AttendanceStatus = 'present' | 'absent' | 'late';

type AttendanceEntry = {
  studentId: string;
  studentName?: string;
  status: AttendanceStatus;
};

function canViewAttendance(user: NonNullable<Express.Request['user']>) {
  return (
    user.isAdmin ||
    user.permissions.viewAttendance ||
    user.permissions.manageAttendance ||
    user.permissions.markAttendance ||
    user.permissions.viewReports ||
    user.roles.some((role) => ['principal', 'teacher', 'staff'].includes(role))
  );
}

function requireAttendanceViewer(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (canViewAttendance(req.user)) return next();
  return res.status(403).json({ error: 'Forbidden', message: 'Attendance access required' });
}

async function safeAttendanceNotification(input: Parameters<typeof createNotification>[0]) {
  try {
    await createNotification(input);
  } catch (error) {
    logger.warn({ err: error, title: input.title }, 'Attendance notification could not be created');
  }
}

router.get('/report/:classId', requireAttendanceViewer, async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    let query: any = db.collection('attendance')
      .where('tenantId', '==', req.tenantId)
      .where('classId', '==', classId);

    if (startDate) query = query.where('date', '>=', startDate);
    if (endDate) query = query.where('date', '<=', endDate);

    const snapshot = await query.get();
    
    const stats = snapshot.docs.map((doc: any) => {
      const data = doc.data() || {};
      // Flatten the record structure for the calculator
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
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { uid } = req.params;
    if (uid !== req.user.uid && !canViewAttendance(req.user)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get student's classId
    const userDoc = await db.collection('users').doc(uid).get();
    const classId = userDoc.exists ? userDoc.data()?.classId : null;
    
    if (!classId) return res.json([]);

    const snapshot = await db.collection('attendance')
      .where('tenantId', '==', req.tenantId)
      .where('classId', '==', classId)
      .get();
    const history = snapshot.docs.map((doc: any) => {
      const data = doc.data() || {};
      const record = data.records?.find((r: AttendanceEntry) => r.studentId === uid);
      return record ? { id: doc.id, date: data.date, status: record.status } : null;
    }).filter(Boolean);

    res.json(history);
  } catch (error) {
    next(error);
  }
});

router.get('/:classId?', requireAttendanceViewer, async (req, res, next) => {
  try {
    const classId = req.params.classId || (req.query.classId as string);
    const date = req.query.date as string;

    if (!classId) {
      return res.status(400).json({ error: 'classId is required' });
    }

    let query: any = db.collection('attendance')
      .where('tenantId', '==', req.tenantId)
      .where('classId', '==', classId);

    if (date) {
      query = query.where('date', '==', date);
    }

    const snapshot = await query.get();
    const days = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    if (date) {
      const day = days[0];
      const records = (day?.records || []) as AttendanceEntry[];
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

router.post('/mark', checkPermission('markAttendance'), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { classId, date, records } = req.body;
    if (!classId || !date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'classId, date, and records are required' });
    }

    const docId = `${classId}_${date}`;
    const normalizedRecords = records.map((record: AttendanceEntry) => ({
      studentId: String(record.studentId || '').trim(),
      studentName: record.studentName || '',
      status: ['present', 'absent', 'late'].includes(record.status) ? record.status : 'absent',
    })).filter((record: AttendanceEntry) => record.studentId);

    await db.collection('attendance').doc(docId).set({
      tenantId: req.tenantId,
      schoolId: req.user.schoolId,
      classId,
      date,
      records: normalizedRecords,
      markedBy: req.user.uid,
      updatedAt: new Date().toISOString(),
    });

    await Promise.all(
      normalizedRecords
        .filter((record: AttendanceEntry) => record.status === 'absent' || record.status === 'late')
        .map((record: AttendanceEntry) =>
          safeAttendanceNotification({
            title: record.status === 'absent' ? 'Attendance marked absent' : 'Attendance marked late',
            message: `${record.studentName || 'Student'} was marked ${record.status} for ${classId} on ${date}.`,
            type: 'attendance',
            href: '/attendance',
            targetUserIds: [record.studentId],
            schoolId: req.user?.schoolId || null,
            tenantId: req.tenantId,
            actorId: req.user?.uid,
            metadata: { classId, date, status: record.status },
          })
        )
    );

    res.json({ success: true, count: normalizedRecords.length });
  } catch (error) {
    next(error);
  }
});

export default router;
