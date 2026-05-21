import { ApiClient } from '../client/base.js';

export class LibraryService {
  constructor(private client: ApiClient) {}

  resources() {
    return this.client.get('/library/resources');
  }

  borrowHistory(uid: string) {
    return this.client.get(`/library/borrow/history/${uid}`);
  }

  upload(data: unknown) {
    return this.client.post('/library/upload', data, { retry: 0 });
  }

  updateResource(id: string, data: unknown) {
    return this.client.put(`/library/resources/${id}`, data, { retry: 0 });
  }

  borrow(data: unknown) {
    return this.client.post('/library/borrow', data, { retry: 0 });
  }

  returnBook(data: unknown) {
    return this.client.post('/library/return', data, { retry: 0 });
  }

  deleteResource(id: string) {
    return this.client.delete(`/library/resources/${id}`, { retry: 0 });
  }
}
