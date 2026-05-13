import { ApiClient } from '../client/base.js';

export class StudentsService {
  constructor(private client: ApiClient) {}

  async create(data: any) {
    return this.client.post('/students/create', data, { allowOfflineQueue: true });
  }

  async update(uid: string, data: any) {
    return this.client.put(`/students/${uid}`, data, { allowOfflineQueue: true });
  }

  async delete(uid: string) {
    return this.client.delete(`/students/${uid}`, { allowOfflineQueue: true });
  }

  async bulkImport(data: any) {
    return this.client.post<{ results: Array<{ success: boolean; message?: string }> }>(
      '/students/bulk-import',
      data
    );
  }

  async getProfile(uid: string) {
    return this.client.get(`/students/${uid}`);
  }
}
