import { createManagedUser, updateManagedUser } from '../../lib/user-management.js';

type Actor = { uid: string; email?: string; schoolId?: string | null };

function normalizeTeacherPayload<T extends Record<string, unknown>>(payload: T) {
  return {
    ...payload,
    role: 'teacher',
    subjectIds: payload.subjectIds || payload.subjects || [],
    classIds: payload.classIds || payload.classes || [],
  };
}

export class TeachersRepository {
  static async create(data: any, actor: Actor) {
    return createManagedUser(normalizeTeacherPayload(data), actor);
  }

  static async bulkImport(teachers: any[], actor: Actor) {
    const results = [];
    for (const teacher of teachers) {
      try {
        const profile = await createManagedUser(normalizeTeacherPayload(teacher), actor);
        results.push({ success: true, uid: profile.uid, email: profile.email });
      } catch (error) {
        results.push({
          success: false,
          email: teacher.email,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return results;
  }

  static async update(uid: string, data: any, actor: Actor) {
    return updateManagedUser(uid, normalizeTeacherPayload(data), actor, 'teacher_updated');
  }

  static async deactivate(uid: string, actor: Actor) {
    return updateManagedUser(
      uid,
      { role: 'teacher', status: 'inactive' },
      actor,
      'teacher_deactivated'
    );
  }
}
