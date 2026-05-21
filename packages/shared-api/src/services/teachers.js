export class TeachersService {
  constructor(client) {
    this.client = client;
  }
  create(data) {
    return this.client.post('/teachers/create', data, { retry: 0 });
  }
  update(uid, data) {
    return this.client.put(`/teachers/${uid}`, data, { retry: 0 });
  }
  delete(uid) {
    return this.client.delete(`/teachers/${uid}`, { retry: 0 });
  }
  bulkImport(users) {
    return this.client.post('/teachers/bulk-import', { users }, { retry: 0 });
  }
}
