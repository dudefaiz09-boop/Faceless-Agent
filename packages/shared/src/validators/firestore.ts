import { z } from 'zod';
import { AnnouncementSchema } from '../schemas/index.js';

/**
 * FIRESTORE VALIDATORS
 * Ensures data being written to Firestore matches our centralized schemas.
 */

export function validateAnnouncement(data: unknown) {
  return AnnouncementSchema.parse(data);
}

// Add more validators as schemas grow
