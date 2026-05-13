import { db } from '../../lib/firebase.js';
import { InterventionAlert } from '@educonnect/shared-education';

export class AiInterventionService {
  static async triggerAttendanceIntervention(studentId: string, schoolId: string, reason: string) {
    const alert: Omit<InterventionAlert, 'id'> = {
      schoolId,
      studentId,
      type: 'attendance',
      severity: 'high',
      reason,
      status: 'pending',
      isApproved: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    return await db.collection('interventions').add(alert);
  }
}
