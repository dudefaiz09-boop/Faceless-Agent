import { generateSafeContent } from '../../lib/ai.js';
import { db } from '../../lib/documents.js';

export class AiService {
  static async getChatbotResponse(userId: string, role: string, query: string) {
    const roleContexts: Record<string, string> = {
      student:
        'You are a helpful student assistant for EduConnect. Help with homework and explain concepts simply.',
      teacher: "You are a teacher's aide. Help with lesson planning and grading rubrics.",
      admin:
        'You are a school admin consultant. Provide insights on analytics and operational efficiency.',
    };

    const systemInstruction =
      roleContexts[role] || 'You are a helpful assistant for the EduConnect management system.';

    // Get recent history for context
    const historySnapshot = await db
      .collection('chatbotLogs')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(3)
      .get();

    const history = historySnapshot.docs
      .reverse()
      .map((doc: any) => `User: ${doc.data().query}\nAssistant: ${doc.data().response}`)
      .join('\n\n');

    const fullPrompt = history
      ? `Recent History:\n${history}\n\nCurrent User Query: ${query}`
      : query;

    const responseText = await generateSafeContent(systemInstruction, fullPrompt);

    // Sync log to DB to get ID
    const docRef = await db.collection('chatbotLogs').add({
      userId,
      role,
      query,
      response: responseText,
      timestamp: new Date().toISOString(),
    });

    return {
      id: docRef.id,
      response: responseText,
    };
  }

  static async getPerformanceSuggestions(studentId: string, records: any[]) {
    const systemInstruction =
      'You are an academic performance analyst. Analyze student scores and provide 3-5 actionable study tips.';
    const userPrompt = `Student Data: ${JSON.stringify(records)}`;

    return await generateSafeContent(systemInstruction, userPrompt);
  }

  static async getHistory(userId: string) {
    const snapshot = await db
      .collection('chatbotLogs')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp || new Date().toISOString(),
      };
    });
  }

  static async saveFeedback(logId: string, feedback: 'helpful' | 'not_helpful') {
    await db.collection('chatbotLogs').doc(logId).update({ feedback });
    return { success: true };
  }
}
