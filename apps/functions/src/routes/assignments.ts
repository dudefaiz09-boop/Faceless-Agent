import { Router } from 'express';
import { db } from '../lib/documents.js';
import { checkPermission } from '../middleware/auth.js';
import { logger } from '@educonnect/logger';
import { generateSafeContent, isAiEnabled } from '../lib/ai.js';
import { AssignmentAnalytics } from '@educonnect/shared-analytics';
import { createNotification, type NotificationInput } from '../lib/notifications.js';

const router: Router = Router();

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
    user.permissions.manageAssignments ||
    user.permissions.viewReports ||
    (user.permissions.viewOwnRecords && user.linkedStudentIds.includes(studentId))
  );
}

// Get assignment analytics for a class
router.get('/report/:classId', checkPermission('manageAssignments'), async (req, res, next) => {
  try {
    const { classId } = req.params;

    // 1. Get all assignments for this class
    const assignmentsSnap = await db
      .collection('assignments')
      .where('tenantId', '==', req.tenantId)
      .where('targetClasses', 'array-contains', classId)
      .get();

    const assignments = assignmentsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Record<string, unknown>
    );

    // 2. Get all submissions for these assignments
    const report = await Promise.all(
      assignments.map(async (assignment: Record<string, unknown>) => {
        const submissionsSnap = await db
          .collection('submissions')
          .where('assignmentId', '==', assignment.id as string)
          .get();

        const submissions = submissionsSnap.docs.map(
          (doc) => doc.data() as Record<string, unknown>
        );
        return AssignmentAnalytics.calculateStats(assignment, submissions);
      })
    );

    res.json(report);
  } catch (error) {
    next(error);
  }
});

// Get student submission history
router.get('/history/:uid', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!canViewStudentAssignments(req.user, req.params.uid)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const snapshot = await db
      .collection('submissions')
      .where('tenantId', '==', req.tenantId)
      .where('studentId', '==', req.params.uid)
      .get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

// Get submissions for a specific assignment (teacher view)
router.get(
  '/submissions/:assignmentId',
  checkPermission('manageAssignments'),
  async (req, res, next) => {
    try {
      const snapshot = await db
        .collection('submissions')
        .where('tenantId', '==', req.tenantId)
        .where('assignmentId', '==', req.params.assignmentId)
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
    const classId = req.params.classId || (req.query.classId as string);
    let query = db.collection('assignments').where('tenantId', '==', req.tenantId!);

    if (classId) {
      query = query.where('targetClasses', 'array-contains', classId);
    }

    const snapshot = await query.get();
    const assignments = snapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        ...data,
        // Ensure required fields have defaults
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
router.post(['/', '/create'], checkPermission('manageAssignments'), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const targetClasses = [req.body.classId].filter(Boolean);
    if (!req.body.title || !req.body.classId || !req.body.dueDate) {
      return res.status(400).json({ error: 'title, classId, and dueDate are required' });
    }

    const assignment = {
      tenantId: req.tenantId,
      schoolId: req.user.schoolId,
      title: req.body.title,
      description: req.body.description,
      dueDate: req.body.dueDate,
      classId: req.body.classId,
      targetClasses: targetClasses,
      attachments: req.body.attachments || [],
      rubric: req.body.rubric || null,
      visibility: req.body.visibility || 'public',
      createdBy: req.user.uid,
      createdAt: new Date().toISOString(),
    };
    const docRef = await db.collection('assignments').add(assignment);

    await emitAssignmentNotification({
      title: `New assignment: ${assignment.title}`,
      message: `Due ${assignment.dueDate}${assignment.description ? ` - ${assignment.description.slice(0, 140)}` : ''}`,
      type: 'assignment',
      href: '/assignments',
      targetRoles: ['student', 'parent'],
      targetClasses,
      schoolId: req.user.schoolId,
      tenantId: req.tenantId,
      actorId: req.user.uid,
      metadata: { assignmentId: docRef.id, classId: req.body.classId, dueDate: assignment.dueDate },
    });

    res.json({ id: docRef.id, ...assignment });
  } catch (error) {
    next(error);
  }
});

// Submit assignment (Handle both /:id/submit and /submit with id in body)
router.post(['/:id/submit', '/submit'], async (req, res, next) => {
  try {
    const { content, fileUrl, assignmentId: bodyId } = req.body;
    const assignmentId = req.params.id || bodyId;
    const user = req.user;

    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!assignmentId) return res.status(400).json({ error: 'assignmentId is required' });

    // Fetch assignment to get rubric
    const assignmentDoc = await db.collection('assignments').doc(assignmentId).get();
    const assignment = assignmentDoc.exists ? assignmentDoc.data() : null;
    if (!assignment) {
      logger.warn({ assignmentId, userId: user.uid }, 'Assignment not found for submission');
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const docId = `${assignmentId}_${user.uid}`;
    const submissionRef = db.collection('submissions').doc(docId);

    const submissionData = {
      tenantId: req.tenantId,
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
        schoolId: user.schoolId,
        tenantId: req.tenantId,
        actorId: user.uid,
        metadata: { assignmentId, submissionId: docId, studentId: user.uid },
      });
    }

    // Trigger AI Grading
    try {
      if (!isAiEnabled()) {
        logger.info({ assignmentId }, 'Skipping AI grading because AI provider is not configured');
        return res.json({ success: true, id: docId });
      }

      const rubricText = assignment?.rubric ? `Use this rubric: ${assignment.rubric}.` : '';
      const prompt = `Grade this student submission for the assignment "${assignment?.title || 'Unknown'}".
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
      const aiResult = JSON.parse(cleanedResponse || '{}');
      await submissionRef.update({
        aiScore: aiResult.score || null,
        aiFeedback: aiResult.feedback || null,
        grade: aiResult.score?.toString() || null, // Default initial grade to AI score
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
        schoolId: user.schoolId,
        tenantId: req.tenantId,
        actorId: user.uid,
        metadata: { assignmentId, submissionId: docId, aiScore: aiResult.score || null },
      });
    } catch (aiError) {
      logger.error({ err: aiError, uid: user.uid, assignmentId }, 'AI evaluation failed');
      // Continue even if AI grading fails - submission is still saved
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
router.post('/recheck', checkPermission('manageAssignments'), async (req, res, next) => {
  try {
    const { assignmentId, studentId, teacherScore, teacherFeedback } = req.body;
    const user = req.user;

    if (!assignmentId || !studentId) {
      return res.status(400).json({ error: 'assignmentId and studentId required' });
    }
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const assignmentDoc = await db.collection('assignments').doc(assignmentId).get();
    const assignment = assignmentDoc.exists ? assignmentDoc.data() : {};

    const docId = `${assignmentId}_${studentId}`;
    await db.collection('submissions').doc(docId).update({
      teacherScore,
      teacherFeedback,
      grade: teacherScore,
      feedback: teacherFeedback,
      recheckedByTeacher: true,
      status: 'returned', // Finalized state
      updatedAt: new Date().toISOString(),
    });

    await emitAssignmentNotification({
      title: `Grade returned: ${assignment?.title || 'Assignment'}`,
      message: teacherFeedback || `Your teacher published a final score of ${teacherScore}.`,
      type: 'assignment',
      href: '/assignments',
      targetUserIds: [studentId],
      schoolId: user.schoolId,
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
