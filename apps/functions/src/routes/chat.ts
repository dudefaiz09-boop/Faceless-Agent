import { Router } from 'express';
import { db } from '../lib/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const router = Router();

const MessageSchema = z.object({
  recipientId: z.string(),
  text: z.string().min(1),
  type: z.enum(['text', 'image', 'file']).optional().default('text'),
});

router.post('/send', async (req, res, next) => {
  try {
    const { recipientId, text, type } = MessageSchema.parse(req.body);
    const user = (req as any).user;
    const conversationId = [user.uid, recipientId].sort().join('_');
    const msgRef = await db.collection('messages').add({
      conversationId, senderId: user.uid, senderName: user.displayName || 'User',
      recipientId, text, type, timestamp: FieldValue.serverTimestamp()
    });
    res.json({ id: msgRef.id, conversationId });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation Failed', details: error.issues });
    next(error);
  }
});

router.get('/messages/:conversationId', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const user = (req as any).user;
    if (!conversationId.includes(user.uid)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const snapshot = await db.collection('messages').where('conversationId', '==', conversationId).orderBy('timestamp', 'asc').get();
    res.json(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

export default router;
