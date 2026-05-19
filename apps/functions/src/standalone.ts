import 'dotenv/config';
import { getConfig } from './lib/config.js';
import app from './app.js';

const env = getConfig();
const PORT = env.PORT || 3000;

async function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Backend] Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
