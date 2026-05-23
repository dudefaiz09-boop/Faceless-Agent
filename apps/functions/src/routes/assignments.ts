import { Router } from 'express';
import { db } from '../lib/documents.js';
import { requireAnyPermission, requirePermission } from '../middleware/permissions.js';
import { logger } from '@educonnect/logger';
import { generateSafeContent, isAiEnabled } from '../lib/ai.js';
import { AssignmentAnalytics } from '@educonnect/shared-analytics';
import { createNotification, type NotificationInput } from '../lib/notifications.js';
import {
  assignmentClassReportParamsSchema,
  assignmentHistoryParamsSchema,
  assignmentIdParamsSchema,
  assignmentListParamsSchema,
  assignmentListQuerySchema,
  assignmentSubmissionsParamsSchema,
  createAssignmentSchema,
  recheckAssignmentSchema,
  submitAssignmentSchema,
} from '../schemas/assignments.js';

const router: Router = Router();

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

async function emitAssignmentNotification(input: NotificationInput) {
  try {
    await createNotification(input);
  } catch (error) {
    logger.warn({ err: error, title: input.title }, 'Assignment notification could not be created');
  }
}

function canViewStudentAssignments(user: NonNullable<Express.Request['user']>, studentId: string) {
  return (
    studentId === user.uid ||
    user.isAdmin ||
    user.permissions?.manageAssignments ||
    user.permissions?.viewReports ||
    (user.permissions?.viewOwnRecords && user.linkedStudentIds?.includes(studentId))
  );
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

// Get assignment analytics for a class
router.get(
  '/report/:classId',
  requireAnyPermission(['manageAssignments', 'viewReports']),
  async (req, res, next) => {
    try {
      const { classId } = assignmentClassReportParamsSchema.parse(req.params);

      const assignmentsSnap = await db
        .collection('assignments')
        .where('tenantId', '==', req.tenantId)
        .where('targetClasses', 'array-contains', classId)
        .get();

      const assignments: AssignmentRecord[] = assignmentsSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<AssignmentRecord, 'id'>),
      }));

      const report = await Promise.all(
        assignments.map(async (assignment) => {
          const submissionsSnap = await db
            .collection('submissions')
            .where('tenantId', '==', req.tenantId)
            .where('assignmentId', '==', assignment.id)
            .get();

          const submissions = submissionsSnap.docs.map((doc) => doc.data() as SubmissionRecord);
          return AssignmentAnalytics.calculateStats(assignment, submissions);
        })
      );

      res.json(report);
    } catch (error) {
      next(error);
    }
  }
);

