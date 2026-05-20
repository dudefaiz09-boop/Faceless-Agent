import { randomUUID } from 'node:crypto';
import { generateSafeContent } from '../../lib/ai.js';
import { db } from '../../lib/documents.js';

type CachedAiResponse = {
  response: string;
  expires: number;
};

const AI_CACHE = new Map<string, CachedAiResponse>();
const CACHE_TTL = 5 * 60 * 1000;

export class AiService {
  static async getChatbotResponse(
    userId: string,
    role: string,
    query: string,
    mode = 'chat',
    context?: string
  ) {
    const tenantId = userId.startsWith('tenant:') ? userId.split(':')[1] : 'default';
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `${tenantId}:${role}:${userId}:${mode}:${normalizedQuery}`;

    const cached = AI_CACHE.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      console.log('[AI] Serving cached response for query:', normalizedQuery.slice(0, 50));
      return {
        id: `cached-${randomUUID()}`,
        response: cached.response,
        cached: true,
      };
    }

    const roleContexts: Record<string, string> = {
      student:
        'You are EduConnect AI for students. Help with homework, study planning, concept explanations, revision notes, and confidence. Be clear, safe, encouraging, and concise.',
      teacher:
        'You are EduConnect AI for teachers. Help with lesson planning, quiz generation, assignment design, rubrics, feedback, and class summaries. Prefer structured outputs.',
      admin:
        'You are EduConnect AI for school administrators. Help with fee summaries, attendance insights, teacher analytics, school reports, operational recommendations, and announcement drafts. You can also assist with academic support when asked, including concept explanations, assignment help, study plans, lesson ideas, quizzes, and revision guidance. Never refuse an academic question only because the user is an administrator.',
      principal:
        'You are EduConnect AI for principals. Help with academic oversight, attendance trends, staff summaries, reports, parent communication, and general academic support when requested.',
      librarian:
        'You are EduConnect AI for librarians. Help with book recommendations, catalog workflows, overdue notices, and reading programs.',
      accountant:
        'You are EduConnect AI for accountants. Help with fee collection summaries, pending dues, receipts, revenue explanations, and basic study support if asked.',
      parent:
        'You are EduConnect AI for parents. Explain student progress, attendance, assignments, school communication, and learning support in a helpful tone.',
    };

    const modeInstructions: Record<string, string> = {
      chat:
        'In chat mode, answer the user directly. If they ask about assignments, subjects, or study strategy, provide real academic help instead of redirecting them away.',
      lesson:
        'In lesson mode, create a clear lesson explanation or teaching plan with examples, steps, and outcomes.',
      quiz:
        'In quiz mode, generate a useful quiz with answers or answer keys unless the user asks otherwise.',
      report:
        'In report mode, produce a structured report, summary, or analysis tailored to the user request.',
      announcement:
        'In announcement mode, draft polished copy such as notices, messages, reminders, or communication drafts.',
    };

    const systemInstruction = [
      roleContexts[role] || 'You are a helpful assistant for the EduConnect management system.',
      modeInstructions[mode] || `Current mode: ${mode}.`,
      context || '',
      'You may help with both school operations and academics. Do not say a study, assignment, or subject question is outside scope just because the current user role is administrative.',
      'IMPORTANT: Always use the provided school database context as the source of truth if available. If the context includes specific school records (e.g., attendance), answer the user query directly using that data. If no record is found in the provided context for a specific date or student, state that "No record was found", do not say you do not have access. Never invent or hallucinate school data.',
      'Use markdown for formatting.',
    ].join('\n');

    let history = '';
    try {
      const historySnapshot = await db
        .collection('chatbotLogs')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(3)
        .get();

      history = historySnapshot.docs
        .reverse()
        .map(
          (doc) =>
            `User: ${(doc.data() as { query: string }).query}\nAssistant: ${
              (doc.data() as { response: string }).response
            }`
        )
        .join('\n\n');
    } catch (error) {
      console.error('[AI] Chat history load failed. Continuing without history:', error);
    }

    const fullPrompt = history
      ? `Recent History:\n${history}\n\nCurrent User Query: ${query}`
      : query;

    const responseText = await generateSafeContent(systemInstruction, fullPrompt);

    AI_CACHE.set(cacheKey, {
      response: responseText,
      expires: Date.now() + CACHE_TTL,
    });

    try {
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
    } catch (error) {
      console.error(
        '[AI] Chat log save failed. Returning AI response without persisted log:',
        error
      );
      return {
        id: randomUUID(),
        response: responseText,
      };
    }
  }

  static async getPerformanceSuggestions(studentId: string, records: any[]) {
    const systemInstruction =
      'You are an academic performance analyst. Analyze student scores and provide 3-5 actionable study tips.';
    const userPrompt = `Student Data: ${JSON.stringify(records)}`;

    return await generateSafeContent(systemInstruction, userPrompt);
  }

  static async getHistory(userId: string) {
    try {
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
          timestamp:
            data.timestamp?.toDate?.()?.toISOString() || data.timestamp || new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('[AI] Chat history fetch failed. Returning empty history:', error);
      return [];
    }
  }

  static async saveFeedback(logId: string, feedback: 'helpful' | 'not_helpful') {
    await db.collection('chatbotLogs').doc(logId).update({ feedback });
    return { success: true };
  }
}
