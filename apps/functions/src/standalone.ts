import 'dotenv/config';
import { getConfig } from './lib/config.js';
import app from './app.js';

const config = getConfig();
const PORT = config.PORT || 3000;

async function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Backend] Server running in ${config.NODE_ENV} mode on port ${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
