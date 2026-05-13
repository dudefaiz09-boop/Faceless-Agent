import { ApiClient } from '../client/base.js';
import { Announcement, AnnouncementInput } from '@educonnect/shared';

export class AnnouncementsService {
  constructor(private client: ApiClient) {}

  async getAll() {
    return this.client.get<Announcement[]>('/announcements');
  }

  async create(data: AnnouncementInput) {
    return this.client.post<Announcement>('/announcements', data);
  }

  async delete(id: string) {
    return this.client.delete(`/announcements/${id}`);
  }
}
