import { Router } from 'express';
import { db } from '../lib/firebase.js';
import { getMessaging } from 'firebase-admin/messaging';
import { checkPermission } from '../middleware/auth.js';
import { logger } from '@educonnect/logger';
import { ai, GEMINI_MODEL } from '../lib/ai.js';

const router: Router = Router();

// Get student submission history
router.get('/history/:uid', async (req, res, next) => {
  try {
    const snapshot = await db.collection('submissions')
      .where('tenantId', '==', req.tenantId)
      .where('studentId', '==', req.params.uid)
      .get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

// Get submissions for a specific assignment (teacher view)
router.get('/submissions/:assignmentId', checkPermission('manageAssignments'), async (req, res, next) => {
  try {
    const snapshot = await db.collection('submissions')
      .where('tenantId', '==', req.tenantId)
      .where('assignmentId', '==', req.params.assignmentId)
      .get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

// List assignments
router.get('/:classId?', async (req, res, next) => {
  try {
    const classId = req.params.classId || (req.query.classId as string);
    let query: any = db.collection('assignments').where('tenantId', '==', req.tenantId);

    if (classId) {
      query = query.where('targetClasses', 'array-contains', classId);
    }

    const snapshot = await query.get();
    res.json(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

// Create assignment
router.post(['/', '/create'], checkPermission('manageAssignments'), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const targetClasses = [req.body.classId]; // Simplified for current payload structure

    const assignment = {
      tenantId: req.tenantId,
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

    // Dispatch push notifications to mobile clients via FCM Topics
    try {
      const messaging = getMessaging();
      const topic = `class_${req.body.classId}_assignments`;
      await messaging.send({
        topic,
        notification: {
          title: `New Assignment: ${assignment.title}`,
          body: `Due on ${assignment.dueDate}`,
        },
        data: {
          type: 'assignment',
          assignmentId: docRef.id,
          classId: req.body.classId,
        },
      });
      logger.info(`Pushed FCM notification to topic: ${topic}`);
    } catch (fcmError) {
      logger.error({ err: fcmError }, 'Failed to send FCM assignment notification');
    }

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

    // Trigger AI Grading
    try {
      const rubricText = assignment?.rubric ? `Use this rubric: ${assignment.rubric}.` : '';
      const prompt = `Grade this student submission for the assignment "${assignment?.title || 'Unknown'}".
Submission Content: ${content || 'No text provided.'}
${fileUrl ? `Attached File URL: ${fileUrl}` : ''}
${rubricText}
Respond strictly in JSON format: { "score": number, "feedback": "string" }`;

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = result.text || '{}';
      const aiResult = JSON.parse(responseText);
      await submissionRef.update({
        aiScore: aiResult.score || null,
        aiFeedback: aiResult.feedback || null,
        grade: aiResult.score?.toString() || null, // Default initial grade to AI score
        feedback: aiResult.feedback || null,
        status: 'graded',
        checkedByAI: true,
      });
    } catch (aiError) {
      logger.error({ err: aiError, uid: user.uid }, 'AI evaluation failed');
    }

    res.json({ success: true, id: docId });
  } catch (error) {
    next(error);
  }
});

// Teacher Recheck / Verification
router.post('/recheck', checkPermission('manageAssignments'), async (req, res, next) => {
  try {
    const { assignmentId, studentId, teacherScore, teacherFeedback } = req.body;

    if (!assignmentId || !studentId) {
      return res.status(400).json({ error: 'assignmentId and studentId required' });
    }

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

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
