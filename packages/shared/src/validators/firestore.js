import { AnnouncementSchema } from '../schemas/index.js';
/**
 * FIRESTORE VALIDATORS
 * Ensures data being written to Firestore matches our centralized schemas.
 */
export function validateAnnouncement(data) {
    return AnnouncementSchema.parse(data);
}
// Add more validators as schemas grow
//# sourceMappingURL=firestore.js.map