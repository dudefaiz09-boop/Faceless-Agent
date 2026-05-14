import { db, auth } from '../../lib/documents.js';
import { AppError } from '../../middleware/error.js';

export class StudentRepository {
  static async create(studentData: any) {
    const { email, password, displayName, classId } = studentData;

    const userRecord = await auth.createUser({ email, password, displayName });

    const claims = {
      roles: ['student'],
      classId,
      permissions: { viewOwnRecords: true, submitAssignments: true },
    };

    await auth.setCustomUserClaims(userRecord.uid, claims);

    const student = {
      uid: userRecord.uid,
      email,
      displayName,
      roles: ['student'],
      classId,
      permissions: claims.permissions,
      createdAt: new Date().toISOString(),
    };

    await db.collection('users').doc(userRecord.uid).set(student);
    return student;
  }

  static async update(uid: string, data: any) {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      throw new AppError('Student not found', 404);
    }

    await userRef.update(data);
    return { uid, ...data };
  }

  static async getById(uid: string) {
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) throw new AppError('Student not found', 404);
    return doc.data();
  }

  static async delete(uid: string) {
    // 1. Delete profile document
    await db.collection('users').doc(uid).delete();

    // 2. Delete from Supabase Auth
    await auth.deleteUser(uid);

    return { success: true };
  }
}
