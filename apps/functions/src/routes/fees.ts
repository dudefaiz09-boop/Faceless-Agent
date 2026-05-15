import { Router } from 'express';
import { db } from '../lib/documents.js';
import { checkPermission } from '../middleware/auth.js';
import { createNotification } from '../lib/notifications.js';
import { logger } from '@educonnect/logger';
import { env } from '../lib/config.js';

const router: Router = Router();

// Get currency symbol from config
const CURRENCY = env.CURRENCY || 'INR';
const CURRENCY_SYMBOL = CURRENCY === 'INR' ? '₹' : '$';

type FeeRecord = {
  studentId: string;
  amountDue: number;
  amountPaid?: number;
  dueDate: string;
  status?: 'pending' | 'paid' | 'partial';
  classId?: string;
  tenantId?: string;
  schoolId?: string | null;
  createdAt?: string;
};

function hasFeeAccess(user: NonNullable<Express.Request['user']>) {
  return user.isAdmin || user.permissions.manageFees || user.roles.includes('accountant');
}

function canViewStudentFees(user: NonNullable<Express.Request['user']>, studentId: string) {
  return (
    hasFeeAccess(user) ||
    studentId === user.uid ||
    (user.permissions.viewOwnRecords && user.linkedStudentIds.includes(studentId))
  );
}

function feeStatus(amountDue: number, amountPaid = 0): FeeRecord['status'] {
  if (amountPaid >= amountDue) return 'paid';
  if (amountPaid > 0) return 'partial';
  return 'pending';
}

