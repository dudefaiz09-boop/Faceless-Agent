import { EventEmitter } from 'node:events';
import { logger } from '@educonnect/logger';

class AppEventEmitter extends EventEmitter {}

export const appEvents = new AppEventEmitter();

// Centralized Event Logging
appEvents.on('error', (err) => {
  logger.error({ err }, 'Application event error');
});

// Example of generic event listener
appEvents.on('any', (eventName, data) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.info({ eventName, data }, 'Application event');
  }
});
