import { ApiClient } from '../client/base.js';
export declare class ChatbotService {
  private client;
  constructor(client: ApiClient);
  getHistory(uid: string): Promise<any[]>;
  query(query: string): Promise<any>;
  sendFeedback(logId: string, feedback: 'helpful' | 'not_helpful'): Promise<unknown>;
}
