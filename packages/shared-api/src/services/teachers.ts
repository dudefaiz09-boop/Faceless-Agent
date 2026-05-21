import { ApiClient } from '../client/base.js';

export class TeachersService {
  constructor(private client: ApiClient) {}

  create(data: unknown) {
    return this.client.post('/teachers/create', data, { retry: 0 });
  }

  update(uid: string, data: unknown) {
    return this.client.put(`/teachers/${uid}`, data, { retry: 0 });
  }

  delete(uid: string) {
    return this.client.delete(`/teachers/${uid}`, { retry: 0 });
  }

  bulkImport(users: unknown[]) {
    return this.client.post('/teachers/bulk-import', { users }, { retry: 0 });
  }
}
