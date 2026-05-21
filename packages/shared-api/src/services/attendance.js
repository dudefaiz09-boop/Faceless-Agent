export class AttendanceService {
  constructor(client) {
    this.client = client;
  }
  list(classId, date) {
    return this.client.get(`/attendance?classId=${classId}&date=${date}`);
  }
  history(uid) {
    return this.client.get(`/attendance/history/${uid}`);
  }
  report(classId) {
    return this.client.get(`/attendance/report/${classId}`);
  }
  mark(data, idempotencyKey) {
    return this.client.post('/attendance/mark', data, {
      headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
      retry: 0,
    });
  }
}
