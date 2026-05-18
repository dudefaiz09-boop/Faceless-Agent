<<<<<<< HEAD
import { db } from '../../../lib/documents.js';
import { AiUserContext, AiModule } from '../ai-context.service.js';
import { AiContextProvider } from './base.provider.js';

export class AssignmentsProvider implements AiContextProvider {
  module: AiModule = 'assignments';

  async getContext(context: AiUserContext): Promise<string | null> {
    const { uid, role, tenantId, classId, linkedStudentIds } = context;

    if (role === 'teacher') {
      const snap = await db
        .collection('assignments')
        .where('tenantId', '==', tenantId)
        .where('createdBy', '==', uid)
        .limit(5)
        .get();
      const titles = snap.docs.map((d: any) => d.data().title).join(', ');
      return `[Your Assignments] ${titles || 'No assignments created.'}`;
    }

    if (role === 'student') {
      if (!classId) return null;
      const snap = await db
        .collection('assignments')
        .where('tenantId', '==', tenantId)
        .where('targetClasses', 'array-contains', classId)
        .limit(5)
        .get();
      const titles = snap.docs.map((d: any) => d.data().title).join(', ');
      return `[Pending Assignments] ${titles || 'No pending assignments.'}`;
    }

    if (role === 'parent') {
      if (linkedStudentIds.length === 0) return null;
      const studentAssignments: string[] = [];

      for (const studentId of linkedStudentIds) {
        const studentDoc = await db.collection('users').doc(studentId).get();
        const sData = studentDoc.data() || {};
        const sName = sData.displayName || studentId;
        const sClass = sData.classId;

        if (sClass) {
          const snap = await db
            .collection('assignments')
            .where('tenantId', '==', tenantId)
            .where('targetClasses', 'array-contains', sClass)
            .limit(3)
            .get();
          const titles = snap.docs.map((d: any) => d.data().title).join(', ');
          if (titles) studentAssignments.push(`${sName}: ${titles}`);
        }
      }
      return `[Children Assignments]\n${studentAssignments.join('\n') || 'No pending assignments found.'}`;
    }

    if (['admin', 'principal'].includes(role)) {
        const snap = await db
          .collection('assignments')
          .where('tenantId', '==', tenantId)
          .limit(10)
          .get();
        const summary = snap.docs.map((d: any) => `${d.data().title} (${d.data().targetClasses?.join(',') || 'No Class'})`).join('\n');
        return `[Recent Assignments Overview]\n${summary || 'No recent records.'}`;
=======
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
>>>>>>> origin/main
    }

    return null;
  }
}
