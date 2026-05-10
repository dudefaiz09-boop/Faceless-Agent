import { onRequest } from "firebase-functions/v2/https";
import app from "./app.js"; // Standard for ESM in Node 22+

/**
 * EduConnect API (Monolith rewrite proxy)
 * 
 * This Function v2 instance handles all /api/* requests.
 * It is configured with concurrency to optimize cost and performance.
 */
export const api = onRequest({
  region: "us-central1",
  concurrency: 80,
  minInstances: 0,
  maxInstances: 10,
  memory: "512Mi",
  timeoutSeconds: 60,
  cors: true,
}, app);
