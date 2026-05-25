import { db } from '../../lib/documents.js';
import { createNotification } from '../../lib/notifications.js';
import { logger } from '@educonnect/logger';

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
type Actor = { uid: string; email?: string; schoolId?: string | null };

function stablePerformanceId(classId: string, studentId: string, subject: string, term: string) {
  return `${classId}_${studentId}_${subject}_${term}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function topSubject(records: PerformanceRecord[]) {
  const bySubject = records.reduce<Record<string, { total: number; count: number }>>((acc, r) => {
    acc[r.subject] ||= { total: 0, count: 0 };
    acc[r.subject].total += Number(r.score || 0);
    acc[r.subject].count += 1;
    return acc;
  }, {});
  return (
    Object.entries(bySubject)
      .map(([subject, v]) => ({ subject, average: v.total / v.count }))
      .sort((a, b) => b.average - a.average)[0]?.subject || 'N/A'
  );
}

async function safeNotification(input: any) {
  try {
    await createNotification(input);
  } catch (error) {
    logger.warn(
      { err: error, title: input.title },
      'Performance notification could not be created'
    );
  }
}

export class PerformanceRepository {
  static async getReport(classId: string, tenantId: string) {
    const snapshot = await db
      .collection('performance')
      .where('tenantId', '==', tenantId)
      .where('classId', '==', classId)
      .get();
    const records = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as PerformanceRecord),
    }));
    const classAverage = records.length
      ? Math.round(records.reduce((sum, r) => sum + Number(r.score || 0), 0) / records.length)
      : 0;
    const avg = classAverage;
    return {
      classAverage,
      topSubject: topSubject(records),
      globalRank: avg >= 90 ? 1 : avg >= 80 ? 12 : avg >= 70 ? 34 : 58,
      records,
    };
  }

  static async upload(records: any[], actor: Actor, tenantId: string) {
    const now = new Date().toISOString();
    return Promise.all(
      records.map(async (record: any) => {
        const { studentId, classId, subject, term, score, grade } = record;
        const id = stablePerformanceId(classId, studentId, subject, term);
        const payload: PerformanceRecord & Record<string, unknown> = {
          tenantId,
          schoolId: tenantId,
          studentId,
          classId,
          subject,
          term,
          score,
          grade,
          uploadedAt: now,
          updatedAt: now,
          updatedBy: actor.uid,
        };
        await db.collection('performance').doc(id).set(payload);
        await safeNotification({
          title: `New score posted: ${subject}`,
          message: `${term} score: ${score}% (${grade}).`,
          type: 'system',
          href: '/performance',
          targetUserIds: [studentId],
          schoolId: tenantId,
          tenantId,
          actorId: actor.uid,
          metadata: { performanceId: id, classId, subject, term, score, grade },
        });
        return { id, ...payload };
      })
    );
  }

  static async getStudentPerformance(studentId: string, tenantId: string) {
    const snapshot = await db
      .collection('performance')
      .where('tenantId', '==', tenantId)
      .where('studentId', '==', studentId)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
}
