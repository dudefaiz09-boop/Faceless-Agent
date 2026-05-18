import { getSupabaseAdmin } from '../../../lib/supabase.js';
import { UserContext } from '../../../lib/context.js';
import { AiModuleProvider } from './base.provider.js';

export class AssignmentsProvider implements AiModuleProvider {
  async getModuleContext(user: UserContext, tenantId: string): Promise<string | null> {
    const { uid, role, classId, classIds, linkedStudentIds } = user;
    const supabase = getSupabaseAdmin();

    if (role === 'teacher') {
      const { data, error } = await supabase
        .from('assignments')
        .select('title, due_at')
        .eq('school_id', tenantId)
        .eq('created_by', uid)
        .limit(5);

      if (error || !data) return null;
      return `[Your Assignments] ${data.map((d) => d.title).join(', ')}.`;
    }

    if (role === 'student') {
      const targetClasses = classIds.length > 0 ? classIds : classId ? [classId] : [];
      if (targetClasses.length === 0) return null;

      const { data, error } = await supabase
        .from('assignments')
        .select('title, due_at')
        .eq('school_id', tenantId)
        .overlaps('class_ids', targetClasses)
        .limit(5);

      if (error || !data) return null;
      return `[Pending Assignments] ${data.map((d) => d.title).join(', ')}.`;
    }

    if (role === 'parent' && linkedStudentIds.length > 0) {
      // For parents, we'd need to know which classes their children are in.
      // This might require a join or multiple queries. For now, let's fetch by children's profiles.
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('class_ids')
        .in('id', linkedStudentIds);

      if (pError || !profiles) return null;
      const childClasses = Array.from(new Set(profiles.flatMap((p) => p.class_ids)));

      if (childClasses.length === 0) return null;

      const { data, error } = await supabase
        .from('assignments')
        .select('title, due_at')
        .eq('school_id', tenantId)
        .overlaps('class_ids', childClasses)
        .limit(5);

      if (error || !data) return null;
      return `[Children Assignments] ${data.map((d) => d.title).join(', ')}.`;
    }

    return null;
  }
}
