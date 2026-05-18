import { Request } from 'express';
<<<<<<< HEAD
import { db } from '../../lib/documents.js';
import { AiContextProvider } from './providers/base.provider.js';
import { FeesProvider } from './providers/fees.provider.js';
import { AttendanceProvider } from './providers/attendance.provider.js';
=======
import { logger } from '@educonnect/logger';
import { getContext, UserContext } from '../../lib/context.js';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { AiModuleProvider } from './providers/base.provider.js';
import { AttendanceProvider } from './providers/attendance.provider.js';
import { FeesProvider } from './providers/fees.provider.js';
>>>>>>> origin/main
import { AssignmentsProvider } from './providers/assignments.provider.js';
import { PerformanceProvider } from './providers/performance.provider.js';
import { LibraryProvider } from './providers/library.provider.js';

export type AiModule = 'fees' | 'attendance' | 'assignments' | 'performance' | 'library';

const AI_MODULE_PERMISSIONS: Record<AiModule, string[]> = {
  fees: ['admin', 'principal', 'accountant', 'parent', 'student'],
  attendance: ['admin', 'principal', 'teacher', 'parent', 'student'],
  assignments: ['admin', 'teacher', 'student', 'parent'],
  performance: ['admin', 'principal', 'teacher', 'parent', 'student'],
  library: ['admin', 'librarian', 'teacher', 'student'],
};

<<<<<<< HEAD
const PROVIDERS: Record<AiModule, AiContextProvider> = {
  fees: new FeesProvider(),
  attendance: new AttendanceProvider(),
=======
const PROVIDERS: Record<AiModule, AiModuleProvider> = {
  attendance: new AttendanceProvider(),
  fees: new FeesProvider(),
>>>>>>> origin/main
  assignments: new AssignmentsProvider(),
  performance: new PerformanceProvider(),
  library: new LibraryProvider(),
};

export class AiContextService {
  /**
   * Resolve user context using AsyncLocalStorage.
   * Falls back to request properties if context is not available.
   */
  static async resolveAiUserContext(req?: Request): Promise<UserContext> {
    let user: UserContext | undefined = req?.user as UserContext | undefined;

    try {
      const context = getContext();
      if (context.user) {
        user = context.user;
      }
    } catch {
      // Fallback
    }

    const tenantId = req?.tenantId || (req?.headers['x-school-id'] as string) || 'default-school';

    if (!user) {
      throw new Error('AI request failed because school context was not sent.');
    }

<<<<<<< HEAD
    const context: AiUserContext = {
=======
    const context: UserContext = {
>>>>>>> origin/main
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role || user.roles?.[0] || 'student',
      roles: user.roles || [],
      schoolId: user.schoolId || tenantId,
      classId: user.classId,
      classIds: user.classIds || [],
      linkedStudentIds: user.linkedStudentIds || [],
      permissions: user.permissions || {},
    };

<<<<<<< HEAD
    if (!context.role || context.schoolId === 'default-school' || !context.classId) {
=======
    // Identity Resolution: Fetch full profile from Supabase if critical fields are missing
    if (!context.role || context.schoolId === 'default-school' || context.classIds.length === 0) {
>>>>>>> origin/main
      try {
        const supabase = getSupabaseAdmin();
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.uid)
          .single();

<<<<<<< HEAD
        if (context.role === 'teacher' && (!context.classIds || context.classIds.length === 0)) {
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
=======
        if (profile && !error) {
          context.role = profile.role || context.role;
          context.roles = profile.roles || context.roles;
          context.schoolId = profile.school_id || context.schoolId;
          context.classIds = profile.class_ids || context.classIds;
          context.linkedStudentIds = profile.linked_student_ids || context.linkedStudentIds;
          context.permissions = profile.permissions || context.permissions;
>>>>>>> origin/main
        }
      } catch (err) {
        logger.error({ uid: user.uid, err }, '[AI-Context] Profile resolution failed');
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

  static async getModuleContext(context: UserContext, requestedModules?: AiModule[]) {
    const modules = requestedModules || [];
<<<<<<< HEAD
    const { role } = context;
=======
    const tenantId = context.schoolId;
>>>>>>> origin/main

    const canAccess = (m: AiModule) => AI_MODULE_PERMISSIONS[m].includes(context.role);

<<<<<<< HEAD
    const providerPromises = modules
      .filter(canAccess)
      .map(m => PROVIDERS[m]?.getContext(context));

    const results = await Promise.allSettled(providerPromises);

    const contextParts = results
      .map(res => (res.status === 'fulfilled' ? res.value : null))
      .filter(Boolean);
=======
    const activeModules = modules.filter(canAccess);

    if (activeModules.length === 0) {
      return 'No specific school records were requested or found.';
    }
>>>>>>> origin/main

    const contextPromises = activeModules.map(async (m) => {
      try {
        const provider = PROVIDERS[m];
        if (provider) {
          return await provider.getModuleContext(context, tenantId);
        }
        return null;
      } catch (error) {
        logger.error({ module: m, error }, `[AI-Context] Provider ${m} failed`);
        return `[${m}] Data temporarily unavailable.`;
      }
    });

    const results = await Promise.all(contextPromises);
    const contextParts = results.filter(Boolean) as string[];

    return contextParts.length > 0
      ? `Real-time School Context:\n${contextParts.join('\n\n')}`
      : 'No specific school records were found for your query.';
  }
}
