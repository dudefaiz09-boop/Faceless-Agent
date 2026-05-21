export class UsersService {
  constructor(client) {
    this.client = client;
  }
  updateProfile(data) {
    return this.client.put('/users/profile', data, { retry: 0 });
  }
  create(data, idempotencyKey) {
    return this.client.post('/users/create', data, {
      headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
      retry: 0,
    });
  }
  update(uid, data) {
    return this.client.put(`/users/${uid}`, data, { retry: 0 });
  }
  deactivate(uid) {
    return this.client.request(`/users/${uid}/deactivate`, { method: 'PATCH', retry: 0 });
  }
  bulkImport(users, idempotencyKey) {
    return this.client.post(
      '/users/bulk-import',
      { users },
      {
        headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
        retry: 0,
      }
    );
  }
}
