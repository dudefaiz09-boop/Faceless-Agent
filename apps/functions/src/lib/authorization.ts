import { AppError } from '../middleware/error.js';
import { db } from './documents.js';

export type ActorContext = {
  uid: string;
  email?: string | null;
  role?: string;
  roles?: string[];
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  schoolId?: string | null;
  classId?: string | null;
  classIds?: string[];
  linkedStudentIds?: string[];
  permissions?: Record<string, boolean>;
};

type Actor = ActorContext;

type UserDocument = {
  uid?: string;
  role?: string;
  roles?: string[];
  tenantId?: string;
  schoolId?: string | null;
  classId?: string | null;
  classIds?: string[];
  linkedStudentIds?: string[];
  status?: string;
};

function forbidden(message: string, details: Record<string, unknown> = {}) {
  return new AppError({
    code: 'SCOPE_DENIED',
    message,
    statusCode: 403,
    details,
  });
}

export function actorHasRole(actor: Actor, role: string) {
  return actor.role === role || actor.roles?.includes(role);
}

export function isSchoolAdmin(actor: Actor) {
  return (
    !!actor.isAdmin ||
    !!actor.isSuperAdmin ||
    actorHasRole(actor, 'admin') ||
    actorHasRole(actor, 'super_admin')
  );
}

export function isLeadership(actor: Actor) {
  return (
    isSchoolAdmin(actor) || actorHasRole(actor, 'principal') || actorHasRole(actor, 'president')
  );
}

export function getActorClassIds(actor: Actor) {
  return Array.from(new Set(actor.classIds || (actor.classId ? [actor.classId] : []))).filter(
    Boolean
  );
}

export async function getUserDocument(uid: string, tenantId: string) {
  const snapshot = await db.collection('users').doc(uid).get();
  if (!snapshot.exists) throw new AppError('User not found', 404);
  const data = (snapshot.data() || {}) as UserDocument;
  if (data.tenantId !== tenantId && data.schoolId !== tenantId) {
    throw forbidden('User is outside the active tenant.', { uid, tenantId });
  }
  return { id: uid, ...data };
}

export async function getStudentClassIds(studentId: string, tenantId: string) {
  const profile = await getUserDocument(studentId, tenantId);
  const isStudent = profile.role === 'student' || profile.roles?.includes('student');
  if (!isStudent) throw forbidden('Requested user is not a student.', { studentId });
  return Array.from(new Set(profile.classIds || (profile.classId ? [profile.classId] : []))).filter(
    Boolean
  );
}

export async function getLinkedChildClassIds(actor: Actor, tenantId: string) {
  const childClassIds = await Promise.all(
    (actor.linkedStudentIds || []).map((studentId) => getStudentClassIds(studentId, tenantId))
  );
  return Array.from(new Set(childClassIds.flat())).filter(Boolean);
}

export async function getVisibleClassIdsForActor(actor: Actor, tenantId: string) {
  if (isLeadership(actor)) {
    const snapshot = await db.collection('classes').where('tenantId', '==', tenantId).get();
    const classIds = snapshot.docs.map((doc) => doc.id);
    return classIds.length ? classIds : getActorClassIds(actor);
  }

  if (actorHasRole(actor, 'teacher') || actorHasRole(actor, 'staff')) {
    return getActorClassIds(actor);
  }

  if (actorHasRole(actor, 'student')) {
    return getActorClassIds(actor);
  }

  if (actorHasRole(actor, 'parent')) {
    return getLinkedChildClassIds(actor, tenantId);
  }

  return [];
}

export async function assertCanAccessStudent(actor: Actor, studentId: string, tenantId: string) {
  if (isLeadership(actor)) return;

  if (actor.uid === studentId && actorHasRole(actor, 'student')) return;

  if (actorHasRole(actor, 'parent') && actor.linkedStudentIds?.includes(studentId)) return;

  const studentClassIds = await getStudentClassIds(studentId, tenantId);
  const actorClassIds = getActorClassIds(actor);
  if (
    (actorHasRole(actor, 'teacher') || actorHasRole(actor, 'staff')) &&
    studentClassIds.some((classId) => actorClassIds.includes(classId))
  ) {
    return;
  }

  throw forbidden('You cannot access this student record.', { studentId });
}

export async function assertCanAccessClass(actor: Actor, classId: string, tenantId: string) {
  if (!classId) throw new AppError('classId is required', 400);
  if (isLeadership(actor)) return;

  const visibleClassIds = await getVisibleClassIdsForActor(actor, tenantId);
  if (visibleClassIds.includes(classId)) return;

  throw forbidden('You cannot access this class.', { classId });
}

export async function assertCanManageClass(actor: Actor, classId: string, tenantId: string) {
  if (isLeadership(actor)) return;
  if (actorHasRole(actor, 'teacher') || actorHasRole(actor, 'staff')) {
    await assertCanAccessClass(actor, classId, tenantId);
    return;
  }
  throw forbidden('You cannot manage this class.', { classId });
}

export async function assertStudentsBelongToClass(
  studentIds: string[],
  classId: string,
  tenantId: string
) {
  await Promise.all(
    studentIds.map(async (studentId) => {
      const classIds = await getStudentClassIds(studentId, tenantId);
      if (!classIds.includes(classId)) {
        throw forbidden('Student is outside the requested class.', { studentId, classId });
      }
    })
  );
}
