import { db } from '../../lib/documents.js';

export type AiModule = 'fees' | 'attendance' | 'assignments' | 'performance' | 'library';

const AI_MODULE_PERMISSIONS: Record<AiModule, string[]> = {
  fees: ['admin', 'principal', 'accountant', 'parent', 'student'],
  attendance: ['admin', 'principal', 'teacher', 'parent', 'student'],
  assignments: ['admin', 'teacher', 'student', 'parent'],
  performance: ['admin', 'principal', 'teacher', 'parent', 'student'],
  library: ['admin', 'librarian', 'teacher', 'student'],
};

export class AiContextService {
  static inferModulesFromQuery(query: string): AiModule[] {
    const q = query.toLowerCase();
    const modules: AiModule[] = [];
    if (q.includes('fee') || q.includes('pay') || q.includes('due') || q.includes('collection'))
      modules.push('fees');
    if (q.includes('attendance') || q.includes('present') || q.includes('absent'))
      modules.push('attendance');
    if (q.includes('assignment') || q.includes('homework') || q.includes('submit'))
      modules.push('assignments');
    if (q.includes('grade') || q.includes('score') || q.includes('performance') || q.includes('mark'))
      modules.push('performance');
    if (q.includes('book') || q.includes('library') || q.includes('read'))
      modules.push('library');
    return [...new Set(modules)];
  }

  static async getModuleContext(
    userId: string,
    role: string,
    tenantId: string,
    requestedModules?: AiModule[]
  ) {
    const modules = requestedModules || [];
    const contextParts: string[] = [];

    const canAccess = (m: AiModule) => AI_MODULE_PERMISSIONS[m].includes(role);

    try {
      // 1. Fees Context
      if (modules.includes('fees') && canAccess('fees')) {
        if (['admin', 'principal', 'accountant'].includes(role)) {
          const snap = await db.collection('fees').where('tenantId', '==', tenantId).limit(5).get();
          contextParts.push(`[Fees Overview] Recent records: ${snap.size}.`);
        } else {
          const snap = await db
            .collection('fees')
            .where('tenantId', '==', tenantId)
            .where('studentId', '==', userId)
            .get();
          const list = snap.docs.map((d: any) => `${d.data().amountDue} due on ${d.data().dueDate}`);
          contextParts.push(`[Your Fees] ${list.join('; ') || 'No pending fees.'}`);
        }
      }

      // 2. Attendance Context
      if (modules.includes('attendance') && canAccess('attendance')) {
        if (['admin', 'principal'].includes(role)) {
          const snap = await db
            .collection('attendance')
            .where('tenantId', '==', tenantId)
            .orderBy('date', 'desc')
            .limit(3)
            .get();
          contextParts.push(
            `[Attendance] Recent sessions: ${snap.docs.map((d: any) => d.data().date).join(', ')}.`
          );
        } else {
          const userDoc = await db.collection('users').doc(userId).get();
          const classId = userDoc.data()?.classId;
          if (classId) {
            const snap = await db
              .collection('attendance')
              .where('tenantId', '==', tenantId)
              .where('classId', '==', classId)
              .orderBy('date', 'desc')
              .limit(5)
              .get();
            const history = snap.docs
              .map((doc: any) => {
                const record = doc.data().records?.find((r: any) => r.studentId === userId);
                return record ? `${doc.data().date}: ${record.status}` : null;
              })
              .filter(Boolean);
            contextParts.push(`[Attendance History] ${history.join(', ') || 'No recent records.'}`);
          }
        }
      }

      // 3. Assignments Context
      if (modules.includes('assignments') && canAccess('assignments')) {
        if (role === 'teacher') {
          const snap = await db
            .collection('assignments')
            .where('tenantId', '==', tenantId)
            .where('createdBy', '==', userId)
            .limit(5)
            .get();
          contextParts.push(
            `[Your Assignments] ${snap.docs.map((d: any) => d.data().title).join(', ')}.`
          );
        } else if (role === 'student') {
          const userDoc = await db.collection('users').doc(userId).get();
          const classId = userDoc.data()?.classId;
          if (classId) {
            const snap = await db
              .collection('assignments')
              .where('tenantId', '==', tenantId)
              .where('targetClasses', 'array-contains', classId)
              .limit(5)
              .get();
            contextParts.push(
              `[Pending Assignments] ${snap.docs.map((d: any) => d.data().title).join(', ')}.`
            );
          }
        }
      }

      // 4. Performance Context
      if (modules.includes('performance') && canAccess('performance')) {
        const targetId = role === 'student' ? userId : null;
        if (targetId) {
          const snap = await db
            .collection('performance')
            .where('tenantId', '==', tenantId)
            .where('studentId', '==', targetId)
            .limit(5)
            .get();
          const scores = snap.docs.map((d: any) => `${d.data().subject}: ${d.data().score}`);
          contextParts.push(`[Performance] Recent scores: ${scores.join(', ') || 'No data.'}`);
        }
      }

      // 5. Library Context
      if (modules.includes('library') && canAccess('library')) {
        const snap = await db
          .collection('library')
          .where('tenantId', '==', tenantId)
          .where('studentId', '==', userId)
          .get();
        contextParts.push(`[Library] You have ${snap.size} books currently issued.`);
      }
    } catch (error) {
      console.error('[AI-Context] Module fetch failed:', error);
      contextParts.push('Limited school data available due to a system error.');
    }

    return contextParts.length > 0
      ? `Real-time School Context:\n${contextParts.join('\n\n')}`
      : 'No specific school records were requested or found.';
  }
}
