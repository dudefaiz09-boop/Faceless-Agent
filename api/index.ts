// Vercel serverless entrypoint.
// Import the Express app source directly.
// Do not import apps/functions/src/index.ts because it starts a listener with app.listen().
import app from '../apps/functions/src/app';

export default app;
