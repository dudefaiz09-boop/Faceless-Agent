/**
 * Local Node server entrypoint only.
 * Vercel imports src/app via api/index.ts to avoid triggering app.listen().
 */
import app from './app.js';
import { logger } from '@educonnect/logger';

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'UNHANDLED_REJECTION — process exiting');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'UNCAUGHT_EXCEPTION — process exiting');
  process.exit(1);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info({ port }, 'Server running');
});
