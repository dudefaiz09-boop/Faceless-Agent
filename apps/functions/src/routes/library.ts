import { Router } from 'express';
import { db } from '../lib/documents.js';
import { createNotification } from '../lib/notifications.js';
import { logger } from '@educonnect/logger';
import { requirePermission } from '../middleware/permissions.js';
import {
  borrowHistoryParamsSchema,
  borrowResourceSchema,
  resourceIdParamsSchema,
  returnResourceSchema,
  updateLibraryResourceSchema,
  uploadLibraryResourceSchema,
} from '../schemas/library.js';

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
  status?: 'active' | 'archived';
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

type LibraryResourceWithId = LibraryResource & {
  id: string;
};

type NotificationTargets = {
  targetRoles?: string[];
  targetClasses?: string[];
};

function hasLibraryAccess(user: NonNullable<Express.Request['user']>) {
  return user.isAdmin || user.permissions?.manageLibrary || user.roles?.includes('librarian');
}

function canSeeResource(resource: LibraryResourceWithId, user: Express.Request['user']) {
  if (!user) return false;

  if (user.isAdmin || user.roles?.includes('librarian') || user.roles?.includes('principal')) {
    return true;
  }

  if (resource.visibility === 'all') return true;

  if (resource.visibility === 'roles' && resource.targetRoles) {
    const userRole = user.role || user.roles?.[0];
    if (userRole && resource.targetRoles.includes(userRole)) return true;
  }

  if (resource.visibility === 'classes' && resource.targetClassIds) {
    const userClassIds = user.classIds || (user.classId ? [user.classId] : []);
    return resource.targetClassIds.some((classId) => userClassIds.includes(classId));
  }

  return false;
}

