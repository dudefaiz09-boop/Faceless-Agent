import { AttendanceRecord } from '@educonnect/types';
import { AttendanceStats } from './schemas.js';

/**
 * ATTENDANCE ANALYTICS ENGINE
 * Pure logic for aggregating and analyzing attendance patterns.
 */
export class AttendanceAnalytics {
  /**
   * Aggregates raw attendance records into daily stats
   */
  static calculateStats(
    records: AttendanceRecord[],
    schoolId: string,
    date: string
  ): AttendanceStats {
    const total = records.length;
    if (total === 0) {
      return {
        schoolId,
        date,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        totalStudents: 0,
        attendanceRate: 0,
      };
    }

    const presentCount = records.filter((r) => r.status === 'present').length;
    const absentCount = records.filter((r) => r.status === 'absent').length;
    const lateCount = records.filter((r) => r.status === 'late').length;

    return {
      schoolId,
      date,
      presentCount,
      absentCount,
      lateCount,
      totalStudents: total,
      attendanceRate: (presentCount + lateCount) / total,
    };
  }

  /**
   * Detects declining attendance trends for early intervention
   */
  static detectDecliningTrend(stats: AttendanceStats[], threshold: number = 0.05): boolean {
    if (stats.length < 3) return false;

    // Sort by date ascending
    const sorted = [...stats].sort((a, b) => a.date.localeCompare(b.date));

    const rates = sorted.map((s) => s.attendanceRate);
    let declines = 0;

    for (let i = 1; i < rates.length; i++) {
      if (rates[i] < rates[i - 1]) {
        declines++;
      }
    }

    // If more than 60% of steps are declines, or significant drop between start and end
    const overallDrop = rates[0] - rates[rates.length - 1];
    return declines / (rates.length - 1) > 0.6 || overallDrop > threshold;
  }
}
