import { Request } from 'express';
import { db } from '../../lib/documents.js';

export type AiModule = 'fees' | 'attendance' | 'assignments' | 'performance' | 'library';

export interface AiUserContext {
  uid: string;
  email?: string;
  displayName?: string;
  role: string;
  roles: string[];
  schoolId: string;
  tenantId: string;
  classId?: string | null;
  classIds: string[];
  linkedStudentIds: string[];
  permissions: Record<string, boolean>;
}

const AI_MODULE_PERMISSIONS: Record<AiModule, string[]> = {
  fees: ['admin', 'principal', 'accountant', 'parent', 'student'],
  attendance: ['admin', 'principal', 'teacher', 'parent', 'student'],
  assignments: ['admin', 'teacher', 'student', 'parent'],
  performance: ['admin', 'principal', 'teacher', 'parent', 'student'],
  library: ['admin', 'librarian', 'teacher', 'student'],
};

export class AiContextService {
  static async resolveAiUserContext(req: Request): Promise<AiUserContext> {
    const user = req.user;
    const tenantId = req.tenantId || (req.headers['x-school-id'] as string) || 'default-school';

    if (!user) {
      console.error('[AI-Context] No user found on request');
      throw new Error('AI request failed because school context was not sent.');
    }

    // Diagnostics in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AI-Context] Resolving context for:', {
        uid: user.uid,
        role: user.role,
        schoolId: user.schoolId || tenantId,
        tenantId,
      });
    }

    // In most cases, req.user is already populated by authMiddleware which fetches from the users collection.
    // We'll ensure critical fields are present.
    const context: AiUserContext = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role || user.roles?.[0] || 'student',
      roles: user.roles || [],
      schoolId: user.schoolId || tenantId,
      tenantId: tenantId,
      classId: user.classId,
      classIds: user.classIds || [],
      linkedStudentIds: user.linkedStudentIds || [],
      permissions: user.permissions || {},
    };

    // If roles or schoolId is missing from req.user, try a last-resort fetch from the database
    if (!context.role || context.schoolId === 'default-school' || !context.classId) {
      try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data()!;
          context.role = data.role || context.role;
          context.roles = data.roles || context.roles;
          context.schoolId = data.schoolId || context.schoolId;
          context.classId = data.classId || context.classId;
          context.classIds = data.classIds || (data.classId ? [data.classId] : context.classIds);
          context.linkedStudentIds = data.linkedStudentIds || context.linkedStudentIds;
          context.permissions = data.permissions || context.permissions;
        }

        // Production identity resolution: check teachers and students collections if needed
        if (context.role === 'teacher' && (!context.classIds || context.classIds.length === 0)) {
          // Attempt to find linked teacher record by user uid
          const teacherSnap = await db
            .collection('teachers')
            .where('tenantId', '==', tenantId)
            .where('userId', '==', user.uid)
            .get();
          if (teacherSnap.docs.length > 0) {
            const tData = teacherSnap.docs[0].data();
            context.classIds = tData.classIds || context.classIds;
          }
        }

        if (context.role === 'student' && !context.classId) {
          const studentSnap = await db
            .collection('students')
            .where('tenantId', '==', tenantId)
            .where('userId', '==', user.uid)
            .get();
          if (studentSnap.docs.length > 0) {
            const sData = studentSnap.docs[0].data();
            context.classId = sData.classId || context.classId;
          }
        }
      } catch (err) {
        console.error('[AI-Context] Failed to fetch extended user profile:', err);
      }
    }

    return context;
  }

  static inferModulesFromQuery(query: string): AiModule[] {
    const q = query.toLowerCase();
    const modules: AiModule[] = [];
    if (q.includes('fee') || q.includes('pay') || q.includes('due') || q.includes('collection'))
      modules.push('fees');
    if (
      q.includes('attendance') ||
      q.includes('present') ||
      q.includes('absent') ||
      q.includes('late') ||
      q.includes('yesterday') ||
      q.includes('today') ||
      q.includes('class') ||
      q.includes('was i present')
    )
      modules.push('attendance');
    if (q.includes('assignment') || q.includes('homework') || q.includes('submit'))
      modules.push('assignments');
    if (
      q.includes('grade') ||
      q.includes('score') ||
      q.includes('performance') ||
      q.includes('mark')
    )
      modules.push('performance');
    if (q.includes('book') || q.includes('library') || q.includes('read')) modules.push('library');
    return [...new Set(modules)];
  }

  static async getModuleContext(context: AiUserContext, requestedModules?: AiModule[]) {
    const modules = requestedModules || [];
    const contextParts: string[] = [];
    const { uid, role, tenantId, classId, classIds } = context;

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
            .where('studentId', '==', uid)
            .get();
          const list = snap.docs.map(
            (d: any) => `${d.data().amountDue} due on ${d.data().dueDate}`
          );
          contextParts.push(`[Your Fees] ${list.join('; ') || 'No pending fees.'}`);
        }
      }

      // 2. Attendance Context
      if (modules.includes('attendance') && canAccess('attendance')) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[AI-Context] Processing attendance for role:', role);
        }

        if (['admin', 'principal'].includes(role)) {
          const snap = await db
            .collection('attendance')
            .where('tenantId', '==', tenantId)
            .orderBy('date', 'desc')
            .limit(10)
            .get();
          const summary = snap.docs
            .map((d: any) => {
              const data = d.data();
              const present = data.records?.filter((r: any) => r.status === 'present').length || 0;
              const total = data.records?.length || 0;
              return `${data.date} (${data.classId}): ${present}/${total} present`;
            })
            .join('\n');
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[AI-Context] Admin attendance found: ${snap.docs.length} records`);
          }
          contextParts.push(`[Attendance Overview]\n${summary || 'No recent records.'}`);
        } else if (role === 'teacher') {
          const targetClasses = classIds.length > 0 ? classIds : classId ? [classId] : [];
          if (targetClasses.length > 0) {
            const snap = await db
              .collection('attendance')
              .where('tenantId', '==', tenantId)
              .where('classId', 'in', targetClasses)
              .orderBy('date', 'desc')
              .limit(10)
              .get();
            const summary = snap.docs
              .map((d: any) => {
                const data = d.data();
                const present =
                  data.records?.filter((r: any) => r.status === 'present').length || 0;
                const total = data.records?.length || 0;
                return `${data.date} (${data.classId}): ${present}/${total} present`;
              })
              .join('\n');
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[AI-Context] Teacher attendance found: ${snap.docs.length} records`);
            }
            contextParts.push(`[Your Classes Attendance]\n${summary || 'No recent records.'}`);
          }
        } else if (role === 'student') {
          if (classId) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const formatDate = (d: Date) => d.toISOString().split('T')[0];
            const datesToFetch = [formatDate(today), formatDate(yesterday)];

            const snap = await db
              .collection('attendance')
              .where('tenantId', '==', tenantId)
              .where('classId', '==', classId)
              .where('date', 'in', datesToFetch)
              .get();

            const history = snap.docs
              .map((doc: any) => {
                const data = doc.data();
                const record = data.records?.find((r: any) => r.studentId === uid);
                return record ? `${data.date}: ${record.status}` : null;
              })
              .filter(Boolean);

            if (process.env.NODE_ENV !== 'production') {
              console.log(
                `[AI-Context] Student specific dates attendance found: ${history.length} records`
              );
            }

            if (history.length === 0) {
              // Fallback to recent 5 if today/yesterday not found
              const recentSnap = await db
                .collection('attendance')
                .where('tenantId', '==', tenantId)
                .where('classId', '==', classId)
                .orderBy('date', 'desc')
                .limit(5)
                .get();

              const recentHistory = recentSnap.docs
                .map((doc: any) => {
                  const data = doc.data();
                  const record = data.records?.find((r: any) => r.studentId === uid);
                  return record ? `${data.date}: ${record.status}` : null;
                })
                .filter(Boolean);

              if (process.env.NODE_ENV !== 'production') {
                console.log(
                  `[AI-Context] Student recent attendance fallback found: ${recentHistory.length} records`
                );
              }

              contextParts.push(
                `[Your Attendance History] ${recentHistory.join(', ') || 'No records found for your student ID.'}`
              );
            } else {
              contextParts.push(`[Your Attendance History] ${history.join(', ')}`);
            }
          } else {
            contextParts.push(
              '[Attendance] Your account is not linked to a class. Please contact the school admin.'
            );
          }
        }
      }

      // 3. Assignments Context
      if (modules.includes('assignments') && canAccess('assignments')) {
        if (role === 'teacher') {
          const snap = await db
            .collection('assignments')
            .where('tenantId', '==', tenantId)
            .where('createdBy', '==', uid)
            .limit(5)
            .get();
          contextParts.push(
            `[Your Assignments] ${snap.docs.map((d: any) => d.data().title).join(', ')}.`
          );
        } else if (role === 'student') {
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
        const targetId = role === 'student' ? uid : null;
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
          .where('studentId', '==', uid)
          .get();
        contextParts.push(`[Library] You have ${snap.size} books currently issued.`);
      }

      // 6. Parent Specific Attendance
      if (role === 'parent' && modules.includes('attendance')) {
        const studentIds = context.linkedStudentIds;
        if (studentIds.length > 0) {
          const snap = await db
            .collection('attendance')
            .where('tenantId', '==', tenantId)
            .orderBy('date', 'desc')
            .limit(10)
            .get();

          const studentRecords: string[] = [];
          for (const studentId of studentIds) {
            const history = snap.docs
              .map((doc: any) => {
                const data = doc.data();
                const record = data.records?.find((r: any) => r.studentId === studentId);
                return record ? `${data.date}: ${record.status}` : null;
              })
              .filter(Boolean);

            if (history.length > 0) {
              studentRecords.push(`Student ${studentId}: ${history.join(', ')}`);
            }
          }

          contextParts.push(
            `[Children Attendance]\n${studentRecords.join('\n') || 'No recent records found for your children.'}`
          );
        } else {
          contextParts.push(
            '[Attendance] No linked student records found for your parent account.'
          );
        }
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
