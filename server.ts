import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  app.use(express.json());

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
  app.get('/api/announcements', async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/announcements', checkPermission('manageAnnouncements'), async (req, res) => {
    try {
      const { title, content, targetClasses, visibility } = req.body;
      const docRef = await admin.firestore().collection('announcements').add({
        title,
        content,
        targetClasses: targetClasses || ['all'],
        visibility: visibility || 'school',
        authorId: (req as any).user.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.status(201).json({ id: docRef.id, success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Attendance
  app.get('/api/attendance', checkPermission('manageAttendance'), async (req, res) => {
    try {
      const { classId, date } = req.query;
      let query: admin.firestore.Query = admin.firestore().collection('attendance');
      
      if (classId) query = query.where('classId', '==', classId);
      if (date) query = query.where('date', '==', date);
      
      const snapshot = await query.limit(100).get();
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/attendance/mark', checkPermission('manageAttendance'), async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/attendance/history/:studentId', async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/attendance/report/:classId', checkPermission('manageAttendance'), async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/assignments/:classId', async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/assignments/create', checkPermission('manageAssignments'), async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Submissions
  app.post('/api/assignments/submit', async (req, res) => {
    try {
      const { assignmentId, content, fileUrl } = req.body;
      const user = (req as any).user;
      
      const docId = `${assignmentId}_${user.uid}`;
      await admin.firestore().collection('submissions').doc(docId).set({
        assignmentId,
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        content,
        fileUrl: fileUrl || null,
        status: 'submitted',
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        grade: null,
        feedback: null
      }, { merge: true });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/assignments/submissions/:assignmentId', checkPermission('manageAssignments'), async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const snapshot = await admin.firestore()
        .collection('submissions')
        .where('assignmentId', '==', assignmentId)
        .get();
      
      const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/assignments/grade', checkPermission('manageAssignments'), async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/assignments/history/:studentId', async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Users Management (Staff/Admin only)
  app.get('/api/users', checkPermission('manageStudents'), async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Example API route: Set User Permissions (Financial Admin only)
  app.post('/api/roles', checkPermission('financialOps'), async (req, res) => {
    const { uid, roles, isAdmin, permissions } = req.body;
    try {
      await admin.auth().setCustomUserClaims(uid, { roles, isAdmin, permissions });
      await admin.firestore().collection('users').doc(uid).update({ roles, isAdmin, permissions });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/chat/conversations', async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/chat/send', async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/chat/messages/:conversationId', async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/library/resources', async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/library/upload', checkPermission('manageLibrary'), async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/library/borrow', async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/library/borrow/history/:studentId', async (req, res) => {
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/library/return', checkPermission('manageLibrary'), async (req, res) => {
    try {
      const { recordId } = req.body;
      await admin.firestore().collection('borrowRecords').doc(recordId).update({
        status: 'returned',
        returnedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Health check
  app.get('/api/health', async (req, res) => {
    try {
      // Basic check to see if Firestore is responsive
      await admin.firestore().listCollections();
      res.json({ 
        status: 'ok', 
        project: firebaseConfig.projectId,
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed',
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
