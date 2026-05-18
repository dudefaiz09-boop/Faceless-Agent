import { getSupabaseAdmin } from '../../../lib/supabase.js';
import { UserContext } from '../../../lib/context.js';
import { AiModuleProvider } from './base.provider.js';

export class FeesProvider implements AiModuleProvider {
  async getModuleContext(user: UserContext, tenantId: string): Promise<string | null> {
    const { uid, role, linkedStudentIds } = user;
    const supabase = getSupabaseAdmin();

    if (['admin', 'principal', 'accountant'].includes(role)) {
      const { data, error } = await supabase
        .from('fees')
        .select('*')
        .eq('school_id', tenantId)
        .limit(5);

      if (error || !data) return '[Fees] No recent records.';
      return `[Fees Overview] Found ${data.length} recent records.`;
    }

    if (role === 'student' || role === 'parent') {
      const targetIds = role === 'student' ? [uid] : linkedStudentIds;
      if (targetIds.length === 0) return null;

      const { data, error } = await supabase
        .from('fees')
        .select('*')
        .eq('school_id', tenantId)
        .in('student_id', targetIds);

      if (error || !data) return '[Fees] No records found.';

      const list = data.map((d) => `${d.label}: ${d.amount} (${d.status}) due on ${d.due_at}`);
      return `[Fees] ${list.join('; ') || 'No pending fees.'}`;
    }

    return null;
  }
}
