import { ApiClient } from '../client/base.js';

export class ParentPortalService {
  constructor(private client: ApiClient) {}

  studentProfile(uid: string) {
    return this.client.get(`/students/${uid}`);
  }

  studentBundle(uid: string, classId?: string) {
    return Promise.all([
      this.client.get(`/attendance/history/${uid}`),
      this.client.get(`/fees/${uid}`),
      this.client.get(`/performance/${uid}`),
      classId ? this.client.get(`/assignments/${classId}`) : Promise.resolve([]),
      this.client.get(`/assignments/history/${uid}`),
    ]);
  }
}
