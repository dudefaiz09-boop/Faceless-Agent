// Vercel API entrypoint. The Vercel build command compiles the Express app into
// apps/functions/dist before this function is packaged.
import app from '../apps/functions/dist/index.js';

export default app;
