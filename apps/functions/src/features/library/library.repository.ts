import { db } from '../../lib/documents.js';
import { createNotification } from '../../lib/notifications.js';
import { logger } from '@educonnect/logger';
import { AppError } from '../../middleware/error.js';

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
type LibraryResourceWithId = LibraryResource & { id: string };
type Actor = { uid: string; email?: string; schoolId?: string | null };

function isTenantResource(
  resource: Pick<LibraryResource, 'tenantId' | 'schoolId'>,
  tenantId?: string
) {
  return resource.tenantId === tenantId || resource.schoolId === tenantId;
}

function hasLibraryAccess(user: any) {
  return user.isAdmin || user.permissions?.manageLibrary || user.roles?.includes('librarian');
}

function canSeeResource(resource: LibraryResourceWithId, user: any) {
  if (!user) return false;
  if (user.isAdmin || user.roles?.includes('librarian') || user.roles?.includes('principal'))
    return true;
  if (resource.visibility === 'all') return true;
  if (resource.visibility === 'roles' && resource.targetRoles) {
    const userRole = user.role || user.roles?.[0];
    if (userRole && resource.targetRoles.includes(userRole)) return true;
  }
  if (resource.visibility === 'classes' && resource.targetClassIds) {
    const userClassIds = user.classIds || (user.classId ? [user.classId] : []);
    if (resource.targetClassIds.some((classId) => userClassIds.includes(classId))) return true;
  }
  return false;
}

async function safeNotification(input: any) {
  try {
    await createNotification(input);
  } catch (error) {
    logger.warn({ err: error, title: input.title }, 'Library notification could not be created');
  }
}

