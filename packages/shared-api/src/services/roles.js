export class RolesService {
  constructor(client) {
    this.client = client;
  }
  list() {
    return this.client.get('/roles');
  }
}
