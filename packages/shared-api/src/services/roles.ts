import { ApiClient } from '../client/base.js';

export class RolesService {
  constructor(private client: ApiClient) {}

  list() {
    return this.client.get('/roles');
  }
}
