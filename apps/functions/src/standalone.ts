import 'dotenv/config';
import app from './src/server/app';

// Startup Validation
const REQUIRED_ENV = ['GEMINI_API_KEY'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key] && !process.env.VITE_GEMINI_API_KEY);
if (missingEnv.length > 0) {
  console.error(`CRITICAL: Missing required environment variables: ${missingEnv.join(', ')}`);
  if (process.env.NODE_ENV !== 'test') process.exit(1);
}

const PORT = process.env.PORT || 3000;

async function startServer() {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
