import { Request } from 'express';
import { logger } from '@educonnect/logger';
import { getContext, UserContext } from '../../lib/context.js';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { AiModuleProvider } from './providers/base.provider.js';
import { AttendanceProvider } from './providers/attendance.provider.js';
import { FeesProvider } from './providers/fees.provider.js';
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

const PROVIDERS: Record<AiModule, AiModuleProvider> = {
  attendance: new AttendanceProvider(),
  fees: new FeesProvider(),
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

    const context: UserContext = {
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

    // Identity Resolution: Fetch full profile from Supabase if critical fields are missing
    if (!context.role || context.schoolId === 'default-school' || context.classIds.length === 0) {
      try {
        const supabase = getSupabaseAdmin();
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.uid)
          .single();

        if (profile && !error) {
          context.role = profile.role || context.role;
          context.roles = profile.roles || context.roles;
          context.schoolId = profile.school_id || context.schoolId;
          context.classIds = profile.class_ids || context.classIds;
          context.linkedStudentIds = profile.linked_student_ids || context.linkedStudentIds;
          context.permissions = profile.permissions || context.permissions;
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
    const tenantId = context.schoolId;

    const canAccess = (m: AiModule) => AI_MODULE_PERMISSIONS[m].includes(context.role);

    const activeModules = modules.filter(canAccess);

    if (activeModules.length === 0) {
      return 'No specific school records were requested or found.';
    }

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
