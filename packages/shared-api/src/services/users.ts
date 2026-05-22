import { ApiClient } from '../client/base.js';

export class UsersService {
  constructor(private client: ApiClient) {}

  list(params?: {
    tenantId?: string;
    role?: string;
    status?: 'active' | 'inactive';
    search?: string;
    limit?: number;
  }) {
    const query = new URLSearchParams();

    if (params?.tenantId) query.set('tenantId', params.tenantId);
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.client.get(`/users${suffix}`);
  }

  listTenants() {
    return this.client.get('/users/tenants');
  }

  listAuditLogs(params?: { targetUid?: string; limit?: number }) {
    const query = new URLSearchParams();

    if (params?.targetUid) query.set('targetUid', params.targetUid);
    if (params?.limit) query.set('limit', String(params.limit));

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.client.get(`/users/audit-logs${suffix}`);
  }

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
