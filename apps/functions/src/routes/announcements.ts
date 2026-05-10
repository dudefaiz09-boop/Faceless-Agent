import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../lib/firebase';
import { checkPermission } from '../middleware/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { logger } from '@educonnect/logger';

const router = Router();

const AnnouncementSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(10).max(5000),
  targetClasses: z.array(z.string()).optional().default(['all']),
  visibility: z.enum(['public', 'private']).optional().default('public'),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    let query: any = db.collection('announcements');
    if (user && user.roles.includes('student')) {
      const studentClasses = ['all'];
      if (user.classId) studentClasses.push(user.classId);
      query = query.where('targetClasses', 'array-contains-any', studentClasses);
    }
    const snapshot = await query.get();
    const announcements = snapshot.docs
      .map((doc: any) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
    res.json(announcements);
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Failed to fetch announcements');
    next(error);
  }
});

router.post('/', checkPermission('manageAnnouncements'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = AnnouncementSchema.parse(req.body);
    const docRef = await db.collection('announcements').add({
      ...validatedData,
      authorId: req.user.uid,
      createdAt: FieldValue.serverTimestamp()
    });
    res.status(201).json({ id: docRef.id, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Failed', details: error.issues });
    }
    next(error);
  }
});

export default router;
