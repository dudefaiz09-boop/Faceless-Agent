import { Router } from 'express';
import { db } from '../lib/documents.js';
import { checkPermission } from '../middleware/auth.js';
import { createNotification } from '../lib/notifications.js';
import { logger } from '@educonnect/logger';

const router: Router = Router();

type PerformanceRecord = {
  studentId: string;
  classId?: string;
  subject: string;
  term: string;
  score: number;
  grade: string;
  tenantId?: string;
  schoolId?: string | null;
};

function canViewPerformance(user: NonNullable<Express.Request['user']>) {
  return (
    user.isAdmin ||
    user.permissions.viewPerformance ||
    user.permissions.managePerformance ||
    user.permissions.viewReports ||
    user.roles.some((role) => ['principal', 'teacher'].includes(role))
  );
}

function canViewStudentPerformance(user: NonNullable<Express.Request['user']>, studentId: string) {
  return (
    studentId === user.uid ||
    canViewPerformance(user) ||
    (user.permissions.viewOwnRecords && user.linkedStudentIds.includes(studentId))
  );
}

function stablePerformanceId(classId: string, studentId: string, subject: string, term: string) {
  return `${classId}_${studentId}_${subject}_${term}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function topSubject(records: PerformanceRecord[]) {
  const bySubject = records.reduce<Record<string, { total: number; count: number }>>(
    (acc, record) => {
      acc[record.subject] ||= { total: 0, count: 0 };
      acc[record.subject].total += Number(record.score || 0);
      acc[record.subject].count += 1;
      return acc;
    },
    {}
  );

  return (
    Object.entries(bySubject)
      .map(([subject, value]) => ({ subject, average: value.total / value.count }))
      .sort((a, b) => b.average - a.average)[0]?.subject || 'N/A'
  );
}

async function safePerformanceNotification(input: Parameters<typeof createNotification>[0]) {
  try {
    await createNotification(input);
  } catch (error) {
    logger.warn(
      { err: error, title: input.title },
      'Performance notification could not be created'
    );
  }
}

router.get('/report/:classId', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!canViewPerformance(req.user)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Performance access required' });
    }

    const snapshot = await db
      .collection('performance')
      .where('tenantId', '==', req.tenantId)
      .where('classId', '==', req.params.classId)
      .get();

    const records = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as PerformanceRecord),
    }));
    const classAverage = records.length
      ? Math.round(
          records.reduce((sum, record) => sum + Number(record.score || 0), 0) / records.length
        )
      : 0;

    res.json({
      classAverage,
      topSubject: topSubject(records),
      globalRank: classAverage >= 90 ? 1 : classAverage >= 80 ? 12 : classAverage >= 70 ? 34 : 58,
      records,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/upload', checkPermission('managePerformance'), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const records = Array.isArray(req.body.records) ? req.body.records : [];
    if (records.length === 0) return res.status(400).json({ error: 'records array is required' });

    const now = new Date().toISOString();
    const imported = await Promise.all(
      records.map(async (record: Partial<PerformanceRecord>) => {
        const studentId = String(record.studentId || '').trim();
        const classId = String(record.classId || '').trim();
        const subject = String(record.subject || '').trim();
        const term = String(record.term || '').trim();
        const grade = String(record.grade || '').trim();
        const score = Number(record.score);

        if (!studentId || !classId || !subject || !term || !grade || !Number.isFinite(score)) {
          throw Object.assign(
            new Error(
              'Each performance record requires studentId, classId, subject, term, score, and grade'
            ),
            { statusCode: 400 }
          );
        }

        const id = stablePerformanceId(classId, studentId, subject, term);
        const payload: PerformanceRecord & Record<string, unknown> = {
          tenantId: req.tenantId,
          schoolId: req.tenantId,
          studentId,
          classId,
          subject,
          term,
          score,
          grade,
          uploadedAt: now,
          updatedAt: now,
          updatedBy: req.user?.uid,
        };

        await db.collection('performance').doc(id).set(payload);
        await safePerformanceNotification({
          title: `New score posted: ${subject}`,
          message: `${term} score: ${score}% (${grade}).`,
          type: 'system',
          href: '/performance',
          targetUserIds: [studentId],
          schoolId: req.tenantId,
          tenantId: req.tenantId,
          actorId: req.user?.uid,
          metadata: { performanceId: id, classId, subject, term, score, grade },
        });

        return { id, ...payload };
      })
    );

    res.status(201).json({ success: true, imported });
  } catch (error) {
    next(error);
  }
});

router.get('/:studentId', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!canViewStudentPerformance(req.user, req.params.studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const snapshot = await db
      .collection('performance')
      .where('tenantId', '==', req.tenantId)
      .where('studentId', '==', req.params.studentId)
      .get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

export default router;
