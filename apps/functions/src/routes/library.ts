import { Router } from 'express';
import { db } from '../lib/firebase';
import { checkPermission } from '../middleware/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const router = Router();

const LibrarySchema = z.object({
  title: z.string().min(2),
  author: z.string().min(2),
  type: z.enum(['book', 'article', 'video', 'document']),
  url: z.string().url().optional(),
});

router.post('/upload', checkPermission('manageLibrary'), async (req, res, next) => {
  try {
    const validatedData = LibrarySchema.parse(req.body);
    const docRef = await db.collection('library').add({
      ...validatedData,
      uploadedBy: (req as any).user.uid,
      uploadedAt: FieldValue.serverTimestamp()
    });
    res.status(201).json({ id: docRef.id, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation Failed', details: error.issues });
    next(error);
  }
});

router.post('/borrow', async (req, res, next) => {
  try {
    const { resourceId } = z.object({ resourceId: z.string() }).parse(req.body);
    const user = (req as any).user;
    const docRef = await db.collection('borrowHistory').add({
      resourceId, studentId: user.uid, status: 'borrowed',
      borrowedAt: FieldValue.serverTimestamp()
    });
    res.status(201).json({ id: docRef.id, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation Failed', details: error.issues });
    next(error);
  }
});

router.get('/borrow/history/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const user = (req as any).user;
    if (user.uid !== studentId && !user.isAdmin && !user.roles.includes('teacher')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const snapshot = await db.collection('borrowHistory').where('studentId', '==', studentId).get();
    res.json(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

export default router;
