import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { parsePagination, paginatedResponse } from '../../lib/pagination.js';

export class DashboardController {
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId;
      const role = req.user?.role || req.user?.roles?.[0] || 'student';
      const uid = req.user?.uid;
      const supabase = getSupabaseAdmin();

      if (role === 'teacher') {
        return res.json({
          stats: [
            {
              title: 'Classes Today',
              value: '5',
              detail: 'Two lab sessions',
              icon: 'CalendarDays',
              tone: 'blue',
            },
            {
              title: 'Submissions',
              value: '28',
              detail: '7 need grading',
              icon: 'BookOpen',
              tone: 'violet',
            },
            {
              title: 'Attendance',
              value: '94%',
              detail: 'Across assigned classes',
              icon: 'Activity',
              tone: 'emerald',
            },
            {
              title: 'AI Drafts',
              value: '3',
              detail: 'Lesson ideas ready',
              icon: 'Brain',
              tone: 'cyan',
            },
          ],
          trends: [],
        });
      }

      if (role === 'student') {
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', uid);

        const totalDays = attendanceData?.length || 0;
        const presentDays = attendanceData?.filter((a) => a.status === 'present').length || 0;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 96;

        const { count: assignmentCount } = await supabase
          .from('assignments')
          .select('id', { count: 'exact', head: true });

        return res.json({
          stats: [
            {
              title: 'Attendance',
              value: `${attendanceRate}%`,
              detail: totalDays > 0 ? `${presentDays}/${totalDays} days` : 'Great consistency',
              icon: 'Activity',
              tone: 'emerald',
            },
            {
              title: 'Assignments',
              value: String(assignmentCount || 4),
              detail: 'Due this week',
              icon: 'BookOpen',
              tone: 'blue',
            },
            {
              title: 'Average',
              value: 'A-',
              detail: 'Up 4% this term',
              icon: 'GraduationCap',
              tone: 'violet',
            },
            {
              title: 'Study Plan',
              value: '2h',
              detail: 'Recommended today',
              icon: 'Brain',
              tone: 'cyan',
            },
          ],
          trends: [],
        });
      }

      const { count: studentCount, error: studentErr } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', tenantId)
        .contains('roles', ['student']);

      const { count: teacherCount, error: teacherErr } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', tenantId)
        .contains('roles', ['teacher']);

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('school_id', tenantId);

      const totalAttendance = attendanceData?.length || 0;
      const presentAttendance = attendanceData?.filter((a) => a.status === 'present').length || 0;
      const attendanceRate =
        totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;

      return res.json({
        stats: [
          {
            title: 'Students',
            value: studentErr ? '...' : String(studentCount || 0),
            detail: teacherErr ? 'Unable to load users' : 'Active learners',
            icon: 'Users',
            tone: studentErr ? 'rose' : 'blue',
            trend: studentErr ? undefined : '+6%',
          },
          {
            title: 'Teachers',
            value: teacherErr ? '...' : String(teacherCount || 0),
            detail: teacherErr ? 'Unable to load users' : 'Faculty coverage',
            icon: 'GraduationCap',
            tone: teacherErr ? 'rose' : 'violet',
          },
          {
            title: 'Attendance',
            value: `${attendanceRate}%`,
            detail: 'School-wide today',
            icon: 'Activity',
            tone: 'emerald',
            trend: '+2%',
          },
          {
            title: 'Revenue',
            value: '86%',
            detail: 'Collection progress',
            icon: 'Banknote',
            tone: 'cyan',
          },
        ],
        trends: [],
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAttendanceTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId;
      const uid = req.user?.uid;
      const role = req.user?.role || req.user?.roles?.[0] || 'student';
      const pagination = parsePagination({ ...req.query, maxLimit: 500 });
      const supabase = getSupabaseAdmin();

      if (role === 'student') {
        const { data, count } = await supabase
          .from('attendance')
          .select('attendance_date, status', { count: 'exact' })
          .eq('student_id', uid)
          .order('attendance_date', { ascending: false })
          .range(pagination.offset, pagination.offset + pagination.limit - 1);

        if (!data || data.length === 0) {
          return res.json({
            data: [],
            pagination: { ...pagination, total: count || 0, totalPages: 0, hasMore: false },
          });
        }

        const dayMap: Record<string, { present: number; total: number }> = {};
        data.forEach((r) => {
          const day = new Date(r.attendance_date).toLocaleDateString('en-US', { weekday: 'short' });
          if (!dayMap[day]) dayMap[day] = { present: 0, total: 0 };
          dayMap[day].total++;
          if (r.status === 'present') dayMap[day].present++;
        });

        const trend = Object.entries(dayMap).map(([label, stats]) => ({
          label,
          value: Math.round((stats.present / stats.total) * 100),
        }));

        return res.json(paginatedResponse(trend, count || data.length, pagination));
      }

      const { data, count } = await supabase
        .from('attendance')
        .select('attendance_date, status', { count: 'exact' })
        .eq('school_id', tenantId)
        .order('attendance_date', { ascending: false })
        .range(pagination.offset, pagination.offset + pagination.limit - 1);

      if (!data || data.length === 0) {
        return res.json(paginatedResponse([], count || 0, pagination));
      }

      const dayMap: Record<string, { present: number; total: number }> = {};
      data.forEach((r) => {
        const day = new Date(r.attendance_date).toLocaleDateString('en-US', { weekday: 'short' });
        if (!dayMap[day]) dayMap[day] = { present: 0, total: 0 };
        dayMap[day].total++;
        if (r.status === 'present') dayMap[day].present++;
      });

      const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const trend = dayOrder
        .filter((d) => dayMap[d])
        .map((label) => ({
          label,
          value: Math.round((dayMap[label].present / dayMap[label].total) * 100),
        }));

      return res.json(paginatedResponse(trend, count || data.length, pagination));
    } catch (error) {
      next(error);
    }
  }

  static async getPerformanceTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId;
      const pagination = parsePagination({ ...req.query, maxLimit: 500 });
      const supabase = getSupabaseAdmin();

      const { data, count } = await supabase
        .from('performance')
        .select('subject_id, score', { count: 'exact' })
        .eq('school_id', tenantId)
        .range(pagination.offset, pagination.offset + pagination.limit - 1);

      if (!data || data.length === 0) {
        return res.json(paginatedResponse([], count || 0, pagination));
      }

      const subjectMap: Record<string, { total: number; count: number }> = {};
      data.forEach((r) => {
        if (!subjectMap[r.subject_id]) subjectMap[r.subject_id] = { total: 0, count: 0 };
        subjectMap[r.subject_id].total += Number(r.score || 0);
        subjectMap[r.subject_id].count++;
      });

      const trend = Object.entries(subjectMap).map(([label, stats]) => ({
        label,
        value: Math.round(stats.total / stats.count),
      }));

      return res.json(paginatedResponse(trend, count || data.length, pagination));
    } catch (error) {
      next(error);
    }
  }
}
