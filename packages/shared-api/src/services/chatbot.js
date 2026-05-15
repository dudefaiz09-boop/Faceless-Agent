export class ChatbotService {
  client;
  constructor(client) {
    this.client = client;
  }
  async getHistory(uid) {
    return this.client.get(`/chatbot/history/${uid}`);
  }
  async query(query) {
    return this.client.post(
      '/ai/query',
      { query },
      {
        timeout: 30000, // Longer timeout for AI calls
        retry: 2, // Exponential backoff for rate limits handles 429
      }
    );
  }
  async sendFeedback(logId, feedback) {
    // We allow offline queueing for feedback so users don't lose their input if they go in a tunnel
    return this.client.post('/chatbot/feedback', { logId, feedback }, { allowOfflineQueue: true });
  }
}
//# sourceMappingURL=chatbot.js.map
