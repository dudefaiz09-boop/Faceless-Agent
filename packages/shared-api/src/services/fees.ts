import { ApiClient } from '../client/base.js';

export class FeesService {
  constructor(private client: ApiClient) {}

  getStudentAccount(uid: string) {
    return this.client.get(`/fees/${uid}`);
  }

  getClassReport(classId: string) {
    return this.client.get(`/fees/report/${classId}`);
  }

  upload(records: unknown[], idempotencyKey?: string) {
    return this.client.post(
      '/fees/upload',
      { records },
      {
        headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
        retry: 0,
      }
    );
  }

  pay(data: { feeId: string; amount: number; method?: string }, idempotencyKey?: string) {
    return this.client.post('/fees/pay', data, {
      headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
      retry: 0,
    });
  }
}
