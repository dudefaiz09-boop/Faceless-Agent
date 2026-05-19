import { Router } from 'express';
import { db } from '../lib/documents.js';
import { checkPermission } from '../middleware/auth.js';
import { createNotification } from '../lib/notifications.js';
import { logger } from '@educonnect/logger';

const router: Router = Router();

type LibraryResource = {
  title: string;
  description?: string;
  subject: string;
  grade: string;
  classIds?: string[];
  type: 'pdf' | 'ebook' | 'web_link' | 'video' | 'document';
  fileUrl?: string;
  externalUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  tags?: string[];
  tenantId?: string;
  schoolId?: string | null;
  visibility: 'all' | 'roles' | 'classes';
  targetRoles?: string[];
  targetClassIds?: string[];
  availableCopies?: number;
  borrowedCount?: number;
};

type BorrowRecord = {
  resourceId: string;
  studentId: string;
  studentName: string;
  borrowedAt: string;
  dueAt?: string;
  status: 'borrowed' | 'returned';
  returnedAt?: string | null;
  tenantId?: string;
  schoolId?: string | null;
};

function hasLibraryAccess(user: NonNullable<Express.Request['user']>) {
  return user.isAdmin || user.permissions.manageLibrary || user.roles.includes('librarian');
}

function requireUser(req: Express.Request, res: Express.Response) {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return req.user;
}

async function safeLibraryNotification(input: Parameters<typeof createNotification>[0]) {
  try {
    await createNotification(input);
  } catch (error) {
    logger.warn({ err: error, title: input.title }, 'Library notification could not be created');
  }
}

