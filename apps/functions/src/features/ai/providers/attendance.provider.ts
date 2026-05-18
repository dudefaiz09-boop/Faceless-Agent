<<<<<<< HEAD
import { db } from '../../../lib/documents.js';
import { AiUserContext, AiModule } from '../ai-context.service.js';
import { AiContextProvider } from './base.provider.js';

export class AttendanceProvider implements AiContextProvider {
  module: AiModule = 'attendance';

  async getContext(context: AiUserContext): Promise<string | null> {
    const { uid, role, tenantId, classId, classIds, linkedStudentIds } = context;

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
      return `[Attendance Overview]\n${summary || 'No recent records.'}`;
=======
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
        .select('attendance_date, class_id, status')
        .eq('school_id', tenantId)
        .order('attendance_date', { ascending: false })
        .limit(100);

      if (error || !data || data.length === 0) return '[Attendance] No recent records found.';

      // Aggregate by date and class
      const aggregated: Record<string, { present: number; total: number }> = {};
      data.forEach((r) => {
        const key = `${r.attendance_date} (${r.class_id})`;
        if (!aggregated[key]) aggregated[key] = { present: 0, total: 0 };
        aggregated[key].total++;
        if (r.status === 'present') aggregated[key].present++;
      });

      const summary = Object.entries(aggregated)
        .slice(0, 10) // Show top 10 aggregated class/date entries
        .map(([key, stats]) => `${key}: ${stats.present}/${stats.total} present`)
        .join('\n');
      return `[Attendance Overview]\n${summary}`;
>>>>>>> origin/main
    }

    if (role === 'teacher') {
      const targetClasses = classIds.length > 0 ? classIds : classId ? [classId] : [];
<<<<<<< HEAD
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
            const present = data.records?.filter((r: any) => r.status === 'present').length || 0;
            const total = data.records?.length || 0;
            return `${data.date} (${data.classId}): ${present}/${total} present`;
          })
          .join('\n');
        return `[Your Classes Attendance]\n${summary || 'No recent records.'}`;
      }
      return null;
    }

    if (role === 'student') {
      if (!classId) return '[Attendance] Your account is not linked to a class.';

      const snap = await db
        .collection('attendance')
        .where('tenantId', '==', tenantId)
        .where('classId', '==', classId)
        .orderBy('date', 'desc')
        .limit(5)
        .get();

      const history = snap.docs
        .map((doc: any) => {
          const data = doc.data();
          const record = data.records?.find((r: any) => r.studentId === uid);
          return record ? `${data.date}: ${record.status}` : null;
        })
        .filter(Boolean);

      return `[Your Attendance History] ${history.join(', ') || 'No records found.'}`;
    }

    if (role === 'parent') {
      if (linkedStudentIds.length === 0) return '[Attendance] No linked students found.';

      const studentRecords: string[] = [];
      for (const studentId of linkedStudentIds) {
        // Fetch student to get their class and display name
        const studentDoc = await db.collection('users').doc(studentId).get();
        const studentData = studentDoc.data() || {};
        const sName = studentData.displayName || studentId;
        const sClass = studentData.classId;

        if (sClass) {
          const snap = await db
            .collection('attendance')
            .where('tenantId', '==', tenantId)
            .where('classId', '==', sClass)
            .orderBy('date', 'desc')
            .limit(3)
            .get();

          const history = snap.docs
            .map((doc: any) => {
              const data = doc.data();
              const record = data.records?.find((r: any) => r.studentId === studentId);
              return record ? `${data.date}: ${record.status}` : null;
            })
            .filter(Boolean);

          if (history.length > 0) {
            studentRecords.push(`${sName}: ${history.join('; ')}`);
          }
        }
      }
      return `[Children Attendance]\n${studentRecords.join('\n') || 'No recent records found.'}`;
=======
      if (targetClasses.length === 0) return null;

      const { data, error } = await supabase
        .from('attendance')
        .select('attendance_date, class_id, status')
        .eq('school_id', tenantId)
        .in('class_id', targetClasses)
        .order('attendance_date', { ascending: false })
        .limit(100);

      if (error || !data || data.length === 0)
        return '[Attendance] No recent records for your classes.';

      // Aggregate by date and class
      const aggregated: Record<string, { present: number; total: number }> = {};
      data.forEach((r) => {
        const key = `${r.attendance_date} (${r.class_id})`;
        if (!aggregated[key]) aggregated[key] = { present: 0, total: 0 };
        aggregated[key].total++;
        if (r.status === 'present') aggregated[key].present++;
      });

      const summary = Object.entries(aggregated)
        .slice(0, 10)
        .map(([key, stats]) => `${key}: ${stats.present}/${stats.total} present`)
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
>>>>>>> origin/main
    }

    return null;
  }
}
