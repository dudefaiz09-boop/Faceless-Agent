import { Router } from 'express';
import { db } from '../lib/firebase';
import { ai, GEMINI_MODEL } from '../lib/ai';
import { FieldValue } from 'firebase-admin/firestore';

const router = Router();

router.post('/query', async (req, res, next) => {
  try {
    const { query } = req.body;
    const user = (req as any).user;
    const historySnapshot = await db.collection('chatbotLogs').where('userId', '==', user.uid).orderBy('timestamp', 'desc').limit(3).get();
    const history = historySnapshot.docs.reverse().map((doc: any) => `User: ${doc.data().query}\nAssistant: ${doc.data().response}`).join('\n\n');
    
    const roleContexts: any = { student: "Help with homework.", teacher: "Help with lessons.", admin: "Help with ops." };
    const systemPrompt = roleContexts[user.roles[0]] || "Helpful assistant.";
    
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: `SI: ${systemPrompt}\nHistory: ${history}\nQuery: ${query}` }] }],
      config: { maxOutputTokens: 500, temperature: 0.7 }
    });

    const responseText = result.text;
    const logRef = await db.collection('chatbotLogs').add({
      userId: user.uid, userName: user.displayName || 'User', role: user.roles[0],
      query, response: responseText, timestamp: FieldValue.serverTimestamp()
    });

    res.json({ id: logRef.id, response: responseText, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

export default router;
