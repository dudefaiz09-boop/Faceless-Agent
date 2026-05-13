import { Router } from 'express';
import { db } from '../lib/firebase.js';

const router: Router = Router();

router.get('/rooms', async (req, res, next) => {
  try {
    const snapshot = await db.collection('conversations').get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

export default router;
