// Vercel API entrypoint when the Vercel project root is apps/functions.
// Import the compiled Express app only; never import dist/index.js because it starts app.listen().
import app from '../dist/app.js';

export default app;
