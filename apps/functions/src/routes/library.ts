import { Router } from 'express';
import { db } from '../lib/firebase.js';

const router: Router = Router();

router.get('/borrow/history/:uid', async (req, res, next) => {
  try {
    const snapshot = await db.collection('borrowRecords')
      .where('tenantId', '==', req.tenantId)
      .where('studentId', '==', req.params.uid)
      .get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

router.get('/books', async (req, res, next) => {
  try {
    const snapshot = await db.collection('library')
      .where('tenantId', '==', req.tenantId)
      .get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

export default router;
