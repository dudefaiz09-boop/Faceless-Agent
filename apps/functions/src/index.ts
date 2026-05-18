import './features/notifications/attendance.consumer.js';
import app from './app.js';
import { logger } from '@educonnect/logger';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info({ port }, 'Server running');
});
