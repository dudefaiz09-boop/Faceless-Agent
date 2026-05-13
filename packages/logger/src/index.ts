import pino from 'pino';

/**
 * STRUCTURED LOGGING FOR ENTERPRISE OBSERVABILITY
 * - GCP-aligned severity levels
 * - Child loggers for request/tenant tracing
 * - Standardized error reporting
 */

export interface LogContext {
  userId?: string;
  requestId?: string;
  tenantId?: string;
  classId?: string;
  path?: string;
  method?: string;
  [key: string]: any;
}

const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { severity: label.toUpperCase() }; // Align with Cloud Logging
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Extend baseLogger with custom helpers
export const logger = Object.assign(baseLogger, {
  /**
   * Creates a contextual child logger (e.g., for a specific request or tenant)
   */
  withContext: (context: LogContext) => baseLogger.child(context),
});

/**
 * TELEMETRY HELPERS
 */
export const telemetry = {
  trackPerformance: (name: string, durationMs: number, context?: LogContext) => {
    logger.info(
      {
        ...context,
        metricType: 'performance',
        metricName: name,
        durationMs,
      },
      `Performance Metric: ${name}`
    );
  },

  trackBusinessEvent: (name: string, context?: LogContext) => {
    logger.info(
      {
        ...context,
        metricType: 'business_event',
        eventName: name,
      },
      `Business Event: ${name}`
    );
  },
};

export * from './monitoring.js';
