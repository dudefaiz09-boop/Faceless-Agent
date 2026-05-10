import { Router } from 'express';
import { db } from '../lib/firebase';
import { checkPermission } from '../middleware/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { ai, GEMINI_MODEL } from '../lib/ai';

const router = Router();

const PerformanceRecordSchema = z.object({
  studentId: z.string(),
  subject: z.string(),
  score: z.number().min(0).max(100),
  term: z.string(),
});

const PerformanceUploadSchema = z.object({
  records: z.array(PerformanceRecordSchema),
});

router.post('/upload', checkPermission('managePerformance'), async (req, res, next) => {
  try {
    const { records } = PerformanceUploadSchema.parse(req.body);
    const batch = db.batch();
    for (const record of records) {
      const docRef = db.collection('performance').doc();
      batch.set(docRef, {
        ...record,
        uploadedBy: (req as any).user.uid,
        uploadedAt: FieldValue.serverTimestamp()
      });
    }
    await batch.commit();
    res.json({ success: true, count: records.length });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation Failed', details: error.issues });
    next(error);
  }
});

router.get('/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const user = (req as any).user;
    if (user.uid !== studentId && !user.isAdmin && !user.roles.includes('teacher')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const snapshot = await db.collection('performance').where('studentId', '==', studentId).get();
    res.json(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

router.post('/ai-suggestions', async (req, res) => {
  try {
    const { records } = z.object({ records: z.array(z.any()) }).parse(req.body);
    const prompt = `Based on these records: ${JSON.stringify(records)}, provide 3 study tips in JSON: {"suggestions": ["tip1", "tip2", "tip3"]}`;
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    const aiResultText = result.text || '{"suggestions": []}';
    const aiResult = JSON.parse(aiResultText.replace(/```json|```/g, "").trim());
    res.json({ ...aiResult, generatedAt: new Date().toISOString() });
  } catch {
    res.json({ suggestions: ["Keep studying hard!", "Review your notes regularly.", "Ask teachers for help."], generatedAt: new Date().toISOString() });
  }
});

export default router;
