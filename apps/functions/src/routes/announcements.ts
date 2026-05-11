import { Router } from 'express';
import { db } from '../lib/firebase.js';
import { checkPermission } from '../middleware/auth.js';
import { AnnouncementSchema } from '@educonnect/shared';

const router: Router = Router();

// Get all announcements
router.get('/', async (req, res, next) => {
  try {
    const snapshot = await db.collection('announcements')
      .orderBy('timestamp', 'desc')
      .get();
    
    const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(announcements);
  } catch (error) {
    next(error);
  }
});

// Create announcement (Admin/Teacher only)
router.post('/', checkPermission('manageAnnouncements'), async (req, res, next) => {
  try {
    // Validate request body using shared schema
    const validation = AnnouncementSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation Failed', 
        details: validation.error.format() 
      });
    }

    const { title, content, targetClasses, visibility } = validation.data;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const announcement = {
      title,
      content,
      targetClasses,
      visibility,
      authorId: req.user.uid,
      authorName: req.user.displayName || 'Staff',
      timestamp: new Date().toISOString()
    };

    const docRef = await db.collection('announcements').add(announcement);
    res.json({ id: docRef.id, ...announcement });
  } catch (error) {
    next(error);
  }
});

export default router;