function stableFeeId(classId: string, studentId: string, dueDate: string) {
  return `${classId}_${studentId}_${dueDate}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function safeFeeNotification(input: Parameters<typeof createNotification>[0]) {
  try {
    await createNotification(input);
  } catch (error) {
    logger.warn({ err: error, title: input.title }, 'Fee notification could not be created');
  }
}

router.get('/report/:classId', checkPermission('manageFees'), async (req, res, next) => {
  try {
    const snapshot = await db
      .collection('fees')
      .where('tenantId', '==', req.tenantId)
      .where('classId', '==', req.params.classId)
      .get();

    const records = snapshot.docs.map((doc) => {
      const fee = doc.data() as FeeRecord;
      const amountDue = Number(fee.amountDue || 0);
      const amountPaid = Number(fee.amountPaid || 0);
      return {
        id: doc.id,
        studentId: fee.studentId,
        amountDue,
        amountPaid,
        dueDate: fee.dueDate,
        status: feeStatus(amountDue, amountPaid),
      };
    });

    const totalDue = records.reduce((sum, record) => sum + record.amountDue, 0);
    const totalPaid = records.reduce((sum, record) => sum + record.amountPaid, 0);
    const pending = records.reduce(
      (sum, record) => sum + Math.max(record.amountDue - record.amountPaid, 0),
      0
    );

    res.json({ totalPaid, pending, totalDue, records });
  } catch (error) {
    next(error);
  }
});

router.post('/upload', checkPermission('manageFees'), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const records = Array.isArray(req.body.records) ? req.body.records : [];
    if (records.length === 0) {
      return res.status(400).json({ error: 'records array is required' });
    }

    const now = new Date().toISOString();
    const imported = await Promise.all(
      records.map(async (record: Partial<FeeRecord>) => {
        const studentId = String(record.studentId || '').trim();
        const classId = String(record.classId || '').trim();
        const dueDate = String(record.dueDate || '').trim();
        const amountDue = Number(record.amountDue || 0);

        if (!studentId || !classId || !dueDate || !Number.isFinite(amountDue) || amountDue <= 0) {
          throw Object.assign(new Error('Each fee record requires studentId, classId, amountDue, and dueDate'), {
            statusCode: 400,
          });
        }

        const id = stableFeeId(classId, studentId, dueDate);
        const ref = db.collection('fees').doc(id);
        const existing = await ref.get();
        const existingFee = existing.exists ? (existing.data() as FeeRecord) : null;
        const amountPaid = Number(existingFee?.amountPaid || 0);
        const payload: FeeRecord & Record<string, unknown> = {
          tenantId: req.tenantId,
          schoolId: req.user?.schoolId || null,
          studentId,
          classId,
          amountDue,
          amountPaid,
          dueDate,
          status: feeStatus(amountDue, amountPaid),
          uploadedAt: now,
          updatedAt: now,
          updatedBy: req.user?.uid,
        };

        await ref.set({
          ...payload,
          createdAt: existingFee ? existingFee.createdAt : now,
        });

        // Notify student
        await safeFeeNotification({
          title: 'Fee record updated',
          message: `A fee of ${CURRENCY_SYMBOL}${amountDue} is due on ${dueDate}.`,
          type: 'fee',
          href: '/fees',
          targetUserIds: [studentId],
          schoolId: req.user?.schoolId || null,
          tenantId: req.tenantId,
          actorId: req.user?.uid,
          metadata: { feeId: id, classId, dueDate, amountDue },
        });

        // Notify linked parents
        try {
          const usersSnapshot = await db.collection('users')
            .where('linkedStudentIds', 'array-contains', studentId)
            .get();
          const parentIds = usersSnapshot.docs.map(doc => doc.id);
          if (parentIds.length > 0) {
            await safeFeeNotification({
              title: 'Student fee record updated',
              message: `A fee of ${CURRENCY_SYMBOL}${amountDue} is due on ${dueDate} for your linked student.`,
              type: 'fee',
              href: '/fees',
              targetUserIds: parentIds,
              schoolId: req.user?.schoolId || null,
              tenantId: req.tenantId,
              actorId: req.user?.uid,
              metadata: { feeId: id, classId, dueDate, amountDue, studentId },
            });
          }
        } catch (error) {
          logger.warn({ err: error, studentId }, 'Failed to notify parents of fee update');
        }

        return { id, ...payload };
      })
    );

    res.status(201).json({ success: true, imported });
  } catch (error) {
    next(error);
  }
});

router.post('/pay', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const feeId = String(req.body.feeId || '').trim();
    const amount = Number(req.body.amount || 0);
    const method = String(req.body.method || 'online');

    if (!feeId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'feeId and positive amount are required' });
    }

    const feeRef = db.collection('fees').doc(feeId);
    const feeSnapshot = await feeRef.get();
    if (!feeSnapshot.exists) return res.status(404).json({ error: 'Fee record not found' });

    const fee = feeSnapshot.data() as FeeRecord;
    if (!canViewStudentFees(req.user, fee.studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const now = new Date().toISOString();
    const currentPaid = Number(fee.amountPaid || 0);
    const amountDue = Number(fee.amountDue || 0);
    const nextPaid = Math.min(currentPaid + amount, amountDue);
    const paymentRef = await db.collection('payments').add({
      tenantId: req.tenantId,
      schoolId: req.user.schoolId,
      feeId,
      studentId: fee.studentId,
      amount,
      method,
      paidAt: now,
      receiptUrl: `/fees/receipts/${feeId}`,
      recordedBy: req.user.uid,
    });

    await feeRef.update({
      amountPaid: nextPaid,
      status: feeStatus(amountDue, nextPaid),
      updatedAt: now,
      updatedBy: req.user.uid,
    });

    await safeFeeNotification({
      title: 'Payment recorded',
      message: `${CURRENCY_SYMBOL}${amount} was recorded for your fee account.`,
      type: 'fee',
      href: '/fees',
      targetUserIds: [fee.studentId],
      schoolId: req.user.schoolId,
      tenantId: req.tenantId,
      actorId: req.user.uid,
      metadata: { feeId, paymentId: paymentRef.id, amount },
    });

    res.status(201).json({
      success: true,
      paymentId: paymentRef.id,
      amountPaid: nextPaid,
      status: feeStatus(amountDue, nextPaid),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:uid', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!canViewStudentFees(req.user, req.params.uid)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const feesSnapshot = await db
      .collection('fees')
      .where('tenantId', '==', req.tenantId)
      .where('studentId', '==', req.params.uid)
      .get();
    const paymentsSnapshot = await db
      .collection('payments')
      .where('tenantId', '==', req.tenantId)
      .where('studentId', '==', req.params.uid)
      .get();

    const fees = feesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const payments = paymentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json({ fees, payments });
  } catch (error) {
    next(error);
  }
});

export default router;
