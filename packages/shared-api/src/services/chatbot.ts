import { ApiClient } from '../client/base.js';

export class ChatbotService {
  constructor(private client: ApiClient) {}

  async getHistory(uid: string) {
    return this.client.get<any[]>(`/chatbot/history/${uid}`);
  }

  async query(query: string) {
    return this.client.post<any>(
      '/ai/query',
      { query },
      {
        timeout: 30000, // Longer timeout for AI calls
        retry: 2, // Exponential backoff for rate limits handles 429
      }
    );
  }

  async sendFeedback(logId: string, feedback: 'helpful' | 'not_helpful') {
    // We allow offline queueing for feedback so users don't lose their input if they go in a tunnel
    return this.client.post('/chatbot/feedback', { logId, feedback }, { allowOfflineQueue: true });
  }
}