function isTenantResource(resource: Pick<LibraryResource, 'tenantId' | 'schoolId'>, tenantId?: string) {
  return resource.tenantId === tenantId || resource.schoolId === tenantId;
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
    const { uid } = borrowHistoryParamsSchema.parse(req.params);
    const user = req.user!;

    if (!hasLibraryAccess(user) && uid !== user.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const snapshot = await db
      .collection('borrowRecords')
      .where('tenantId', '==', req.tenantId)
      .where('studentId', '==', uid)
      .get();

    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

router.get('/resources', async (req, res, next) => {
  try {
    const snapshot = await db.collection('library').where('tenantId', '==', req.tenantId).get();

    const allResources: LibraryResourceWithId[] = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as LibraryResource) }))
      .filter((resource) => resource.status !== 'archived');

    const filteredResources = allResources.filter((resource) => canSeeResource(resource, req.user));

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

router.post('/upload', requirePermission('manageLibrary'), async (req, res, next) => {
  try {
    const user = req.user!;
    const parsedBody = uploadLibraryResourceSchema.parse(req.body);

    const now = new Date().toISOString();

    const resource: LibraryResource & Record<string, unknown> = {
      tenantId: req.tenantId,
      schoolId: req.tenantId,
      title: parsedBody.title,
      description: parsedBody.description,
      subject: parsedBody.subject,
      grade: parsedBody.grade,
      classIds: parsedBody.classIds || [],
      type: parsedBody.type,
      fileUrl: parsedBody.fileUrl || undefined,
      externalUrl: parsedBody.externalUrl || undefined,
      attachmentName: parsedBody.attachmentName || undefined,
      attachmentSize: parsedBody.attachmentSize || undefined,
      tags: parsedBody.tags || [],
      visibility: parsedBody.visibility,
      targetRoles: parsedBody.targetRoles || [],
      targetClassIds: parsedBody.targetClassIds || [],
      availableCopies: parsedBody.availableCopies,
      borrowedCount: 0,
      uploadedBy: user.uid,
      uploadedAt: now,
      updatedAt: now,
      status: 'active',
    };

    const ref = await db.collection('library').add(resource);

    const notificationTargets: NotificationTargets = {};
    if (resource.visibility === 'all') {
      notificationTargets.targetRoles = ['student', 'teacher', 'parent'];
    } else if (resource.visibility === 'roles') {
      notificationTargets.targetRoles = resource.targetRoles || [];
    } else if (resource.visibility === 'classes') {
      notificationTargets.targetClasses = resource.targetClassIds || [];
    }

    await safeLibraryNotification({
      title: `New library resource: ${resource.title}`,
      message: `${resource.subject} resource for grade ${resource.grade} is now available.`,
      type: 'system',
      href: '/library',
      ...notificationTargets,
      schoolId: req.tenantId,
      tenantId: req.tenantId,
      actorId: user.uid,
      metadata: { resourceId: ref.id, subject: resource.subject, grade: resource.grade, type: resource.type },
    });

    res.status(201).json({ id: ref.id, ...resource });
  } catch (error) {
    logger.error({ err: error, userId: req.user?.uid }, 'Failed to upload library resource');
    next(error);
  }
});

router.post('/borrow', async (req, res, next) => {
  try {
    const user = req.user!;
    const { resourceId } = borrowResourceSchema.parse(req.body);

    const resourceRef = db.collection('library').doc(resourceId);
    const resourceSnapshot = await resourceRef.get();

    if (!resourceSnapshot.exists) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resource = resourceSnapshot.data() as LibraryResource;

    if (!isTenantResource(resource, req.tenantId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
    }

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
    const user = req.user!;
    const { recordId } = returnResourceSchema.parse(req.body);

    const recordRef = db.collection('borrowRecords').doc(recordId);
    const recordSnapshot = await recordRef.get();

    if (!recordSnapshot.exists) {
      return res.status(404).json({ error: 'Borrow record not found' });
    }

    const record = recordSnapshot.data() as BorrowRecord;

    if (record.tenantId !== req.tenantId && record.schoolId !== req.tenantId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
    }

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

router.put('/resources/:id', requirePermission('manageLibrary'), async (req, res, next) => {
  try {
    const user = req.user!;
    const { id } = resourceIdParamsSchema.parse(req.params);
    const parsedBody = updateLibraryResourceSchema.parse(req.body);

    const resourceRef = db.collection('library').doc(id);
    const resourceSnapshot = await resourceRef.get();

    if (!resourceSnapshot.exists) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resource = resourceSnapshot.data() as LibraryResource;

    if (!isTenantResource(resource, req.tenantId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
    }

    const now = new Date().toISOString();

    const updatedResource = {
      ...resource,
      ...parsedBody,
      fileUrl: parsedBody.fileUrl || resource.fileUrl,
      externalUrl: parsedBody.externalUrl || resource.externalUrl,
      attachmentName: parsedBody.attachmentName || resource.attachmentName,
      attachmentSize: parsedBody.attachmentSize ?? resource.attachmentSize,
      tags: parsedBody.tags ?? resource.tags,
      visibility: parsedBody.visibility ?? resource.visibility,
      targetRoles: parsedBody.targetRoles ?? resource.targetRoles,
      targetClassIds: parsedBody.targetClassIds ?? resource.targetClassIds,
      classIds: parsedBody.classIds ?? resource.classIds,
      availableCopies: parsedBody.availableCopies ?? resource.availableCopies ?? 1,
      updatedAt: now,
      updatedBy: user.uid,
    };

    await resourceRef.set(updatedResource);

    res.json({ id, ...updatedResource });
  } catch (error) {
    logger.error({ err: error, userId: req.user?.uid }, 'Failed to update library resource');
    next(error);
  }
});

router.delete('/resources/:id', requirePermission('manageLibrary'), async (req, res, next) => {
  try {
    const user = req.user!;
    const { id } = resourceIdParamsSchema.parse(req.params);

    const resourceRef = db.collection('library').doc(id);
    const resourceSnapshot = await resourceRef.get();

    if (!resourceSnapshot.exists) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resource = resourceSnapshot.data() as LibraryResource;

    if (!isTenantResource(resource, req.tenantId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
    }

    const now = new Date().toISOString();

    await resourceRef.update({
      status: 'archived',
      deletedAt: now,
      updatedAt: now,
      updatedBy: user.uid,
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;