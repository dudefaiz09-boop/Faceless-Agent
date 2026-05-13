import { Router } from 'express';
import { db } from '../lib/firebase.js';
import { checkPermission } from '../middleware/auth.js';

const router: Router = Router();

router.get('/:studentId', checkPermission('viewPerformance'), async (req, res, next) => {
  try {
    const snapshot = await db
      .collection('performance')
      .where('studentId', '==', req.params.studentId)
      .get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

export default router;
