import { db } from '../../lib/documents.js';
import { createNotification } from '../../lib/notifications.js';
import { logger } from '@educonnect/logger';
import { AppError } from '../../middleware/error.js';
import {
  actorHasRole,
  assertCanAccessStudent,
  isSchoolAdmin,
  type ActorContext,
} from '../../lib/authorization.js';

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
type Actor = ActorContext;

const CURRENCY = process.env.CURRENCY || 'INR';
const CURRENCY_SYMBOL = CURRENCY === 'INR' ? '₹' : '$';

function isTenantFee(fee: Pick<FeeRecord, 'tenantId' | 'schoolId'>, tenantId?: string) {
  return fee.tenantId === tenantId || fee.schoolId === tenantId;
}
function feeStatus(amountDue: number, amountPaid = 0): FeeRecord['status'] {
  if (amountPaid >= amountDue) return 'paid';
  if (amountPaid > 0) return 'partial';
  return 'pending';
}
function stableFeeId(classId: string, studentId: string, dueDate: string) {
  return `${classId}_${studentId}_${dueDate}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function safeNotification(input: any) {
  try {
    await createNotification(input);
  } catch (error) {
    logger.warn({ err: error, title: input.title }, 'Fee notification could not be created');
  }
}

export class FeesRepository {
  static async getReport(classId: string, tenantId: string) {
    const snapshot = await db
      .collection('fees')
      .where('tenantId', '==', tenantId)
      .where('classId', '==', classId)
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
    const totalDue = records.reduce((sum, r) => sum + r.amountDue, 0);
    const totalPaid = records.reduce((sum, r) => sum + r.amountPaid, 0);
    const pending = records.reduce((sum, r) => sum + Math.max(r.amountDue - r.amountPaid, 0), 0);
    return { totalPaid, pending, totalDue, records };
  }

  static async upload(records: any[], actor: Actor, tenantId: string) {
    const now = new Date().toISOString();
    return Promise.all(
      records.map(async (record: any) => {
        const { studentId, classId, dueDate, amountDue } = record;
        const id = stableFeeId(classId, studentId, dueDate);
        const ref = db.collection('fees').doc(id);
        const existing = await ref.get();
        const existingFee = existing.exists ? (existing.data() as FeeRecord) : null;
        const amountPaid = Number(existingFee?.amountPaid || 0);
        if (existingFee && !isTenantFee(existingFee, tenantId))
          throw new AppError('Tenant access denied for existing fee record', 403);
        const payload: FeeRecord & Record<string, unknown> = {
          tenantId,
          schoolId: tenantId,
          studentId,
          classId,
          amountDue,
          amountPaid,
          dueDate,
          status: feeStatus(amountDue, amountPaid),
          uploadedAt: now,
          updatedAt: now,
          updatedBy: actor.uid,
        };
        await ref.set({ ...payload, createdAt: existingFee ? existingFee.createdAt : now });
        await safeNotification({
          title: 'Fee record updated',
          message: `A fee of ${CURRENCY_SYMBOL}${amountDue} is due on ${dueDate}.`,
          type: 'fee',
          href: '/fees',
          targetUserIds: [studentId],
          schoolId: tenantId,
          tenantId,
          actorId: actor.uid,
          metadata: { feeId: id, classId, dueDate, amountDue },
        });
        try {
          const usersSnapshot = await db
            .collection('users')
            .where('tenantId', '==', tenantId)
            .where('linkedStudentIds', 'array-contains', studentId)
            .get();
          const parentIds = usersSnapshot.docs.map((doc) => doc.id);
          if (parentIds.length > 0)
            await safeNotification({
              title: 'Student fee record updated',
              message: `A fee of ${CURRENCY_SYMBOL}${amountDue} is due on ${dueDate} for your linked student.`,
              type: 'fee',
              href: '/fees',
              targetUserIds: parentIds,
              schoolId: tenantId,
              tenantId,
              actorId: actor.uid,
              metadata: { feeId: id, classId, dueDate, amountDue, studentId },
            });
        } catch (error) {
          logger.warn({ err: error, studentId }, 'Failed to notify parents of fee update');
        }
        return { id, ...payload };
      })
    );
  }

  static async pay(
    feeId: string,
    amount: number,
    method: string | undefined,
    actor: Actor,
    tenantId: string
  ) {
    const feeRef = db.collection('fees').doc(feeId);
    const feeSnapshot = await feeRef.get();
    if (!feeSnapshot.exists) throw new AppError('Fee record not found', 404);
    const fee = feeSnapshot.data() as FeeRecord;
    if (!isTenantFee(fee, tenantId)) throw new AppError('Tenant access denied', 403);
    const canRecordAnyPayment =
      isSchoolAdmin(actor) || actor.permissions?.manageFees || actorHasRole(actor, 'accountant');
    if (!canRecordAnyPayment) {
      await assertCanAccessStudent(actor, fee.studentId, tenantId);
    }

    const now = new Date().toISOString();
    const currentPaid = Number(fee.amountPaid || 0);
    const amountDue = Number(fee.amountDue || 0);
    const nextPaid = Math.min(currentPaid + amount, amountDue);

    const paymentRef = await db.collection('payments').add({
      tenantId,
      schoolId: tenantId,
      feeId,
      studentId: fee.studentId,
      amount,
      method,
      paidAt: now,
      receiptUrl: `/fees/receipts/${feeId}`,
      recordedBy: actor.uid,
    });
    await feeRef.update({
      amountPaid: nextPaid,
      status: feeStatus(amountDue, nextPaid),
      updatedAt: now,
      updatedBy: actor.uid,
    });
    await safeNotification({
      title: 'Payment recorded',
      message: `${CURRENCY_SYMBOL}${amount} was recorded for your fee account.`,
      type: 'fee',
      href: '/fees',
      targetUserIds: [fee.studentId],
      schoolId: tenantId,
      tenantId,
      actorId: actor.uid,
      metadata: { feeId, paymentId: paymentRef.id, amount },
    });
    return {
      success: true,
      paymentId: paymentRef.id,
      amountPaid: nextPaid,
      status: feeStatus(amountDue, nextPaid),
    };
  }

  static async getStudentFees(uid: string, tenantId: string) {
    const feesSnapshot = await db
      .collection('fees')
      .where('tenantId', '==', tenantId)
      .where('studentId', '==', uid)
      .get();
    const paymentsSnapshot = await db
      .collection('payments')
      .where('tenantId', '==', tenantId)
      .where('studentId', '==', uid)
      .get();
    const fees = feesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const payments = paymentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return { fees, payments };
  }
}
