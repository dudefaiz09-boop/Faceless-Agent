import { Router } from 'express';
import { db } from '../lib/firebase';
import { checkPermission } from '../middleware/auth';
import { FieldValue } from 'firebase-admin/firestore';

const router = Router();

router.get('/', checkPermission('manageAttendance'), async (req, res, next) => {
  try {
    const { classId, date } = req.query;
    let query: any = db.collection('attendance');
    if (classId) query = query.where('classId', '==', classId);
    if (date) query = query.where('date', '==', date);
    const snapshot = await query.limit(100).get();
    const records = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json(records);
  } catch (error) {
    next(error);
  }
});

router.post('/mark', checkPermission('manageAttendance'), async (req, res, next) => {
  try {
    const { classId, date, records } = req.body;
    const batch = db.batch();
    const markedBy = (req as any).user.uid;
    const timestamp = FieldValue.serverTimestamp();
    for (const record of records) {
      const docId = `${classId}_${record.studentId}_${date}`;
      const docRef = db.collection('attendance').doc(docId);
      batch.set(docRef, {
        classId, studentId: record.studentId, date, status: record.status, markedBy, updatedAt: timestamp
      }, { merge: true });
    }
    await batch.commit();
    res.json({ success: true, count: records.length });
  } catch (error) {
    next(error);
  }
});

router.get('/history/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const user = (req as any).user;
    if (user.uid !== studentId && !user.isAdmin && !user.roles.includes('teacher')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const snapshot = await db.collection('attendance').where('studentId', '==', studentId).orderBy('date', 'desc').limit(100).get();
    res.json(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

router.get('/report/:classId', checkPermission('manageAttendance'), async (req, res, next) => {
  try {
    const { classId } = req.params;
    const snapshot = await db.collection('attendance').where('classId', '==', classId).get();
    const records = snapshot.docs.map((doc: any) => doc.data());
    const summary = records.reduce((acc: any, curr: any) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});
    res.json({ classId, summary, total: records.length });
  } catch (error) {
    next(error);
  }
});

export default router;
