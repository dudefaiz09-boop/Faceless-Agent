import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { severity: label.toUpperCase() }; // Align with GCP logging levels
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
