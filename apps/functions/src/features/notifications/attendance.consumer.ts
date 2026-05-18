import { appEvents } from '../../lib/events.js';
import { createNotification } from '../../lib/notifications.js';
import { logger } from '@educonnect/logger';

appEvents.on('attendanceMarked', async (data) => {
  const { tenantId, schoolId, actorId, classId, date, records } = data;

  const absentees = records.filter((r: any) => r.status === 'absent' || r.status === 'late');

  for (const record of absentees) {
    try {
      await createNotification({
        title: record.status === 'absent' ? 'Attendance marked absent' : 'Attendance marked late',
        message: `${record.studentName || 'Student'} was marked ${record.status} for ${classId} on ${date}.`,
        type: 'attendance',
        href: '/attendance',
        targetUserIds: [record.studentId],
        schoolId: schoolId || null,
        tenantId: tenantId,
        actorId: actorId,
        metadata: { classId, date, status: record.status },
      });
    } catch (error) {
      logger.warn({ err: error, studentId: record.studentId }, 'Background notification failed');
    }
  }
});
