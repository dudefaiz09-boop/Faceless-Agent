import { db } from '../../lib/documents.js';
import { AttendanceAnalytics } from '@educonnect/shared-analytics';
import type { AttendanceRecord } from '@educonnect/types';
import { appEvents } from '../../lib/events.js';
import { AppError } from '../../middleware/error.js';

type AttendanceStatus = 'present' | 'absent' | 'late';
type AttendanceEntry = { studentId: string; studentName?: string; status: AttendanceStatus };
type AttendanceDayRecord = {
  date?: string;
  classId?: string;
  records?: AttendanceEntry[];
  tenantId?: string;
  schoolId?: string | null;
};

function isTenantAttendance(
  record: Pick<AttendanceDayRecord, 'tenantId' | 'schoolId'>,
  tenantId?: string
) {
  return record.tenantId === tenantId || record.schoolId === tenantId;
}

export class AttendanceRepository {
  static async getReport(classId: string, tenantId: string, startDate?: string, endDate?: string) {
    let query = db
      .collection('attendance')
      .where('tenantId', '==', tenantId)
      .where('classId', '==', classId);
    if (startDate) query = query.where('date', '>=', startDate);
    if (endDate) query = query.where('date', '<=', endDate);

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
      const data = (doc.data() || {}) as AttendanceDayRecord;
      const records = data.records || [];
      const date = data.date || startDate || endDate || '';
      const analyticsRecords: AttendanceRecord[] = records.map((record) => ({
        studentId: record.studentId,
        classId,
        date,
        status: record.status,
        markedBy: '',
        updatedAt: '',
      }));
      return AttendanceAnalytics.calculateStats(analyticsRecords, tenantId, date);
    });
  }

  static async getHistory(uid: string, tenantId: string) {
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() || {} : {};

    if (userDoc.exists && userData.tenantId !== tenantId && userData.schoolId !== tenantId) {
      throw new AppError('Tenant access denied', 403);
    }

    const classId = userData.classId;
    if (!classId) return [];

    const snapshot = await db
      .collection('attendance')
      .where('tenantId', '==', tenantId)
      .where('classId', '==', classId)
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = (doc.data() || {}) as AttendanceDayRecord;
        const record = data.records?.find((entry) => entry.studentId === uid);
        return record ? { id: doc.id, date: data.date, status: record.status } : null;
      })
      .filter(Boolean);
  }

  static async list(classId: string, tenantId: string, date?: string) {
    let query = db
      .collection('attendance')
      .where('tenantId', '==', tenantId)
      .where('classId', '==', classId);
    if (date) query = query.where('date', '==', date);

    const snapshot = await query.get();
    const days = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as AttendanceDayRecord),
    }));

    if (date) {
      const day = days[0];
      const records = day?.records || [];
      return records.map((record) => ({
        id: `${day.id}_${record.studentId}`,
        classId,
        date,
        ...record,
      }));
    }

    return days;
  }

  static async mark(
    classId: string,
    date: string,
    records: AttendanceEntry[],
    tenantId: string,
    actorUid: string
  ) {
    const docId = `${classId}_${date}`;
    const attendanceRef = db.collection('attendance').doc(docId);
    const existing = await attendanceRef.get();

    if (existing.exists && !isTenantAttendance(existing.data() as AttendanceDayRecord, tenantId)) {
      throw new AppError('Tenant access denied', 403);
    }

    const normalizedRecords = records.map((record) => ({
      studentId: record.studentId,
      studentName: record.studentName || '',
      status: record.status,
    }));

    await attendanceRef.set({
      tenantId,
      schoolId: tenantId,
      classId,
      date,
      records: normalizedRecords,
      markedBy: actorUid,
      updatedAt: new Date().toISOString(),
    });

    appEvents.emit('attendanceMarked', {
      tenantId,
      schoolId: tenantId,
      actorId: actorUid,
      classId,
      date,
      records: normalizedRecords,
    });

    return { success: true, count: normalizedRecords.length };
  }
}
