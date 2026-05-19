/**
 * Local Node server entrypoint only.
 * Vercel imports src/app via api/index.ts to avoid triggering app.listen().
 */
import './features/notifications/attendance.consumer.js';
import app from './app.js';
import { logger } from '@educonnect/logger';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info({ port }, 'Server running');
});
