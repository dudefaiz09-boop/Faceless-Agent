import { db } from '../../lib/documents.js';
import { AppError } from '../../middleware/error.js';
import { createManagedUser, updateManagedUser } from '../../lib/user-management.js';

type Actor = { uid: string; email?: string; schoolId?: string | null };

export class StudentRepository {
  static async create(studentData: any, actor: Actor) {
    return createManagedUser(
      {
        ...studentData,
        role: 'student',
        classIds: studentData.classIds || (studentData.classId ? [studentData.classId] : []),
        sectionIds: studentData.sectionIds || (studentData.section ? [studentData.section] : []),
      },
      actor
    );
  }

  static async update(uid: string, data: any, actor: Actor) {
    return updateManagedUser(
      uid,
      {
        ...data,
        role: 'student',
        classIds: data.classIds || (data.classId ? [data.classId] : []),
        sectionIds: data.sectionIds || (data.section ? [data.section] : []),
      },
      actor,
      'student_updated'
    );
  }

  static async getById(uid: string) {
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) throw new AppError('Student not found', 404);
    return doc.data();
  }

  static async delete(uid: string, actor: Actor) {
    return updateManagedUser(
      uid,
      { role: 'student', status: 'inactive' },
      actor,
      'student_deactivated'
    );
  }
}
