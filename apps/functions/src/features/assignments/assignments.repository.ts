import { db } from '../../lib/documents.js';
import { logger } from '@educonnect/logger';
import { generateSafeContent, isAiEnabled } from '../../lib/ai.js';
import { AssignmentAnalytics } from '@educonnect/shared-analytics';
import type { Assignment, AssignmentSubmission } from '@educonnect/shared-education';
import { createNotification, type NotificationInput } from '../../lib/notifications.js';
import { AppError } from '../../middleware/error.js';
import { assertCanAccessClass, assertCanManageClass } from '../../lib/authorization.js';

type AssignmentRecord = {
  id: string;
  tenantId?: string;
  schoolId?: string | null;
  title?: string;
  description?: string;
  subject?: string;
  subjectId?: string;
  status?: string;
  dueDate?: string | null;
  classId?: string | null;
  targetClasses?: string[];
  attachments?: unknown[];
  rubric?: unknown;
  visibility?: string;
  createdBy?: string;
};
type SubmissionRecord = {
  assignmentId?: string;
  studentId?: string;
  status?: string;
  grade?: string | number | null;
  feedback?: string | null;
  tenantId?: string;
  schoolId?: string | null;
  [key: string]: unknown;
};
type Actor = { uid: string; email?: string; schoolId?: string | null };

function toAnalyticsAssignment(
  assignment: AssignmentRecord,
  tenantId: string
): Assignment & { id: string } {
  return {
    id: assignment.id,
    schoolId: assignment.schoolId || assignment.tenantId || tenantId,
    title: assignment.title || 'Untitled Assignment',
    description: assignment.description || '',
    dueDate: assignment.dueDate || new Date(0).toISOString(),
    classId: assignment.classId || undefined,
    targetClasses: Array.isArray(assignment.targetClasses) ? assignment.targetClasses : [],
    status:
      assignment.status === 'draft' ||
      assignment.status === 'scheduled' ||
      assignment.status === 'archived'
        ? assignment.status
        : 'published',
    attachments: [],
    teacherId: assignment.createdBy || '',
    pointsPossible: 100,
    allowResubmissions: true,
    isArchived: assignment.status === 'archived',
  };
}

function toAnalyticsSubmission(
  submission: SubmissionRecord,
  tenantId: string
): AssignmentSubmission {
  return {
    id: `${submission.assignmentId || 'assignment'}_${submission.studentId || 'student'}`,
    schoolId: submission.schoolId || submission.tenantId || tenantId,
    assignmentId: submission.assignmentId || '',
    studentId: submission.studentId || '',
    studentName: '',
    status:
      submission.status === 'graded' || submission.status === 'returned'
        ? submission.status
        : 'submitted',
    content: '',
    attachments: [],
    submittedAt: typeof submission.submittedAt === 'string' ? submission.submittedAt : undefined,
    grade: submission.grade == null ? null : String(submission.grade),
    feedback: submission.feedback,
    teacherComments: [],
    checkedByAI: false,
    recheckedByTeacher: false,
    isArchived: false,
  };
}

function isTenantAssignment(
  assignment: Pick<AssignmentRecord, 'tenantId' | 'schoolId'>,
  tenantId?: string
) {
  return assignment.tenantId === tenantId || assignment.schoolId === tenantId;
}

function isTenantSubmission(
  submission: Pick<SubmissionRecord, 'tenantId' | 'schoolId'>,
  tenantId?: string
) {
  return submission.tenantId === tenantId || submission.schoolId === tenantId;
}

async function emitNotification(input: NotificationInput) {
  try {
    await createNotification(input);
  } catch (error) {
    logger.warn({ err: error, title: input.title }, 'Assignment notification could not be created');
  }
}

