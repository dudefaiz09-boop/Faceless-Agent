import { ApiClient } from '../client/base.js';

export class UsersService {
  constructor(private client: ApiClient) {}

  updateProfile(data: unknown) {
    return this.client.put('/users/profile', data, { retry: 0 });
  }

  create(data: unknown, idempotencyKey?: string) {
    return this.client.post('/users/create', data, {
      headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
      retry: 0,
    });
  }

  update(uid: string, data: unknown) {
    return this.client.put(`/users/${uid}`, data, { retry: 0 });
  }

  deactivate(uid: string) {
    return this.client.request(`/users/${uid}/deactivate`, { method: 'PATCH', retry: 0 });
  }

  bulkImport(users: unknown[], idempotencyKey?: string) {
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