router.get('/borrow/history/:uid', async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    if (!hasLibraryAccess(user) && req.params.uid !== user.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const snapshot = await db
      .collection('borrowRecords')
      .where('tenantId', '==', req.tenantId)
      .where('studentId', '==', req.params.uid)
      .get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

router.get('/resources', async (req, res, next) => {
  try {
    const user = req.user;
    const snapshot = await db.collection('library').where('tenantId', '==', req.tenantId).get();

    // Filter resources based on visibility and user role/class
    const allResources = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((resource: any) => resource.status !== 'archived');
    const filteredResources = allResources.filter((resource: any) => {
      // Admin/librarian/principal see all
      if (user?.isAdmin || user?.roles.includes('librarian') || user?.roles.includes('principal')) {
        return true;
      }

      // Check visibility rules
      if (resource.visibility === 'all') return true;

      if (resource.visibility === 'roles' && resource.targetRoles) {
        const userRole = user?.role || user?.roles?.[0];
        if (resource.targetRoles.includes(userRole)) return true;
      }

      if (resource.visibility === 'classes' && resource.targetClassIds) {
        const userClassIds = user?.classIds || (user?.classId ? [user.classId] : []);
        const hasMatchingClass = resource.targetClassIds.some((classId: string) =>
          userClassIds.includes(classId)
        );
        if (hasMatchingClass) return true;
      }

      return false;
    });

    res.json(filteredResources);
  } catch (error) {
    next(error);
  }
});

router.get('/books', async (req, res, next) => {
  try {
    const snapshot = await db.collection('library').where('tenantId', '==', req.tenantId).get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

router.post('/upload', checkPermission('manageLibrary'), async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const subject = String(req.body.subject || '').trim();
    const grade = String(req.body.grade || '').trim();
    const type = req.body.type || 'document';
    const fileUrl = String(req.body.fileUrl || '').trim();
    const externalUrl = String(req.body.externalUrl || '').trim();
    const attachmentName = String(req.body.attachmentName || '').trim();
    const attachmentSize = Number(req.body.attachmentSize || 0);
    const tags = Array.isArray(req.body.tags) ? req.body.tags.map(String).filter(Boolean) : [];
    const visibility = req.body.visibility || 'all';
    const targetRoles = Array.isArray(req.body.targetRoles) ? req.body.targetRoles : [];
    const targetClassIds = Array.isArray(req.body.targetClassIds) ? req.body.targetClassIds : [];
    const classIds = Array.isArray(req.body.classIds) ? req.body.classIds : [];

    if (!title || !subject || !grade) {
      return res.status(400).json({ error: 'title, subject, and grade are required' });
    }

    // Validate that either fileUrl or externalUrl is provided
    if (!fileUrl && !externalUrl) {
      return res.status(400).json({ error: 'Either fileUrl or externalUrl is required' });
    }

    const now = new Date().toISOString();
    const resource: LibraryResource & Record<string, unknown> = {
      tenantId: req.tenantId,
      schoolId: req.tenantId,
      title,
      description,
      subject,
      grade,
      classIds,
      type,
      fileUrl: fileUrl || undefined,
      externalUrl: externalUrl || undefined,
      attachmentName: attachmentName || undefined,
      attachmentSize: attachmentSize || undefined,
      tags,
      visibility,
      targetRoles,
      targetClassIds,
      availableCopies: Number(req.body.availableCopies || 1),
      borrowedCount: 0,
      uploadedBy: user.uid,
      uploadedAt: now,
      updatedAt: now,
    };

    const ref = await db.collection('library').add(resource);

    // Determine notification targets based on visibility
    let notificationTargets: any = {};
    if (visibility === 'all') {
      notificationTargets.targetRoles = ['student', 'teacher', 'parent'];
    } else if (visibility === 'roles') {
      notificationTargets.targetRoles = targetRoles;
    } else if (visibility === 'classes') {
      notificationTargets.targetClasses = targetClassIds;
    }

    await safeLibraryNotification({
      title: `New library resource: ${title}`,
      message: `${subject} resource for grade ${grade} is now available.`,
      type: 'system',
      href: '/library',
      ...notificationTargets,
      schoolId: req.tenantId,
      tenantId: req.tenantId,
      actorId: user.uid,
      metadata: { resourceId: ref.id, subject, grade, type },
    });

    res.status(201).json({ id: ref.id, ...resource });
  } catch (error) {
    logger.error({ err: error, userId: req.user?.uid }, 'Failed to upload library resource');
    next(error);
  }
});

router.post('/borrow', async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const resourceId = String(req.body.resourceId || '').trim();
    if (!resourceId) return res.status(400).json({ error: 'resourceId is required' });

    const resourceRef = db.collection('library').doc(resourceId);
    const resourceSnapshot = await resourceRef.get();
    if (!resourceSnapshot.exists) return res.status(404).json({ error: 'Resource not found' });

    const resource = resourceSnapshot.data() as LibraryResource;
    const activeBorrows = await db
      .collection('borrowRecords')
      .where('tenantId', '==', req.tenantId)
      .where('studentId', '==', user.uid)
      .where('resourceId', '==', resourceId)
      .where('status', '==', 'borrowed')
      .get();

    if (activeBorrows.docs.length > 0) {
      return res.status(409).json({ error: 'Resource is already borrowed by this user' });
    }

    const now = new Date().toISOString();
    const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const borrowRecord: BorrowRecord & Record<string, unknown> = {
      tenantId: req.tenantId,
      schoolId: req.tenantId,
      resourceId,
      studentId: user.uid,
      studentName: user.displayName || user.email || 'Student',
      borrowedAt: now,
      dueAt,
      status: 'borrowed',
      returnedAt: null,
    };

    const recordRef = await db.collection('borrowRecords').add(borrowRecord);
    await resourceRef.update({
      borrowedCount: Number(resource.borrowedCount || 0) + 1,
      updatedAt: now,
    });

    await safeLibraryNotification({
      title: 'Library resource borrowed',
      message: `${resource.title || 'A resource'} was added to your library history.`,
      type: 'system',
      href: '/library',
      targetUserIds: [user.uid],
      schoolId: req.tenantId,
      tenantId: req.tenantId,
      actorId: user.uid,
      metadata: { resourceId, borrowRecordId: recordRef.id },
    });

    res.status(201).json({ id: recordRef.id, ...borrowRecord });
  } catch (error) {
    next(error);
  }
});

router.post('/return', async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const recordId = String(req.body.recordId || '').trim();
    if (!recordId) return res.status(400).json({ error: 'recordId is required' });

    const recordRef = db.collection('borrowRecords').doc(recordId);
    const recordSnapshot = await recordRef.get();
    if (!recordSnapshot.exists) return res.status(404).json({ error: 'Borrow record not found' });

    const record = recordSnapshot.data() as BorrowRecord;
    if (!hasLibraryAccess(user) && record.studentId !== user.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (record.status === 'returned') {
      return res.json({ success: true, id: recordId, status: 'returned' });
    }

    const now = new Date().toISOString();
    await recordRef.update({
      status: 'returned',
      returnedAt: now,
      updatedAt: now,
      updatedBy: user.uid,
    });

    const resourceRef = db.collection('library').doc(record.resourceId);
    const resourceSnapshot = await resourceRef.get();
    const resource = resourceSnapshot.exists ? (resourceSnapshot.data() as LibraryResource) : null;
    if (resource) {
      await resourceRef.update({
        borrowedCount: Math.max(Number(resource.borrowedCount || 1) - 1, 0),
        updatedAt: now,
      });
    }

    await safeLibraryNotification({
      title: 'Library resource returned',
      message: `${resource?.title || 'Your borrowed resource'} was marked as returned.`,
      type: 'system',
      href: '/library',
      targetUserIds: [record.studentId],
      schoolId: req.tenantId,
      tenantId: req.tenantId,
      actorId: user.uid,
      metadata: { resourceId: record.resourceId, borrowRecordId: recordId },
    });

    res.json({ success: true, id: recordId, status: 'returned' });
  } catch (error) {
    next(error);
  }
});

router.delete('/resources/:id', checkPermission('manageLibrary'), async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const resourceRef = db.collection('library').doc(req.params.id);
    const resourceSnapshot = await resourceRef.get();
    if (!resourceSnapshot.exists) return res.status(404).json({ error: 'Resource not found' });

    const resource = resourceSnapshot.data() as LibraryResource;
    if (resource.tenantId !== req.tenantId && resource.schoolId !== req.tenantId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
    }

    await resourceRef.update({
      status: 'archived',
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
