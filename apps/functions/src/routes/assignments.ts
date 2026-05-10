import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../lib/firebase';
import { checkPermission } from '../middleware/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { ai, GEMINI_MODEL } from '../lib/ai';
import { logger } from '@educonnect/logger';

const router = Router();

const AssignmentSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(5000),
  dueDate: z.string(),
  classId: z.string(),
});

const GradeSchema = z.object({
  assignmentId: z.string(),
  studentId: z.string(),
  grade: z.string(),
  feedback: z.string().optional(),
});

const SubmissionSchema = z.object({
  assignmentId: z.string(),
  content: z.string().min(10),
  fileUrl: z.string().url().optional().nullable(),
});

router.post('/create', checkPermission('manageAssignments'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = AssignmentSchema.parse(req.body);
    const docRef = await db.collection('assignments').add({
      ...validatedData,
      createdBy: req.user.uid,
      createdAt: FieldValue.serverTimestamp()
    });
    res.status(201).json({ id: docRef.id, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation Failed', details: error.issues });
    next(error);
  }
});

router.post('/grade', checkPermission('manageAssignments'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId, studentId, grade, feedback } = GradeSchema.parse(req.body);
    const docId = `${assignmentId}_${studentId}`;
    await db.collection('submissions').doc(docId).update({
      grade, feedback,
      gradedBy: req.user.uid,
      gradedAt: FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation Failed', details: error.issues });
    next(error);
  }
});

router.post('/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId, content, fileUrl } = SubmissionSchema.parse(req.body);
    const user = req.user;
    const docId = `${assignmentId}_${user.uid}`;
    
    const existingDoc = await db.collection('submissions').doc(docId).get();
    const existingData = existingDoc.data();

    if (existingData && existingData.checkedByAI && existingData.content === content && existingData.fileUrl === fileUrl) {
      return res.json({ success: true, cached: true, aiResult: { score: existingData.aiScore, feedback: existingData.aiFeedback } });
    }

    await db.collection('submissions').doc(docId).set({
      assignmentId, studentId: user.uid, studentName: user.displayName || 'Student',
      content, fileUrl: fileUrl || null, status: 'submitted',
      submittedAt: FieldValue.serverTimestamp(),
      grade: null, feedback: null, aiScore: null, aiFeedback: null, checkedByAI: false, recheckedByTeacher: false
    }, { merge: true });

    try {
      const promptText = `Evaluate: ${content}. Score out of 10 and feedback in JSON: {"score": number, "feedback": "string"}`;
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: promptText }] }]
      });
      const aiResultText = result.text || '{}';
      const aiResult = JSON.parse(aiResultText.replace(/```json|```/g, "").trim());
      await db.collection('submissions').doc(docId).update({
        aiScore: aiResult.score, aiFeedback: aiResult.feedback, checkedByAI: true,
        grade: aiResult.score.toString(), feedback: aiResult.feedback
      });
      res.json({ success: true, aiResult });
    } catch (aiError) {
      logger.error({ err: aiError, uid: user.uid }, 'AI evaluation failed');
      res.json({ success: true, aiError: 'AI offline' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation Failed', details: error.issues });
    next(error);
  }
});

export default router;
