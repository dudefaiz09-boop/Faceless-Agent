import { z } from 'zod';
import { AnnouncementSchema } from '../schemas/index.js';

/**
 * DOCUMENT VALIDATORS
 * Ensures document data matches our centralized schemas.
 */

export function validateAnnouncement(data: unknown) {
  return AnnouncementSchema.parse(data);
}

// Add more validators as schemas grow