export class AssignmentsRepository {
  static async getClassReport(classId: string, tenantId: string) {
    const assignmentsSnap = await db
      .collection('assignments')
      .where('tenantId', '==', tenantId)
      .where('targetClasses', 'array-contains', classId)
      .get();
    const assignments: AssignmentRecord[] = assignmentsSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<AssignmentRecord, 'id'>),
    }));
    return Promise.all(
      assignments.map(async (assignment) => {
        const submissionsSnap = await db
          .collection('submissions')
          .where('tenantId', '==', tenantId)
          .where('assignmentId', '==', assignment.id)
          .get();
        const submissions = submissionsSnap.docs.map((doc) => doc.data() as SubmissionRecord);
        return AssignmentAnalytics.calculateStats(
          toAnalyticsAssignment(assignment, tenantId),
          submissions.map((submission) => toAnalyticsSubmission(submission, tenantId))
        );
      })
    );
  }

  static async getHistory(uid: string, tenantId: string) {
    const snapshot = await db
      .collection('submissions')
      .where('tenantId', '==', tenantId)
      .where('studentId', '==', uid)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  static async getSubmissions(
    assignmentId: string,
    tenantId: string,
    actor?: NonNullable<Express.Request['user']>
  ) {
    const assignmentDoc = await db.collection('assignments').doc(assignmentId).get();
    const assignment = assignmentDoc.exists ? (assignmentDoc.data() as AssignmentRecord) : null;
    if (!assignment) throw new AppError('Assignment not found', 404);
    if (!isTenantAssignment(assignment, tenantId)) throw new AppError('Tenant access denied', 403);

    if (actor) {
      const classes = assignment.targetClasses?.length
        ? assignment.targetClasses
        : [assignment.classId].filter(Boolean);
      await Promise.all(classes.map((classId) => assertCanAccessClass(actor, classId!, tenantId)));
    }

    const snapshot = await db
      .collection('submissions')
      .where('tenantId', '==', tenantId)
      .where('assignmentId', '==', assignmentId)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  static async list(classId: string | undefined, tenantId: string, visibleClassIds?: string[]) {
    let query = db.collection('assignments').where('tenantId', '==', tenantId);
    if (classId) query = query.where('targetClasses', 'array-contains', classId);
    const snapshot = await query.get();
    return snapshot.docs
      .map((doc) => {
        const data = doc.data() as AssignmentRecord;
        return {
          ...data,
          id: doc.id,
          title: data.title || 'Untitled Assignment',
          dueDate: data.dueDate || null,
          classId: data.classId || null,
          targetClasses: Array.isArray(data.targetClasses) ? data.targetClasses : [],
          attachments: Array.isArray(data.attachments) ? data.attachments : [],
        };
      })
      .filter((assignment) => {
        if (!visibleClassIds) return true;
        const classes = assignment.targetClasses?.length
          ? assignment.targetClasses
          : [assignment.classId].filter(Boolean);
        return classes.some((targetClass) => visibleClassIds.includes(targetClass!));
      });
  }

  static async create(data: any, actor: Actor, tenantId: string) {
    const targetClasses = data.targetClasses?.length
      ? data.targetClasses
      : ([data.classId].filter(Boolean) as string[]);
    const classId = data.classId || targetClasses[0];
    const dueDate = data.dueDate || data.due_at;
    if (!classId || !dueDate) throw new AppError('classId and dueDate are required', 400);

    const assignment = {
      tenantId,
      schoolId: tenantId,
      title: data.title,
      description: data.description || '',
      subject: data.subject || data.subjectId || 'General',
      subjectId: data.subjectId || data.subject || 'General',
      status: data.status,
      dueDate,
      classId,
      targetClasses: targetClasses.length ? targetClasses : [classId],
      attachments: data.attachments,
      rubric: data.rubric || null,
      visibility: data.visibility,
      createdBy: actor.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const docRef = await db.collection('assignments').add(assignment);
    await emitNotification({
      title: `New assignment: ${assignment.title}`,
      message: `Due ${assignment.dueDate}${assignment.description ? ` - ${assignment.description.slice(0, 140)}` : ''}`,
      type: 'assignment',
      href: '/assignments',
      targetRoles: ['student', 'parent'],
      targetClasses,
      schoolId: tenantId,
      tenantId,
      actorId: actor.uid,
      metadata: { assignmentId: docRef.id, classId, dueDate: assignment.dueDate },
    });
    return { id: docRef.id, ...assignment };
  }

  static async archive(id: string, tenantId: string, actor: NonNullable<Express.Request['user']>) {
    const assignmentRef = db.collection('assignments').doc(id);
    const snapshot = await assignmentRef.get();
    if (!snapshot.exists) throw new AppError('Assignment not found', 404);
    const assignment = snapshot.data() as AssignmentRecord;
    if (!isTenantAssignment(assignment, tenantId)) throw new AppError('Tenant access denied', 403);
    const classes = assignment.targetClasses?.length
      ? assignment.targetClasses
      : [assignment.classId].filter(Boolean);
    await Promise.all(classes.map((classId) => assertCanManageClass(actor, classId!, tenantId)));
    const now = new Date().toISOString();
    await assignmentRef.update({
      status: 'archived',
      deletedAt: now,
      updatedAt: now,
      updatedBy: actor.uid,
    });
  }

  static async submit(
    assignmentId: string | undefined,
    bodyData: { content?: string; fileUrl?: string; assignmentId?: string },
    actor: Actor,
    tenantId: string
  ) {
    const id = assignmentId || bodyData.assignmentId;
    if (!id) throw new AppError('assignmentId is required', 400);

    const assignmentDoc = await db.collection('assignments').doc(id).get();
    const assignment = assignmentDoc.exists ? (assignmentDoc.data() as AssignmentRecord) : null;
    if (!assignment) throw new AppError('Assignment not found', 404);
    if (!isTenantAssignment(assignment, tenantId)) throw new AppError('Tenant access denied', 403);

    const docId = `${id}_${actor.uid}`;
    const submissionRef = db.collection('submissions').doc(docId);
    const submissionData = {
      tenantId,
      schoolId: tenantId,
      assignmentId: id,
      studentId: actor.uid,
      studentName: actor.email || 'Student',
      content: bodyData.content || '',
      fileUrl: bodyData.fileUrl || null,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      checkedByAI: false,
      recheckedByTeacher: false,
    };
    await submissionRef.set(submissionData);

    if (assignment.createdBy && assignment.createdBy !== actor.uid) {
      await emitNotification({
        title: `${submissionData.studentName} submitted work`,
        message: `${assignment.title || 'Assignment'} is ready for review.`,
        type: 'assignment',
        href: '/assignments',
        targetUserIds: [assignment.createdBy],
        schoolId: tenantId,
        tenantId,
        actorId: actor.uid,
        metadata: { assignmentId: id, submissionId: docId, studentId: actor.uid },
      });
    }

    if (!isAiEnabled()) {
      logger.info(
        { assignmentId: id },
        'Skipping AI grading because AI provider is not configured'
      );
      return { success: true, id: docId };
    }

    try {
      const rubricText = assignment.rubric ? `Use this rubric: ${assignment.rubric}.` : '';
      const prompt = `Grade this student submission for the assignment "${assignment.title || 'Unknown'}".
Submission Content: ${bodyData.content || 'No text provided.'}
${bodyData.fileUrl ? `Attached File URL: ${bodyData.fileUrl}` : ''}
${rubricText}
Respond strictly in JSON format: { "score": number, "feedback": "string" }`;
      const responseText = await generateSafeContent(
        'You are a strict assignment grading assistant. Return only valid JSON.',
        prompt,
        { temperature: 0.1, maxOutputTokens: 500 }
      );
      const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
      const aiResult = JSON.parse(cleanedResponse || '{}') as { score?: number; feedback?: string };
      await submissionRef.update({
        aiScore: aiResult.score || null,
        aiFeedback: aiResult.feedback || null,
        grade: aiResult.score?.toString() || null,
        feedback: aiResult.feedback || null,
        status: 'graded',
        checkedByAI: true,
      });
      await emitNotification({
        title: `AI feedback is ready: ${assignment.title || 'Assignment'}`,
        message: aiResult.feedback || 'Your submission has been reviewed.',
        type: 'assignment',
        href: '/assignments',
        targetUserIds: [actor.uid],
        schoolId: tenantId,
        tenantId,
        actorId: actor.uid,
        metadata: { assignmentId: id, submissionId: docId, aiScore: aiResult.score || null },
      });
    } catch (aiError) {
      logger.error({ err: aiError, uid: actor.uid, assignmentId: id }, 'AI evaluation failed');
    }

    return { success: true, id: docId };
  }

  static async recheck(
    data: {
      assignmentId: string;
      studentId: string;
      teacherScore: string | number;
      teacherFeedback?: string;
    },
    actor: Actor,
    tenantId: string
  ) {
    const assignmentDoc = await db.collection('assignments').doc(data.assignmentId).get();
    const assignment = assignmentDoc.exists ? (assignmentDoc.data() as AssignmentRecord) : null;
    if (!assignment) throw new AppError('Assignment not found', 404);
    if (!isTenantAssignment(assignment, tenantId)) throw new AppError('Tenant access denied', 403);

    const docId = `${data.assignmentId}_${data.studentId}`;
    const submissionRef = db.collection('submissions').doc(docId);
    const submissionDoc = await submissionRef.get();
    if (!submissionDoc.exists) throw new AppError('Submission not found', 404);
    const submission = submissionDoc.data() as SubmissionRecord;
    if (!isTenantSubmission(submission, tenantId)) throw new AppError('Tenant access denied', 403);

    await submissionRef.update({
      teacherScore: data.teacherScore,
      teacherFeedback: data.teacherFeedback,
      grade: data.teacherScore,
      feedback: data.teacherFeedback,
      recheckedByTeacher: true,
      status: 'returned',
      updatedAt: new Date().toISOString(),
      updatedBy: actor.uid,
    });
    await emitNotification({
      title: `Grade returned: ${assignment.title || 'Assignment'}`,
      message:
        data.teacherFeedback || `Your teacher published a final score of ${data.teacherScore}.`,
      type: 'assignment',
      href: '/assignments',
      targetUserIds: [data.studentId],
      schoolId: tenantId,
      tenantId,
      actorId: actor.uid,
      metadata: {
        assignmentId: data.assignmentId,
        submissionId: docId,
        teacherScore: data.teacherScore,
      },
    });
  }
}
