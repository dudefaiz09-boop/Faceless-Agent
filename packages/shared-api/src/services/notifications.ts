import { ApiClient } from '../client/base.js';

export class NotificationsService {
  constructor(private client: ApiClient) {}

  list() {
    return this.client.get('/notifications');
  }

  markRead(id: string) {
    return this.client.request(`/notifications/${id}/read`, { method: 'PATCH', retry: 0 });
  }

  markAllRead() {
    return this.client.request('/notifications/read-all', { method: 'PATCH', retry: 0 });
  }

  clearRead() {
    return this.client.delete('/notifications/read', { retry: 0 });
  }

  delete(id: string) {
    return this.client.delete(`/notifications/${id}`, { retry: 0 });
  }
}
