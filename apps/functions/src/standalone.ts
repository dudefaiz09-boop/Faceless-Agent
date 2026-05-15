import 'dotenv/config';
import { env } from './lib/config.js'; // Trigger early validation
import app from './app.js';

// The 'env' import above validates OpenRouter and other runtime settings.
// If it fails, the process will crash safely with a clear error message.

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
