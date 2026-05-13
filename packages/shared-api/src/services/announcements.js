export class AnnouncementsService {
    client;
    constructor(client) {
        this.client = client;
    }
    async getAll() {
        return this.client.get('/announcements');
    }
    async create(data) {
        return this.client.post('/announcements', data);
    }
    async delete(id) {
        return this.client.delete(`/announcements/${id}`);
    }
}
//# sourceMappingURL=announcements.js.map