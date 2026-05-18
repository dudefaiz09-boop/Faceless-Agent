<<<<<<< HEAD
import { db } from '../../../lib/documents.js';
import { AiUserContext, AiModule } from '../ai-context.service.js';
import { AiContextProvider } from './base.provider.js';

export class FeesProvider implements AiContextProvider {
  module: AiModule = 'fees';

  async getContext(context: AiUserContext): Promise<string | null> {
    const { uid, role, tenantId, linkedStudentIds } = context;

    if (['admin', 'principal', 'accountant'].includes(role)) {
      const snap = await db.collection('fees').where('tenantId', '==', tenantId).limit(5).get();
      return `[Fees Overview] Recent records count: ${snap.size}.`;
    }

    if (role === 'student') {
      const snap = await db
        .collection('fees')
        .where('tenantId', '==', tenantId)
        .where('studentId', '==', uid)
        .get();
      const list = snap.docs.map(
        (d: any) => `${d.data().amountDue} due on ${d.data().dueDate}`
      );
      return `[Your Fees] ${list.join('; ') || 'No pending fees.'}`;
    }

    if (role === 'parent') {
        if (linkedStudentIds.length === 0) return null;
        const studentFees: string[] = [];
        for (const studentId of linkedStudentIds) {
            const studentDoc = await db.collection('users').doc(studentId).get();
            const sName = (studentDoc.data() || {}).displayName || studentId;

            const snap = await db
              .collection('fees')
              .where('tenantId', '==', tenantId)
              .where('studentId', '==', studentId)
              .get();
            const list = snap.docs.map(
              (d: any) => `${d.data().amountDue} due on ${d.data().dueDate}`
            );
            if (list.length > 0) studentFees.push(`${sName}: ${list.join('; ')}`);
        }
        return `[Children Fees]\n${studentFees.join('\n') || 'No pending fees found.'}`;
=======
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
>>>>>>> origin/main
    }

    return null;
  }
}
