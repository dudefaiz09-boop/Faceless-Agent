export class NotificationsService {
  constructor(client) {
    this.client = client;
  }
  list() {
    return this.client.get('/notifications');
  }
  markRead(id) {
    return this.client.request(`/notifications/${id}/read`, { method: 'PATCH', retry: 0 });
  }
  markAllRead() {
    return this.client.request('/notifications/read-all', { method: 'PATCH', retry: 0 });
  }
  clearRead() {
    return this.client.delete('/notifications/read', { retry: 0 });
  }
  delete(id) {
    return this.client.delete(`/notifications/${id}`, { retry: 0 });
  }
}
