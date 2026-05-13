import { onRequest, HttpsOptions } from 'firebase-functions/v2/https';
import app from './app.js';

/**
 * EduConnect API (Monolith rewrite proxy)
 *
 * This Function v2 instance handles all /api/* requests.
 */
const apiOptions: HttpsOptions = {
  region: 'us-central1',
  concurrency: 80,
  minInstances: 0,
  maxInstances: 10,
  memory: '512MiB',
  timeoutSeconds: 60,
  cors: true,
  secrets: ['GEMINI_API_KEY'], // Enable Secret Manager integration
};

export const api = onRequest(apiOptions, app);
