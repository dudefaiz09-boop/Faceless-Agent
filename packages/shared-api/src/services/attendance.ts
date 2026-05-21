import { ApiClient } from '../client/base.js';

export class AttendanceService {
  constructor(private client: ApiClient) {}

  list(classId: string, date: string) {
    return this.client.get(`/attendance?classId=${classId}&date=${date}`);
  }

  history(uid: string) {
    return this.client.get(`/attendance/history/${uid}`);
  }

  report(classId: string) {
    return this.client.get(`/attendance/report/${classId}`);
  }

  mark(data: unknown, idempotencyKey?: string) {
    return this.client.post('/attendance/mark', data, {
      headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
      retry: 0,
    });
  }
}
