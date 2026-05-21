export class LibraryService {
  constructor(client) {
    this.client = client;
  }
  resources() {
    return this.client.get('/library/resources');
  }
  borrowHistory(uid) {
    return this.client.get(`/library/borrow/history/${uid}`);
  }
  upload(data) {
    return this.client.post('/library/upload', data, { retry: 0 });
  }
  updateResource(id, data) {
    return this.client.put(`/library/resources/${id}`, data, { retry: 0 });
  }
  borrow(data) {
    return this.client.post('/library/borrow', data, { retry: 0 });
  }
  returnBook(data) {
    return this.client.post('/library/return', data, { retry: 0 });
  }
  deleteResource(id) {
    return this.client.delete(`/library/resources/${id}`, { retry: 0 });
  }
}
