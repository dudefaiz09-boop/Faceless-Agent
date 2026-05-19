// Vercel API entrypoint. The Vercel build command compiles the Express app into
// apps/functions/dist/app.js before this function is packaged.
// We import from dist/app.js specifically to avoid triggering app.listen()
// which is present in dist/index.js.
import app from '../apps/functions/dist/app.js';

export default app;
