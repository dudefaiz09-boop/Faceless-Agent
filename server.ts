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

      const snapshot = await query.orderBy('createdAt', 'desc').limit(50).get();
      const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      const snapshot = await admin.firestore().collection('attendance').limit(100).get();
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(records);
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
