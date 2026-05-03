import express from 'express';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import admin from 'firebase-admin';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Startup Validation
const REQUIRED_ENV = ['GEMINI_API_KEY'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`CRITICAL: Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

let firebaseConfig;
try {
  const configPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    console.error('Firebase config file not found at:', configPath);
    process.exit(1);
  }
} catch (error) {
  console.error('Error loading Firebase config:', error);
  process.exit(1);
}

// Initialize Firebase Admin
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log('Firebase Admin initialized successfully');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Security and Performance Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for Vite/Dev flexibility
    crossOriginEmbedderPolicy: false
  }));
  app.use(compression());
  app.use(express.json());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiter to all /api routes
  app.use('/api/', limiter);

  // API Middleware for auth and permissions
  app.use(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        (req as any).user = {
          uid: decodedToken.uid,
          roles: decodedToken.roles || [],
          isAdmin: decodedToken.isAdmin || false,
          classId: decodedToken.classId || null,
          permissions: decodedToken.permissions || {}
        };
      } catch (error) {
        console.error('Error verifying token:', error);
      }
    }
    next();
  });

  // Improved Permission Check Helper
  const checkPermission = (perm: string) => (req: any, res: any, next: any) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    // Allow if user is Admin OR has the specific permission
    if (user.isAdmin || (user.permissions && user.permissions[perm])) {
      return next();
    }
    
    res.status(403).json({ 
      error: 'Forbidden', 
      message: `Missing required permission: ${perm}`,
      userRole: user.roles
    });
  };

  // --- Protected API Routes ---

  // Announcements
  app.get('/api/announcements', async (req, res, next) => {
    try {
      const user = (req as any).user;
      let query: admin.firestore.Query = admin.firestore().collection('announcements');

      if (user && user.roles.includes('student')) {
        const studentClasses = ['all'];
        if (user.classId) studentClasses.push(user.classId);
        query = query.where('targetClasses', 'array-contains-any', studentClasses);
      }

      const snapshot = await query.get();
      const announcements = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
      res.json(announcements);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/announcements', checkPermission('manageAnnouncements'), async (req, res, next) => {
    try {
      const { title, content, targetClasses, visibility } = req.body;
      const docRef = await admin.firestore().collection('announcements').add({
        title,
        content,
        targetClasses: targetClasses || ['all'],
        visibility: visibility || 'public',
        authorId: (req as any).user.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(201).json({ id: docRef.id, success: true });
    } catch (error) {
      next(error);
    }
  });

  // Attendance
  app.get('/api/attendance', checkPermission('manageAttendance'), async (req, res, next) => {
    try {
      const { classId, date } = req.query;
      let query: admin.firestore.Query = admin.firestore().collection('attendance');
      
      if (classId) query = query.where('classId', '==', classId);
      if (date) query = query.where('date', '==', date);
      
      const snapshot = await query.limit(100).get();
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(records);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/attendance/mark', checkPermission('manageAttendance'), async (req, res, next) => {
    try {
      const { classId, date, records } = req.body; // records: [{studentId, status}]
      const batch = admin.firestore().batch();
      const markedBy = (req as any).user.uid;
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      for (const record of records) {
        const docId = `${classId}_${record.studentId}_${date}`;
        const docRef = admin.firestore().collection('attendance').doc(docId);
        batch.set(docRef, {
          classId,
          studentId: record.studentId,
          date,
          status: record.status,
          markedBy,
          updatedAt: timestamp
        }, { merge: true });
      }

      await batch.commit();

      res.json({ success: true, count: records.length });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/attendance/history/:studentId', async (req, res, next) => {
    try {
      const { studentId } = req.params;
      const user = (req as any).user;

      // Ensure student can only see their own history, or staff can see any
      if (!user.isAdmin && !user.permissions.manageAttendance && user.uid !== studentId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const snapshot = await admin.firestore()
        .collection('attendance')
        .where('studentId', '==', studentId)
        .get();

      const history = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => b.date.localeCompare(a.date));
      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/attendance/report/:classId', checkPermission('manageAttendance'), async (req, res, next) => {
    try {
      const { classId } = req.params;
      const snapshot = await admin.firestore()
        .collection('attendance')
        .where('classId', '==', classId)
        .get();

      const records = snapshot.docs.map(doc => doc.data());
      
      // Basic analytics
      const stats: Record<string, { present: number, absent: number, late: number, total: number }> = {};
      
      records.forEach(r => {
        if (!stats[r.studentId]) stats[r.studentId] = { present: 0, absent: 0, late: 0, total: 0 };
        stats[r.studentId][r.status as 'present' | 'absent' | 'late']++;
        stats[r.studentId].total++;
      });

      res.json({ classId, stats });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/assignments/:classId', async (req, res, next) => {
    try {
      const { classId } = req.params;
      const snapshot = await admin.firestore()
        .collection('assignments')
        .where('classId', '==', classId)
        .get();
      
      const assignments = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (a.dueDate || '').localeCompare(b.dueDate || ''));
      res.json(assignments);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/assignments/create', checkPermission('manageAssignments'), async (req, res, next) => {
    try {
      const { title, description, dueDate, classId, attachments } = req.body;
      const docRef = await admin.firestore().collection('assignments').add({
        title,
        description,
        dueDate,
        classId,
        attachments: attachments || [],
        createdBy: (req as any).user.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(201).json({ id: docRef.id, success: true });
    } catch (error) {
      next(error);
    }
  });

  // Submissions
  app.post('/api/assignments/submit', async (req, res, next) => {
    try {
      const { assignmentId, content, fileUrl } = req.body;
      const user = (req as any).user;
      
      const docId = `${assignmentId}_${user.uid}`;
      const existingDoc = await admin.firestore().collection('submissions').doc(docId).get();
      const existingData = existingDoc.data();

      // Cache Check: If identical content/file already checked by AI
      if (existingData && existingData.checkedByAI && 
          existingData.content === content && 
          existingData.fileUrl === fileUrl) {
        return res.json({ 
          success: true, 
          cached: true,
          aiResult: {
            score: existingData.aiScore,
            feedback: existingData.aiFeedback
          }
        });
      }
      
      // Save/Update submission
      await admin.firestore().collection('submissions').doc(docId).set({
        assignmentId,
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        content,
        fileUrl: fileUrl || null,
        status: 'submitted',
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        grade: null,
        feedback: null,
        aiScore: null,
        aiFeedback: null,
        checkedByAI: false,
        recheckedByTeacher: false
      }, { merge: true });

      // Trigger AI Check
      try {
        const promptText = `
          You are an expert teacher grading a student's assignment.
          Assignment Content: ${content}
          ${fileUrl ? `Attached File: ${fileUrl}` : ""}
          
          Evaluate the submission based on accuracy, completeness, and grammar.
          Provide a score out of 10 and concise feedback.
          Respond ONLY in JSON format like this:
          {
            "score": number,
            "feedback": "string"
          }
        `;

        const result = await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: [{ role: 'user', parts: [{ text: promptText }] }]
        });
        
        const responseText = result.text;
        const aiResult = JSON.parse(responseText.replace(/```json|```/g, "").trim());

        await admin.firestore().collection('submissions').doc(docId).update({
          aiScore: aiResult.score,
          aiFeedback: aiResult.feedback,
          checkedByAI: true,
          // Automatically set initial grade and feedback to AI suggestions
          grade: aiResult.score.toString(),
          feedback: aiResult.feedback
        });

        res.json({ 
          success: true, 
          aiResult: {
            score: aiResult.score,
            feedback: aiResult.feedback
          }
        });
      } catch (aiError) {
        console.error('AI Check failed:', aiError);
        // Still return success for the submission even if AI fails
        res.json({ success: true, aiError: 'AI feedback is temporarily unavailable' });
      }
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/assignments/recheck', checkPermission('manageAssignments'), async (req, res, next) => {
    try {
      const { assignmentId, studentId, teacherScore, teacherFeedback } = req.body;
      const docId = `${assignmentId}_${studentId}`;

      await admin.firestore().collection('submissions').doc(docId).update({
        grade: teacherScore,
        feedback: teacherFeedback,
        teacherScore,
        teacherFeedback,
        status: 'graded',
        recheckedByTeacher: true,
        gradedAt: admin.firestore.FieldValue.serverTimestamp(),
        gradedBy: (req as any).user.uid
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/assignments/submissions/:assignmentId', checkPermission('manageAssignments'), async (req, res, next) => {
    try {
      const { assignmentId } = req.params;
      const snapshot = await admin.firestore()
        .collection('submissions')
        .where('assignmentId', '==', assignmentId)
        .get();
      
      const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(submissions);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/assignments/grade', checkPermission('manageAssignments'), async (req, res, next) => {
    try {
      const { assignmentId, studentId, grade, feedback } = req.body;
      const docId = `${assignmentId}_${studentId}`;
      
      await admin.firestore().collection('submissions').doc(docId).update({
        grade,
        feedback,
        status: 'graded',
        gradedAt: admin.firestore.FieldValue.serverTimestamp(),
        gradedBy: (req as any).user.uid
      });
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/assignments/history/:studentId', async (req, res, next) => {
    try {
      const { studentId } = req.params;
      const user = (req as any).user;

      if (!user.isAdmin && !user.permissions.manageAssignments && user.uid !== studentId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const snapshot = await admin.firestore()
        .collection('submissions')
        .where('studentId', '==', studentId)
        .get();
      
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  // Users Management (Staff/Admin only)
  app.get('/api/users', checkPermission('manageStudents'), async (req, res, next) => {
    try {
      const { type } = req.query;
      let query: admin.firestore.Query = admin.firestore().collection('users');
      if (type) {
        query = query.where('roles', 'array-contains', type);
      }
      const snapshot = await query.limit(100).get();
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  // Student Management APIs
  app.post('/api/students/create', checkPermission('manageStudents'), async (req, res, next) => {
    try {
      const { email, password, displayName, classId, section, linkedParentIds } = req.body;
      const creator = (req as any).user;

      // 1. Create Auth User
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
      });

      const studentData = {
        uid: userRecord.uid,
        email,
        displayName,
        roles: ['student'],
        classId: classId || null,
        section: section || null,
        linkedParentIds: linkedParentIds || [],
        createdBy: creator.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        permissions: { submitAssignments: true, viewOwnRecords: true }
      };

      // 2. Set Claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        roles: studentData.roles,
        classId: studentData.classId,
        permissions: studentData.permissions
      });

      // 3. Create Firestore Doc
      await admin.firestore().collection('users').doc(userRecord.uid).set(studentData);

      // 4. Log Audit
      await admin.firestore().collection('auditLogs').add({
        action: 'create',
        targetUid: userRecord.uid,
        performedBy: creator.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Created student: ${displayName} (${email})`
      });

      res.status(201).json({ uid: userRecord.uid, success: true });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/students/:uid', checkPermission('manageStudents'), async (req, res, next) => {
    try {
      const { uid } = req.params;
      const { displayName, classId, section, linkedParentIds, roles } = req.body;
      const updater = (req as any).user;

      const updateData: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      if (displayName !== undefined) updateData.displayName = displayName;
      if (classId !== undefined) updateData.classId = classId;
      if (section !== undefined) updateData.section = section;
      if (linkedParentIds !== undefined) updateData.linkedParentIds = linkedParentIds;
      if (roles !== undefined) updateData.roles = roles;

      await admin.firestore().collection('users').doc(uid).update(updateData);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/students/:uid', checkPermission('manageStudents'), async (req, res, next) => {
    try {
      const { uid } = req.params;
      const deleter = (req as any).user;

      await admin.auth().deleteUser(uid);
      await admin.firestore().collection('users').doc(uid).delete();

      // Log Audit
      await admin.firestore().collection('auditLogs').add({
        action: 'delete',
        targetUid: uid,
        performedBy: deleter.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Deleted student user and record.`
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/students/bulk-import', checkPermission('manageStudents'), async (req, res, next) => {
    try {
      const { students } = req.body; // Array of student objects
      const creator = (req as any).user;
      const results = [];

      for (const student of students) {
        try {
          const userRecord = await admin.auth().createUser({
            email: student.email,
            password: student.password || 'TempPass123!',
            displayName: student.displayName,
          });

          const studentData = {
            uid: userRecord.uid,
            email: student.email,
            displayName: student.displayName,
            roles: ['student'],
            classId: student.classId || null,
            section: student.section || null,
            linkedParentIds: [],
            createdBy: creator.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            permissions: { submitAssignments: true, viewOwnRecords: true }
          };

          await admin.auth().setCustomUserClaims(userRecord.uid, {
            roles: studentData.roles,
            classId: studentData.classId,
            permissions: studentData.permissions
          });

          await admin.firestore().collection('users').doc(userRecord.uid).set(studentData);
          results.push({ email: student.email, success: true, uid: userRecord.uid });
        } catch (err) {
          results.push({ email: student.email, success: false, error: (err as Error).message });
        }
      }

      // Log Bulk Audit
      await admin.firestore().collection('auditLogs').add({
        action: 'bulk_import',
        performedBy: creator.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Bulk imported ${results.filter(r => r.success).length} students.`
      });

      res.json({ results, success: true });
    } catch (error) {
      next(error);
    }
  });

  // Teacher Management APIs
  app.post('/api/teachers/create', checkPermission('manageTeachers'), async (req, res, next) => {
    try {
      const { email, password, displayName, subjects, classes } = req.body;
      const creator = (req as any).user;

      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
      });

      const teacherData = {
        uid: userRecord.uid,
        email,
        displayName,
        roles: ['teacher'],
        subjects: subjects || [],
        classes: classes || [],
        createdBy: creator.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        permissions: {
          manageStudents: true,
          manageAnnouncements: true,
          manageAttendance: true,
          manageAssignments: true,
          managePerformance: true
        }
      };

      await admin.auth().setCustomUserClaims(userRecord.uid, {
        roles: teacherData.roles,
        permissions: teacherData.permissions
      });

      await admin.firestore().collection('users').doc(userRecord.uid).set(teacherData);

      await admin.firestore().collection('auditLogs').add({
        action: 'create_teacher',
        targetUid: userRecord.uid,
        performedBy: creator.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Created teacher: ${displayName} (${email})`
      });

      res.status(201).json({ uid: userRecord.uid, success: true });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/teachers/:uid', checkPermission('manageTeachers'), async (req, res, next) => {
    try {
      const { uid } = req.params;
      const { displayName, subjects, classes, roles } = req.body;
      const updater = (req as any).user;

      const updateData: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      if (displayName !== undefined) updateData.displayName = displayName;
      if (subjects !== undefined) updateData.subjects = subjects;
      if (classes !== undefined) updateData.classes = classes;
      if (roles !== undefined) updateData.roles = roles;

      await admin.firestore().collection('users').doc(uid).update(updateData);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/teachers/:uid', checkPermission('manageTeachers'), async (req, res, next) => {
    try {
      const { uid } = req.params;
      const deleter = (req as any).user;

      await admin.auth().deleteUser(uid);
      await admin.firestore().collection('users').doc(uid).delete();

      await admin.firestore().collection('auditLogs').add({
        action: 'delete_teacher',
        targetUid: uid,
        performedBy: deleter.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Deleted teacher user and record.`
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/teachers/bulk-import', checkPermission('manageTeachers'), async (req, res, next) => {
    try {
      const { teachers } = req.body;
      const creator = (req as any).user;
      const results = [];

      for (const teacher of teachers) {
        try {
          const userRecord = await admin.auth().createUser({
            email: teacher.email,
            password: teacher.password || 'StaffPass123!',
            displayName: teacher.displayName,
          });

          const teacherData = {
            uid: userRecord.uid,
            email: teacher.email,
            displayName: teacher.displayName,
            roles: ['teacher'],
            subjects: teacher.subjects || [],
            classes: teacher.classes || [],
            createdBy: creator.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            permissions: {
              manageStudents: true,
              manageAnnouncements: true,
              manageAttendance: true,
              manageAssignments: true,
              managePerformance: true
            }
          };

          await admin.auth().setCustomUserClaims(userRecord.uid, {
            roles: teacherData.roles,
            permissions: teacherData.permissions
          });

          await admin.firestore().collection('users').doc(userRecord.uid).set(teacherData);
          results.push({ email: teacher.email, success: true, uid: userRecord.uid });
        } catch (err) {
          results.push({ email: teacher.email, success: false, error: (err as Error).message });
        }
      }

      await admin.firestore().collection('auditLogs').add({
        action: 'bulk_import_teachers',
        performedBy: creator.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Bulk imported ${results.filter(r => r.success).length} teachers.`
      });

      res.json({ results, success: true });
    } catch (error) {
      next(error);
    }
  });

  // Example API route: Set User Permissions (Financial Admin only)
  app.post('/api/roles', checkPermission('financialOps'), async (req, res, next) => {
    const { uid, roles, isAdmin, permissions } = req.body;
    try {
      await admin.auth().setCustomUserClaims(uid, { roles, isAdmin, permissions });
      await admin.firestore().collection('users').doc(uid).update({ roles, isAdmin, permissions });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/chat/conversations', async (req, res, next) => {
    try {
      const user = (req as any).user;
      const snapshot = await admin.firestore()
        .collection('conversations')
        .where('participants', 'array-contains', user.uid)
        .get();
      
      const conversations = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          const dateA = a.updatedAt?.toDate?.() || new Date(0);
          const dateB = b.updatedAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
      res.json(conversations);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/chat/send', async (req, res, next) => {
    try {
      const { recipientId, text, type, groupName } = req.body;
      const sender = (req as any).user;
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      let conversationId;
      if (type === 'group') {
        // Create or find group conversation
        const docRef = await admin.firestore().collection('conversations').add({
          name: groupName,
          type: 'group',
          participants: [sender.uid, ...(req.body.participants || [])],
          lastMessage: text,
          updatedAt: timestamp
        });
        conversationId = docRef.id;
      } else {
        // Direct message: find or create
        const participants = [sender.uid, recipientId].sort();
        const convQuery = await admin.firestore()
          .collection('conversations')
          .where('type', '==', 'direct')
          .where('participants', '==', participants)
          .get();
        
        if (convQuery.empty) {
          const docRef = await admin.firestore().collection('conversations').add({
            type: 'direct',
            participants,
            lastMessage: text,
            updatedAt: timestamp
          });
          conversationId = docRef.id;
        } else {
          conversationId = convQuery.docs[0].id;
          await admin.firestore().collection('conversations').doc(conversationId).update({
            lastMessage: text,
            updatedAt: timestamp
          });
        }
      }

      const msgRef = await admin.firestore()
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .add({
          senderId: sender.uid,
          senderName: sender.displayName || 'User',
          text,
          sentAt: timestamp,
          readBy: [sender.uid]
        });

      res.status(201).json({ conversationId, messageId: msgRef.id, success: true });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/chat/messages/:conversationId', async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const user = (req as any).user;

      // Security check: is user a participant?
      const convDoc = await admin.firestore().collection('conversations').doc(conversationId).get();
      if (!convDoc.exists || !convDoc.data()?.participants.includes(user.uid)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const snapshot = await admin.firestore()
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .get();

      const messages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          const dateA = a.sentAt?.toDate?.() || new Date(0);
          const dateB = b.sentAt?.toDate?.() || new Date(0);
          return dateA - dateB;
        });
      res.json(messages);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/library/resources', async (req, res, next) => {
    try {
      const { subject, grade } = req.query;
      let query: admin.firestore.Query = admin.firestore().collection('library');
      
      if (subject) query = query.where('subject', '==', subject);
      if (grade) query = query.where('grade', '==', grade);
      
      const snapshot = await query.get();
      const resources = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          const dateA = a.uploadedAt?.toDate?.() || new Date(0);
          const dateB = b.uploadedAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
      res.json(resources);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/library/upload', checkPermission('manageLibrary'), async (req, res, next) => {
    try {
      const { title, subject, grade, fileUrl, tags } = req.body;
      const docRef = await admin.firestore().collection('library').add({
        title,
        subject,
        grade: grade || 'all',
        fileUrl,
        tags: tags || [],
        uploadedBy: (req as any).user.uid,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.status(201).json({ id: docRef.id, success: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/library/borrow', async (req, res, next) => {
    try {
      const { resourceId } = req.body;
      const user = (req as any).user;
      
      const docRef = await admin.firestore().collection('borrowRecords').add({
        resourceId,
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        borrowedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'borrowed',
        returnedAt: null
      });
      
      res.status(201).json({ id: docRef.id, success: true });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/library/borrow/history/:studentId', async (req, res, next) => {
    try {
      const { studentId } = req.params;
      const user = (req as any).user;

      if (!user.isAdmin && !user.permissions.manageLibrary && user.uid !== studentId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const snapshot = await admin.firestore()
        .collection('borrowRecords')
        .where('studentId', '==', studentId)
        .get();
      
      const history = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          const dateA = a.borrowedAt?.toDate?.() || new Date(0);
          const dateB = b.borrowedAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/library/return', checkPermission('manageLibrary'), async (req, res, next) => {
    try {
      const { recordId } = req.body;
      await admin.firestore().collection('borrowRecords').doc(recordId).update({
        status: 'returned',
        returnedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Fees
  app.get('/api/fees/:studentId', async (req, res, next) => {
    try {
      const { studentId } = req.params;
      const user = (req as any).user;

      if (!user.isAdmin && !user.permissions.manageFees && user.uid !== studentId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const feeSnapshot = await admin.firestore()
        .collection('fees')
        .where('studentId', '==', studentId)
        .get();
      
      const paymentSnapshot = await admin.firestore()
        .collection('payments')
        .where('studentId', '==', studentId)
        .get();

      const fees = feeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const payments = paymentSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          const dateA = a.paidAt?.toDate?.() || new Date(0);
          const dateB = b.paidAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
      
      res.json({ fees, payments });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/fees/upload', checkPermission('manageFees'), async (req, res, next) => {
    try {
      const { records } = req.body; // Array of { studentId, amountDue, dueDate, classId }
      const batch = admin.firestore().batch();
      const uploadedBy = (req as any).user.uid;
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      await batch.commit();

      await admin.firestore().collection('auditLogs').add({
        action: 'upload_fees',
        performedBy: uploadedBy,
        timestamp,
        details: `Uploaded ${records.length} fee records`
      });

      res.status(201).json({ success: true, count: records.length });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/fees/pay', async (req, res, next) => {
    try {
      const { feeId, amount, method } = req.body;
      const user = (req as any).user;
      
      const feeRef = admin.firestore().collection('fees').doc(feeId);
      const feeDoc = await feeRef.get();
      
      if (!feeDoc.exists) return res.status(404).json({ error: 'Fee record not found' });
      
      const feeData = feeDoc.data();
      const newAmountPaid = (feeData?.amountPaid || 0) + amount;
      const status = newAmountPaid >= feeData?.amountDue ? 'paid' : 'partial';

      const batch = admin.firestore().batch();
      
      // Update fee status
      batch.update(feeRef, {
        amountPaid: newAmountPaid,
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Record payment
      const paymentRef = admin.firestore().collection('payments').doc();
      batch.set(paymentRef, {
        feeId,
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        amount,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        method: method || 'online',
        receiptUrl: `https://example.com/receipts/${paymentRef.id}.pdf`
      });

      await batch.commit();

      await admin.firestore().collection('auditLogs').add({
        action: 'pay_fee',
        performedBy: user.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Paid ${amount} for fee record ${feeId}`
      });

      res.json({ success: true, status });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/fees/report/:classId', checkPermission('manageFees'), async (req, res, next) => {
    try {
      const { classId } = req.params;
      const snapshot = await admin.firestore()
        .collection('fees')
        .where('classId', '==', classId)
        .get();
      
      const records = snapshot.docs.map(doc => doc.data());
      const totalDue = records.reduce((sum, r) => sum + (r.amountDue || 0), 0);
      const totalPaid = records.reduce((sum, r) => sum + (r.amountPaid || 0), 0);

      res.json({ 
        classId, 
        totalDue, 
        totalPaid, 
        pending: totalDue - totalPaid,
        records 
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/performance/:studentId', async (req, res, next) => {
    try {
      const { studentId } = req.params;
      const user = (req as any).user;

      if (!user.isAdmin && !user.permissions.managePerformance && user.uid !== studentId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const snapshot = await admin.firestore()
        .collection('performance')
        .where('studentId', '==', studentId)
        .get();
      
      const records = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          const dateA = a.uploadedAt?.toDate?.() || new Date(0);
          const dateB = b.uploadedAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
      res.json(records);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/performance/upload', checkPermission('managePerformance'), async (req, res, next) => {
    try {
      const { records } = req.body; // { studentId, subject, term, score, grade, classId }
      const batch = admin.firestore().batch();
      const uploadedBy = (req as any).user.uid;
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      for (const record of records) {
        const docRef = admin.firestore().collection('performance').doc();
        batch.set(docRef, {
          ...record,
          uploadedBy,
          uploadedAt: timestamp
        });
      }

      await batch.commit();
      res.status(201).json({ success: true, count: records.length });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/performance/report/:classId', checkPermission('managePerformance'), async (req, res, next) => {
    try {
      const { classId } = req.params;
      const snapshot = await admin.firestore()
        .collection('performance')
        .where('classId', '==', classId)
        .get();
      
      const records = snapshot.docs.map(doc => doc.data());
      
      // Calculate averages per subject
      const subjectStats: Record<string, { total: number, count: number }> = {};
      records.forEach(r => {
        if (!subjectStats[r.subject]) subjectStats[r.subject] = { total: 0, count: 0 };
        subjectStats[r.subject].total += (r.score || 0);
        subjectStats[r.subject].count++;
      });

      const analytics = Object.entries(subjectStats).map(([subject, stat]) => ({
        subject,
        average: Math.round(stat.total / stat.count)
      }));

      res.json({ classId, analytics, totalRecords: records.length });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/performance/ai-suggestions', async (req, res, next) => {
    try {
      const { studentId, records } = req.body;
      const user = (req as any).user;

      if (!user.isAdmin && !user.permissions.managePerformance && user.uid !== studentId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Placeholder for Gemini API integration
      // In a real implementation, we would format 'records' and prompt Gemini.
      const suggestions = [
        "Consistent effort in Math, but consider focusing more on Algebra fundamentals.",
        "Your Science scores are improving! Great job on the last practical.",
        "Based on your trends, participating in more group discussions could boost your Language Arts score."
      ];

      res.json({ suggestions, generatedAt: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  });

  // Chatbot
  app.post('/api/chatbot/query', async (req, res, next) => {
    try {
      const { query } = req.body;
      const user = (req as any).user;
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      // Fetch recent context (last 3 messages) to keep tokens low but allow multi-turn
      const historySnapshot = await admin.firestore()
        .collection('chatbotLogs')
        .where('userId', '==', user.uid)
        .orderBy('timestamp', 'desc')
        .limit(3)
        .get();
      
      const history = historySnapshot.docs
        .reverse()
        .map(doc => {
          const d = doc.data();
          return `User: ${d.query}\nAssistant: ${d.response}`;
        })
        .join('\n\n');

      // Fetch context data based on role
      let additionalContext = "";
      if (user.roles.includes('student')) {
        const assignments = await admin.firestore().collection('assignments')
          .where('classId', '==', user.classId)
          .limit(5).get();
        const titles = assignments.docs.map(d => d.data().title).join(", ");
        additionalContext = `Recent assignments: ${titles || "None"}.`;
      }

      // Context injection based on role
      const roleContexts: Record<string, string> = {
        student: `You are a helpful student assistant for Class ${user.classId}. ${additionalContext} Help with homework, explain concepts simply, and be encouraging.`,
        teacher: "You are a teacher's aide. Help with lesson planning, grading rubrics, and classroom management.",
        admin: "You are a school administration consultant. Provide insights on analytics and operations."
      };

      const systemPrompt = roleContexts[user.roles[0]] || "You are a helpful educational assistant.";
      
      const result = await ai.models.generateContent({
        model: "gemini-flash-latest", // Using Flash for cost-efficiency
        contents: [
          { 
            role: 'user', 
            parts: [{ text: `System Instruction: ${systemPrompt}\n\nRecent History:\n${history || "No previous history."}\n\nUser Query: ${query}` }] 
          }
        ],
        config: {
          maxOutputTokens: 500, // Limit response size to save costs
          temperature: 0.7
        }
      });

      const responseText = result.text;

      // Save to logs
      const logRef = await admin.firestore().collection('chatbotLogs').add({
        userId: user.uid,
        userName: user.displayName || 'User',
        role: user.roles[0],
        query,
        response: responseText,
        timestamp,
        feedback: null
      });

      res.json({ 
        id: logRef.id,
        response: responseText,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/chatbot/history/:userId', async (req, res, next) => {
    try {
      const { userId } = req.params;
      const user = (req as any).user;

      if (user.uid !== userId && !user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const snapshot = await admin.firestore()
        .collection('chatbotLogs')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/chatbot/feedback', async (req, res, next) => {
    try {
      const { logId, feedback } = req.body; // feedback: 'helpful' | 'not_helpful'
      await admin.firestore().collection('chatbotLogs').doc(logId).update({
        feedback,
        feedbackAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Health check
  app.get('/api/health', async (req, res, next) => {
    try {
      // 1. Check Firestore
      await admin.firestore().listCollections();
      
      // 2. Check Gemini API
      let aiStatus = 'ok';
      try {
        await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: [{ role: 'user', parts: [{ text: "health check" }] }]
        });
      } catch (e) {
        aiStatus = 'degraded';
        console.error('Gemini Health Check Failed:', e);
      }

      res.json({ 
        status: 'ok', 
        database: 'connected',
        ai: aiStatus,
        project: firebaseConfig.projectId,
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'error', 
        message: 'System check failed',
        error: (error as Error).message 
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Structured Logging for Cloud Logging
    const errorLog = {
      severity: 'ERROR',
      message: err.message || 'Internal Server Error',
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: (req as any).user?.uid,
      timestamp: new Date().toISOString()
    };
    
    console.error(JSON.stringify(errorLog));

    const status = err.status || 500;
    res.status(status).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
