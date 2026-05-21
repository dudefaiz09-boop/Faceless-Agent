export class FeesService {
  constructor(client) {
    this.client = client;
  }
  getStudentAccount(uid) {
    return this.client.get(`/fees/${uid}`);
  }
  getClassReport(classId) {
    return this.client.get(`/fees/report/${classId}`);
  }
  upload(records, idempotencyKey) {
    return this.client.post(
      '/fees/upload',
      { records },
      {
        headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
        retry: 0,
      }
    );
  }
  pay(data, idempotencyKey) {
    return this.client.post('/fees/pay', data, {
      headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
      retry: 0,
    });
  }
}
