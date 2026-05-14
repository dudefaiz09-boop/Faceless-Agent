import { AnnouncementSchema } from '../schemas/index.js';

export function validateAnnouncement(data) {
  return AnnouncementSchema.parse(data);
}
