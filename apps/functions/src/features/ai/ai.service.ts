import { generateSafeContent } from '../../lib/ai.js';
import { db } from '../../lib/documents.js';

export class AiService {
  static async getChatbotResponse(userId: string, role: string, query: string, mode = 'chat') {
    const roleContexts: Record<string, string> = {
      student:
        'You are EduConnect AI for students. Help with homework, study planning, concept explanations, revision notes, and confidence. Be clear, safe, encouraging, and concise.',
      teacher:
        'You are EduConnect AI for teachers. Help with lesson planning, quiz generation, assignment design, rubrics, feedback, and class summaries. Prefer structured outputs.',
      admin:
        'You are EduConnect AI for school administrators. Help with fee summaries, attendance insights, teacher analytics, school reports, operational recommendations, and announcement drafts.',
      principal:
        'You are EduConnect AI for principals. Help with academic oversight, attendance trends, staff summaries, reports, and parent communication.',
      librarian:
        'You are EduConnect AI for librarians. Help with book recommendations, catalog workflows, overdue notices, and reading programs.',
      accountant:
        'You are EduConnect AI for accountants. Help with fee collection summaries, pending dues, receipts, and revenue explanations.',
      parent:
        'You are EduConnect AI for parents. Explain student progress, attendance, assignments, and school communication in a helpful tone.',
    };

    const systemInstruction = [
      roleContexts[role] || 'You are a helpful assistant for the EduConnect management system.',
      `Current mode: ${mode}.`,
      'Use markdown. Avoid inventing private records. If data is missing, state what is needed.',
    ].join('\n');

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

    const fullPrompt = history ? `Recent History:\n${history}\n\nCurrent User Query: ${query}` : query;

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
