import { EngagementMetric } from './schemas.js';

/**
 * ENGAGEMENT ANALYTICS ENGINE
 */
export class EngagementAnalytics {
  /**
   * Identifies disengaged cohorts based on completion rates and attendance
   */
  static identifyAtRiskCohorts(metrics: EngagementMetric[]): string[] {
    const atRiskSchools: string[] = [];

    for (const metric of metrics) {
      if (metric.attendanceRate < 0.85 || metric.assignmentCompletionRate < 0.7) {
        atRiskSchools.push(metric.schoolId);
      }
    }

    return [...new Set(atRiskSchools)];
  }

  /**
   * Calculates weighted engagement score
   */
  static calculateEngagementScore(metric: EngagementMetric): number {
    const weights = {
      activeUsers: 0.2,
      attendance: 0.4,
      assignments: 0.4,
    };

    // Normalize active users (simplified)
    const activeUserFactor = Math.min(metric.activeUsers / 100, 1);

    return (
      activeUserFactor * weights.activeUsers +
      metric.attendanceRate * weights.attendance +
      metric.assignmentCompletionRate * weights.assignments
    );
  }
}