export class LibraryRepository {
  static async getBorrowHistory(uid: string, tenantId: string, user: any) {
    if (!hasLibraryAccess(user) && uid !== user.uid) throw new AppError('Forbidden', 403);
    const snapshot = await db
      .collection('borrowRecords')
      .where('tenantId', '==', tenantId)
      .where('studentId', '==', uid)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  static async listResources(tenantId: string, user: any) {
    const snapshot = await db.collection('library').where('tenantId', '==', tenantId).get();
    const allResources: LibraryResourceWithId[] = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as LibraryResource) }))
      .filter((r) => r.status !== 'archived');
    return allResources.filter((r) => canSeeResource(r, user));
  }

  static async listBooks(tenantId: string) {
    const snapshot = await db.collection('library').where('tenantId', '==', tenantId).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  static async upload(data: any, actor: Actor, tenantId: string) {
    const now = new Date().toISOString();
    const resource: LibraryResource & Record<string, unknown> = {
      tenantId,
      schoolId: tenantId,
      title: data.title,
      description: data.description,
      subject: data.subject,
      grade: data.grade,
      classIds: data.classIds || [],
      type: data.type,
      fileUrl: data.fileUrl || undefined,
      externalUrl: data.externalUrl || undefined,
      attachmentName: data.attachmentName || undefined,
      attachmentSize: data.attachmentSize || undefined,
      tags: data.tags || [],
      visibility: data.visibility,
      targetRoles: data.targetRoles || [],
      targetClassIds: data.targetClassIds || [],
      availableCopies: data.availableCopies,
      borrowedCount: 0,
      uploadedBy: actor.uid,
      uploadedAt: now,
      updatedAt: now,
      status: 'active',
    };
    const ref = await db.collection('library').add(resource);
    const nt: any = {};
    if (resource.visibility === 'all') nt.targetRoles = ['student', 'teacher', 'parent'];
    else if (resource.visibility === 'roles') nt.targetRoles = resource.targetRoles || [];
    else if (resource.visibility === 'classes') nt.targetClasses = resource.targetClassIds || [];
    await safeNotification({
      title: `New library resource: ${resource.title}`,
      message: `${resource.subject} resource for grade ${resource.grade} is now available.`,
      type: 'system',
      href: '/library',
      ...nt,
      schoolId: tenantId,
      tenantId,
      actorId: actor.uid,
      metadata: {
        resourceId: ref.id,
        subject: resource.subject,
        grade: resource.grade,
        type: resource.type,
      },
    });
    return { id: ref.id, ...resource };
  }

  static async borrow(resourceId: string, actor: Actor, tenantId: string) {
    const resourceRef = db.collection('library').doc(resourceId);
    const resourceSnapshot = await resourceRef.get();
    if (!resourceSnapshot.exists) throw new AppError('Resource not found', 404);
    const resource = resourceSnapshot.data() as LibraryResource;
    if (!isTenantResource(resource, tenantId)) throw new AppError('Tenant access denied', 403);

    const activeBorrows = await db
      .collection('borrowRecords')
      .where('tenantId', '==', tenantId)
      .where('studentId', '==', actor.uid)
      .where('resourceId', '==', resourceId)
      .where('status', '==', 'borrowed')
      .get();
    if (activeBorrows.docs.length > 0)
      throw new AppError('Resource is already borrowed by this user', 409);

    const now = new Date().toISOString();
    const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const borrowRecord: BorrowRecord & Record<string, unknown> = {
      tenantId,
      schoolId: tenantId,
      resourceId,
      studentId: actor.uid,
      studentName: actor.email || 'Student',
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
    await safeNotification({
      title: 'Library resource borrowed',
      message: `${resource.title || 'A resource'} was added to your library history.`,
      type: 'system',
      href: '/library',
      targetUserIds: [actor.uid],
      schoolId: tenantId,
      tenantId,
      actorId: actor.uid,
      metadata: { resourceId, borrowRecordId: recordRef.id },
    });
    return { id: recordRef.id, ...borrowRecord };
  }

  static async return(recordId: string, actor: Actor, tenantId: string) {
    const recordRef = db.collection('borrowRecords').doc(recordId);
    const recordSnapshot = await recordRef.get();
    if (!recordSnapshot.exists) throw new AppError('Borrow record not found', 404);
    const record = recordSnapshot.data() as BorrowRecord;
    if (record.tenantId !== tenantId && record.schoolId !== tenantId)
      throw new AppError('Tenant access denied', 403);
    if (!hasLibraryAccess(actor) && record.studentId !== actor.uid)
      throw new AppError('Forbidden', 403);
    if (record.status === 'returned') return { success: true, id: recordId, status: 'returned' };

    const now = new Date().toISOString();
    await recordRef.update({
      status: 'returned',
      returnedAt: now,
      updatedAt: now,
      updatedBy: actor.uid,
    });
    const resourceRef = db.collection('library').doc(record.resourceId);
    const resourceSnapshot = await resourceRef.get();
    const resource = resourceSnapshot.exists ? (resourceSnapshot.data() as LibraryResource) : null;
    if (resource)
      await resourceRef.update({
        borrowedCount: Math.max(Number(resource.borrowedCount || 1) - 1, 0),
        updatedAt: now,
      });
    await safeNotification({
      title: 'Library resource returned',
      message: `${resource?.title || 'Your borrowed resource'} was marked as returned.`,
      type: 'system',
      href: '/library',
      targetUserIds: [record.studentId],
      schoolId: tenantId,
      tenantId,
      actorId: actor.uid,
      metadata: { resourceId: record.resourceId, borrowRecordId: recordId },
    });
    return { success: true, id: recordId, status: 'returned' };
  }

  static async updateResource(id: string, data: any, actor: Actor, tenantId: string) {
    const resourceRef = db.collection('library').doc(id);
    const snapshot = await resourceRef.get();
    if (!snapshot.exists) throw new AppError('Resource not found', 404);
    const resource = snapshot.data() as LibraryResource;
    if (!isTenantResource(resource, tenantId)) throw new AppError('Tenant access denied', 403);
    const now = new Date().toISOString();
    const updated = {
      ...resource,
      ...data,
      fileUrl: data.fileUrl || resource.fileUrl,
      externalUrl: data.externalUrl || resource.externalUrl,
      attachmentName: data.attachmentName || resource.attachmentName,
      attachmentSize: data.attachmentSize ?? resource.attachmentSize,
      tags: data.tags ?? resource.tags,
      visibility: data.visibility ?? resource.visibility,
      targetRoles: data.targetRoles ?? resource.targetRoles,
      targetClassIds: data.targetClassIds ?? resource.targetClassIds,
      classIds: data.classIds ?? resource.classIds,
      availableCopies: data.availableCopies ?? resource.availableCopies ?? 1,
      updatedAt: now,
      updatedBy: actor.uid,
    };
    await resourceRef.set(updated);
    return { id, ...updated };
  }

  static async archiveResource(id: string, actor: Actor, tenantId: string) {
    const resourceRef = db.collection('library').doc(id);
    const snapshot = await resourceRef.get();
    if (!snapshot.exists) throw new AppError('Resource not found', 404);
    const resource = snapshot.data() as LibraryResource;
    if (!isTenantResource(resource, tenantId)) throw new AppError('Tenant access denied', 403);
    const now = new Date().toISOString();
    await resourceRef.update({
      status: 'archived',
      deletedAt: now,
      updatedAt: now,
      updatedBy: actor.uid,
    });
  }
}
