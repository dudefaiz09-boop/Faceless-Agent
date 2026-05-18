import { getSupabaseAdmin } from '../../../lib/supabase.js';
import { UserContext } from '../../../lib/context.js';
import { AiModuleProvider } from './base.provider.js';

export class PerformanceProvider implements AiModuleProvider {
  async getModuleContext(user: UserContext, tenantId: string): Promise<string | null> {
    const { uid, role, linkedStudentIds } = user;
    const supabase = getSupabaseAdmin();

    const targetIds = role === 'student' ? [uid] : role === 'parent' ? linkedStudentIds : [];
    if (targetIds.length === 0) return null;

    const { data, error } = await supabase
      .from('performance')
      .select('*')
      .eq('school_id', tenantId)
      .in('student_id', targetIds)
      .limit(10);

    if (error || !data || data.length === 0) return '[Performance] No recent data found.';

    const scores = data.map((d) => `${d.subject_id}: ${d.score} (${d.grade})`);
    return `[Performance] Recent scores:\n${scores.join('\n')}`;
  }
}
