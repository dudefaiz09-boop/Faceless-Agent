import { Router } from 'express';
import { db } from '../lib/firebase';
import { checkPermission } from '../middleware/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const router = Router();

const FeeRecordSchema = z.object({
  studentId: z.string(),
  amount: z.number().positive(),
  type: z.string(),
  dueDate: z.string(),
});

const FeeUploadSchema = z.object({
  records: z.array(FeeRecordSchema),
});

const PaymentSchema = z.object({
  feeId: z.string(),
  amount: z.number().positive(),
  method: z.enum(['cash', 'card', 'online']),
});

router.post('/upload', checkPermission('manageFees'), async (req, res, next) => {
  try {
    const { records } = FeeUploadSchema.parse(req.body);
    const batch = db.batch();
    for (const record of records) {
      const docRef = db.collection('fees').doc();
      batch.set(docRef, { ...record, status: 'unpaid', createdAt: FieldValue.serverTimestamp() });
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
    if (user.uid !== studentId && !user.isAdmin && !user.roles.includes('staff')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const feeSnap = await db.collection('fees').where('studentId', '==', studentId).get();
    const paySnap = await db.collection('payments').where('studentId', '==', studentId).get();
    res.json({
      fees: feeSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })),
      payments: paySnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }))
    });
  } catch (error) {
    next(error);
  }
});

router.post('/pay', async (req, res, next) => {
  try {
    const { feeId, amount, method } = PaymentSchema.parse(req.body);
    const user = (req as any).user;
    await db.collection('payments').add({
      feeId, studentId: user.uid, amount, method, timestamp: FieldValue.serverTimestamp()
    });
    await db.collection('fees').doc(feeId).update({ status: 'paid' });
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation Failed', details: error.issues });
    next(error);
  }
});

export default router;