// Get student submission history
router.get('/history/:uid', async (req, res, next) => {
  try {
    const { uid } = assignmentHistoryParamsSchema.parse(req.params);

    if (!canViewStudentAssignments(req.user!, uid)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const snapshot = await db
      .collection('submissions')
      .where('tenantId', '==', req.tenantId)
      .where('studentId', '==', uid)
      .get();

    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

// Get submissions for a specific assignment
router.get(
  '/submissions/:assignmentId',
  requirePermission('manageAssignments'),
  async (req, res, next) => {
    try {
      const { assignmentId } = assignmentSubmissionsParamsSchema.parse(req.params);

      const assignmentDoc = await db.collection('assignments').doc(assignmentId).get();
      const assignment = assignmentDoc.exists ? (assignmentDoc.data() as AssignmentRecord) : null;

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      if (!isTenantAssignment(assignment, req.tenantId)) {
        return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
      }

      const snapshot = await db
        .collection('submissions')
        .where('tenantId', '==', req.tenantId)
        .where('assignmentId', '==', assignmentId)
        .get();

      res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      next(error);
    }
  }
);

// List assignments
router.get('/:classId?', async (req, res, next) => {
  try {
    const { classId: paramClassId } = assignmentListParamsSchema.parse(req.params);
    const { classId: queryClassId } = assignmentListQuerySchema.parse(req.query);
    const classId = paramClassId || queryClassId;

    let query = db.collection('assignments').where('tenantId', '==', req.tenantId);

    if (classId) {
      query = query.where('targetClasses', 'array-contains', classId);
    }

    const snapshot = await query.get();

    const assignments = snapshot.docs.map((doc) => {
      const data = doc.data() as AssignmentRecord;

      return {
        id: doc.id,
        ...data,
        title: data.title || 'Untitled Assignment',
        dueDate: data.dueDate || null,
        classId: data.classId || null,
        targetClasses: Array.isArray(data.targetClasses) ? data.targetClasses : [],
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
      };
    });

    res.json(assignments);
  } catch (error) {
    logger.error({ err: error, classId: req.params.classId }, 'Failed to list assignments');
    next(error);
  }
});

// Create assignment
router.post(['/', '/create'], requirePermission('manageAssignments'), async (req, res, next) => {
  try {
    const parsedBody = createAssignmentSchema.parse(req.body);

    const targetClasses = parsedBody.targetClasses?.length
      ? parsedBody.targetClasses
      : ([parsedBody.classId].filter(Boolean) as string[]);

    const classId = parsedBody.classId || targetClasses[0];
    const dueDate = parsedBody.dueDate || parsedBody.due_at;

    if (!classId || !dueDate) {
      return res.status(400).json({ error: 'classId and dueDate are required' });
    }

    const assignment = {
      tenantId: req.tenantId,
      schoolId: req.tenantId,
      title: parsedBody.title,
      description: parsedBody.description || '',
      subject: parsedBody.subject || parsedBody.subjectId || 'General',
      subjectId: parsedBody.subjectId || parsedBody.subject || 'General',
      status: parsedBody.status,
      dueDate,
      classId,
      targetClasses: targetClasses.length ? targetClasses : [classId],
      attachments: parsedBody.attachments,
      rubric: parsedBody.rubric || null,
      visibility: parsedBody.visibility,
      createdBy: req.user!.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('assignments').add(assignment);

    await emitAssignmentNotification({
      title: `New assignment: ${assignment.title}`,
      message: `Due ${assignment.dueDate}${
        assignment.description ? ` - ${assignment.description.slice(0, 140)}` : ''
      }`,
      type: 'assignment',
      href: '/assignments',
      targetRoles: ['student', 'parent'],
      targetClasses,
      schoolId: req.tenantId,
      tenantId: req.tenantId,
      actorId: req.user!.uid,
      metadata: { assignmentId: docRef.id, classId, dueDate: assignment.dueDate },
    });

    res.json({ id: docRef.id, ...assignment });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requirePermission('manageAssignments'), async (req, res, next) => {
  try {
    const { id } = assignmentIdParamsSchema.parse(req.params);

    const assignmentRef = db.collection('assignments').doc(id);
    const assignmentSnapshot = await assignmentRef.get();

    if (!assignmentSnapshot.exists) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentSnapshot.data() as AssignmentRecord;

    if (!isTenantAssignment(assignment, req.tenantId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
    }

    const now = new Date().toISOString();

    await assignmentRef.update({
      status: 'archived',
      deletedAt: now,
      updatedAt: now,
      updatedBy: req.user!.uid,
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Submit assignment
router.post(['/:id/submit', '/submit'], async (req, res, next) => {
  try {
    const parsedBody = submitAssignmentSchema.parse(req.body);
    const params = req.params.id ? assignmentIdParamsSchema.parse(req.params) : { id: undefined };
    const assignmentId = params.id || parsedBody.assignmentId;
    const { content, fileUrl } = parsedBody;
    const user = req.user!;

    if (!assignmentId) {
      return res.status(400).json({ error: 'assignmentId is required' });
    }

    const assignmentDoc = await db.collection('assignments').doc(assignmentId).get();
    const assignment = assignmentDoc.exists ? (assignmentDoc.data() as AssignmentRecord) : null;

    if (!assignment) {
      logger.warn({ assignmentId, userId: user.uid }, 'Assignment not found for submission');
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (!isTenantAssignment(assignment, req.tenantId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
    }

    const docId = `${assignmentId}_${user.uid}`;
    const submissionRef = db.collection('submissions').doc(docId);

    const submissionData = {
      tenantId: req.tenantId,
      schoolId: req.tenantId,
      assignmentId,
      studentId: user.uid,
      studentName: user.displayName || 'Student',
      content: content || '',
      fileUrl: fileUrl || null,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      checkedByAI: false,
      recheckedByTeacher: false,
    };

    await submissionRef.set(submissionData);

    if (assignment.createdBy && assignment.createdBy !== user.uid) {
      await emitAssignmentNotification({
        title: `${submissionData.studentName} submitted work`,
        message: `${assignment.title || 'Assignment'} is ready for review.`,
        type: 'assignment',
        href: '/assignments',
        targetUserIds: [assignment.createdBy],
        schoolId: req.tenantId,
        tenantId: req.tenantId,
        actorId: user.uid,
        metadata: { assignmentId, submissionId: docId, studentId: user.uid },
      });
    }

    try {
      if (!isAiEnabled()) {
        logger.info({ assignmentId }, 'Skipping AI grading because AI provider is not configured');
        return res.json({ success: true, id: docId });
      }

      const rubricText = assignment.rubric ? `Use this rubric: ${assignment.rubric}.` : '';
      const prompt = `Grade this student submission for the assignment "${
        assignment.title || 'Unknown'
      }".
Submission Content: ${content || 'No text provided.'}
${fileUrl ? `Attached File URL: ${fileUrl}` : ''}
${rubricText}
Respond strictly in JSON format: { "score": number, "feedback": "string" }`;

      const responseText = await generateSafeContent(
        'You are a strict assignment grading assistant. Return only valid JSON.',
        prompt,
        { temperature: 0.1, maxOutputTokens: 500 }
      );

      const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
      const aiResult = JSON.parse(cleanedResponse || '{}') as {
        score?: number;
        feedback?: string;
      };

      await submissionRef.update({
        aiScore: aiResult.score || null,
        aiFeedback: aiResult.feedback || null,
        grade: aiResult.score?.toString() || null,
        feedback: aiResult.feedback || null,
        status: 'graded',
        checkedByAI: true,
      });

      await emitAssignmentNotification({
        title: `AI feedback is ready: ${assignment.title || 'Assignment'}`,
        message:
          aiResult.feedback ||
          'Your submission has been reviewed and is waiting for teacher verification.',
        type: 'assignment',
        href: '/assignments',
        targetUserIds: [user.uid],
        schoolId: req.tenantId,
        tenantId: req.tenantId,
        actorId: user.uid,
        metadata: { assignmentId, submissionId: docId, aiScore: aiResult.score || null },
      });
    } catch (aiError) {
      logger.error({ err: aiError, uid: user.uid, assignmentId }, 'AI evaluation failed');
    }

    res.json({ success: true, id: docId });
  } catch (error) {
    const assignmentId = req.params.id || req.body.assignmentId;

    logger.error(
      { err: error, assignmentId, userId: req.user?.uid },
      'Failed to submit assignment'
    );

    next(error);
  }
});

// Teacher Recheck / Verification
router.post('/recheck', requirePermission('manageAssignments'), async (req, res, next) => {
  try {
    const { assignmentId, studentId, teacherScore, teacherFeedback } =
      recheckAssignmentSchema.parse(req.body);
    const user = req.user!;

    const assignmentDoc = await db.collection('assignments').doc(assignmentId).get();
    const assignment = assignmentDoc.exists ? (assignmentDoc.data() as AssignmentRecord) : null;

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (!isTenantAssignment(assignment, req.tenantId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
    }

    const docId = `${assignmentId}_${studentId}`;
    const submissionRef = db.collection('submissions').doc(docId);
    const submissionDoc = await submissionRef.get();

    if (!submissionDoc.exists) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionDoc.data() as SubmissionRecord;

    if (!isTenantSubmission(submission, req.tenantId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
    }

    await submissionRef.update({
      teacherScore,
      teacherFeedback,
      grade: teacherScore,
      feedback: teacherFeedback,
      recheckedByTeacher: true,
      status: 'returned',
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
    });

    await emitAssignmentNotification({
      title: `Grade returned: ${assignment.title || 'Assignment'}`,
      message: teacherFeedback || `Your teacher published a final score of ${teacherScore}.`,
      type: 'assignment',
      href: '/assignments',
      targetUserIds: [studentId],
      schoolId: req.tenantId,
      tenantId: req.tenantId,
      actorId: user.uid,
      metadata: { assignmentId, submissionId: docId, teacherScore },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
