export class StudentsService {
  client;
  constructor(client) {
    this.client = client;
  }
  async create(data) {
    return this.client.post('/students/create', data, { allowOfflineQueue: true });
  }
  async update(uid, data) {
    return this.client.put(`/students/${uid}`, data, { allowOfflineQueue: true });
  }
  async delete(uid) {
    return this.client.delete(`/students/${uid}`, { allowOfflineQueue: true });
  }
  async bulkImport(data) {
    return this.client.post('/students/bulk-import', data);
  }
  async getProfile(uid) {
    return this.client.get(`/students/${uid}`);
  }
}
//# sourceMappingURL=students.js.map
