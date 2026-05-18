import { getSupabaseAdmin } from '../../../lib/supabase.js';
import { UserContext } from '../../../lib/context.js';
import { AiModuleProvider } from './base.provider.js';

export class AttendanceProvider implements AiModuleProvider {
  async getModuleContext(user: UserContext, tenantId: string): Promise<string | null> {
    const { uid, role, classId, classIds, linkedStudentIds } = user;
    const supabase = getSupabaseAdmin();

    if (['admin', 'principal'].includes(role)) {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('school_id', tenantId)
        .order('attendance_date', { ascending: false })
        .limit(10);

      if (error || !data) return '[Attendance] No recent records found.';

      const summary = data
        .map((record) => `${record.attendance_date} (${record.class_id}): ${record.status}`)
        .join('\n');
      return `[Attendance Overview]\n${summary}`;
    }

    if (role === 'teacher') {
      const targetClasses = classIds.length > 0 ? classIds : classId ? [classId] : [];
      if (targetClasses.length === 0) return null;

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('school_id', tenantId)
        .in('class_id', targetClasses)
        .order('attendance_date', { ascending: false })
        .limit(10);

      if (error || !data) return '[Attendance] No recent records for your classes.';

      const summary = data
        .map((record) => `${record.attendance_date} (${record.class_id}): ${record.status}`)
        .join('\n');
      return `[Your Classes Attendance]\n${summary}`;
    }

    if (role === 'student') {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('school_id', tenantId)
        .eq('student_id', uid)
        .order('attendance_date', { ascending: false })
        .limit(5);

      if (error || !data || data.length === 0) return '[Attendance] No records found for you.';

      const history = data.map((r) => `${r.attendance_date}: ${r.status}`).join(', ');
      return `[Your Attendance History] ${history}`;
    }

    if (role === 'parent' && linkedStudentIds.length > 0) {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('school_id', tenantId)
        .in('student_id', linkedStudentIds)
        .order('attendance_date', { ascending: false })
        .limit(10);

      if (error || !data) return '[Attendance] No records found for your children.';

      const recordsByStudent: Record<string, string[]> = {};
      data.forEach((r) => {
        if (!recordsByStudent[r.student_id]) recordsByStudent[r.student_id] = [];
        recordsByStudent[r.student_id].push(`${r.attendance_date}: ${r.status}`);
      });

      const summary = Object.entries(recordsByStudent)
        .map(([sid, history]) => `Student ${sid}: ${history.join(', ')}`)
        .join('\n');
      return `[Children Attendance]\n${summary}`;
    }

    return null;
  }
}
