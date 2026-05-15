import { ApiClient } from '../client/base.js';
export declare class StudentsService {
  private client;
  constructor(client: ApiClient);
  create(data: any): Promise<unknown>;
  update(uid: string, data: any): Promise<unknown>;
  delete(uid: string): Promise<unknown>;
  bulkImport(data: any): Promise<{
    results: Array<{
      success: boolean;
      message?: string;
    }>;
  }>;
  getProfile(uid: string): Promise<unknown>;
}
