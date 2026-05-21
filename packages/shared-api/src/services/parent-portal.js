export class ParentPortalService {
  constructor(client) {
    this.client = client;
  }
  studentProfile(uid) {
    return this.client.get(`/students/${uid}`);
  }
  studentBundle(uid, classId) {
    return Promise.all([
      this.client.get(`/attendance/history/${uid}`),
      this.client.get(`/fees/${uid}`),
      this.client.get(`/performance/${uid}`),
      classId ? this.client.get(`/assignments/${classId}`) : Promise.resolve([]),
      this.client.get(`/assignments/history/${uid}`),
    ]);
  }
}
