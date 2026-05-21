import { ApiClient } from '../client/base.js';

export class PerformanceService {
  constructor(private client: ApiClient) {}

  student(uid: string) {
    return this.client.get(`/performance/${uid}`);
  }

  report(classId: string) {
    return this.client.get(`/performance/report/${classId}`);
  }

  upload(records: unknown[], idempotencyKey?: string) {
    return this.client.post(
      '/performance/upload',
      { records },
      {
        headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
        retry: 0,
      }
    );
  }
}
