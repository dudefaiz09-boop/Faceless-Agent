import { Router } from 'express';
import { db } from '../lib/documents.js';
import { checkPermission } from '../middleware/auth.js';
import { AttendanceAnalytics } from '@educonnect/shared-analytics';

const router: Router = Router();

router.get('/report/:classId', checkPermission('viewAttendance'), async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    let query: any = db.collection('attendance')
      .where('tenantId', '==', req.tenantId)
      .where('classId', '==', classId);

    if (startDate) query = query.where('date', '>=', startDate);
    if (endDate) query = query.where('date', '<=', endDate);

    const snapshot = await query.get();
    
    const stats = snapshot.docs.map((doc: any) => {
      const data = doc.data() || {};
      // Flatten the record structure for the calculator
      const records = data.records || [];
      return AttendanceAnalytics.calculateStats(records, req.tenantId!, data.date);
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get('/history/:uid', async (req, res, next) => {
  try {
    const { uid } = req.params;
    // Get student's classId
    const userDoc = await db.collection('users').doc(uid).get();
    const classId = userDoc.exists ? userDoc.data()?.classId : null;
    
    if (!classId) return res.json([]);

    const snapshot = await db.collection('attendance')
      .where('tenantId', '==', req.tenantId)
      .where('classId', '==', classId)
      .get();
    const history = snapshot.docs.map((doc: any) => {
      const data = doc.data() || {};
      const record = data.records?.find((r: any) => r.studentId === uid);
      return record ? { id: doc.id, date: data.date, status: record.status } : null;
    }).filter(Boolean);

    res.json(history);
  } catch (error) {
    next(error);
  }
});

router.get('/:classId?', checkPermission('viewAttendance'), async (req, res, next) => {
  try {
    const classId = req.params.classId || (req.query.classId as string);
    const date = req.query.date as string;

    if (!classId) {
      return res.status(400).json({ error: 'classId is required' });
    }

    let query: any = db.collection('attendance')
      .where('tenantId', '==', req.tenantId)
      .where('classId', '==', classId);

    if (date) {
      query = query.where('date', '==', date);
    }

    const snapshot = await query.get();
    res.json(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

router.post('/mark', checkPermission('markAttendance'), async (req, res, next) => {
  try {
    const { classId, date, records } = req.body;
    const docId = `${classId}_${date}`;
    await db.collection('attendance').doc(docId).set({
      tenantId: req.tenantId,
      classId,
      date,
      records,
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
