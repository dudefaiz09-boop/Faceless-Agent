export class PerformanceService {
  constructor(client) {
    this.client = client;
  }
  student(uid) {
    return this.client.get(`/performance/${uid}`);
  }
  report(classId) {
    return this.client.get(`/performance/report/${classId}`);
  }
  upload(records, idempotencyKey) {
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
