export class AssignmentsService {
    client;
    constructor(client) {
        this.client = client;
    }
    async getAssignments(classId) {
        return this.client.get(`/assignments${classId ? `?classId=${classId}` : ''}`);
    }
    async createAssignment(data) {
        return this.client.post('/assignments/create', data);
    }
    async submitAssignment(data) {
        return this.client.post('/assignments/submit', data);
    }
    async getMyHistory(uid) {
        return this.client.get(`/assignments/history/${uid}`);
    }
    async getSubmissions(assignmentId) {
        return this.client.get(`/assignments/submissions/${assignmentId}`);
    }
    async gradeSubmission(data) {
        return this.client.post('/assignments/recheck', data);
    }
}
//# sourceMappingURL=assignments.js.map