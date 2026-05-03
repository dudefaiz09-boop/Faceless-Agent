import express from 'express';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import admin from 'firebase-admin';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const _dirname = process.cwd();

// Startup Validation
const REQUIRED_ENV = ['GEMINI_API_KEY'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`CRITICAL: Missing required environment variables: ${missingEnv.join(', ')}`);
  if (process.env.NODE_ENV !== 'test') process.exit(1);
}

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "mock-key" });

let firebaseConfig: any = { projectId: 'mock-project' };
try {
  const configPath = path.join(_dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    console.warn('Firebase config file not found, using mock for tests');
  }
} catch (error) {
  console.error('Error loading Firebase config:', error);
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

const app = express();

// Security and Performance Middleware
app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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

const checkPermission = (perm: string) => (req: any, res: any, next: any) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.isAdmin || (user.permissions && user.permissions[perm])) {
    return next();
  }
  res.status(403).json({ 
    error: 'Forbidden', 
    message: `Missing required permission: ${perm}`,
    userRole: user.roles
  });
};

// --- API Routes ---

app.get('/api/announcements', async (req, res, next) => {
  try {
    const user = (req as any).user;
    let query: admin.firestore.Query = db.collection('announcements');
    if (user && user.roles.includes('student')) {
      const studentClasses = ['all'];
      if (user.classId) studentClasses.push(user.classId);
      query = query.where('targetClasses', 'array-contains-any', studentClasses);
    }
    const snapshot = await query.get();
    const announcements = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
    res.json(announcements);
  } catch (error) {
    next(error);
  }
});

app.post('/api/announcements', checkPermission('manageAnnouncements'), async (req, res, next) => {
  try {
    const { title, content, targetClasses, visibility } = req.body;
    const docRef = await db.collection('announcements').add({
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

app.get('/api/attendance', checkPermission('manageAttendance'), async (req, res, next) => {
  try {
    const { classId, date } = req.query;
    let query: admin.firestore.Query = db.collection('attendance');
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
    const { classId, date, records } = req.body;
    const batch = db.batch();
    const markedBy = (req as any).user.uid;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    for (const record of records) {
      const docId = `${classId}_${record.studentId}_${date}`;
      const docRef = db.collection('attendance').doc(docId);
      batch.set(docRef, {
        classId, studentId: record.studentId, date, status: record.status, markedBy, updatedAt: timestamp
      }, { merge: true });
    }
    await batch.commit();
    res.json({ success: true, count: records.length });
  } catch (error) {
    next(error);
  }
});

app.post('/api/assignments/submit', async (req, res, next) => {
  try {
    const { assignmentId, content, fileUrl } = req.body;
    const user = (req as any).user;
    const docId = `${assignmentId}_${user.uid}`;
    const existingDoc = await db.collection('submissions').doc(docId).get();
    const existingData = existingDoc.data();

    if (existingData && existingData.checkedByAI && existingData.content === content && existingData.fileUrl === fileUrl) {
      return res.json({ success: true, cached: true, aiResult: { score: existingData.aiScore, feedback: existingData.aiFeedback } });
    }

    await db.collection('submissions').doc(docId).set({
      assignmentId, studentId: user.uid, studentName: user.displayName || 'Student',
      content, fileUrl: fileUrl || null, status: 'submitted',
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      grade: null, feedback: null, aiScore: null, aiFeedback: null, checkedByAI: false, recheckedByTeacher: false
    }, { merge: true });

    try {
      const promptText = `Evaluate: ${content}. Score out of 10 and feedback in JSON: {"score": number, "feedback": "string"}`;
      const result = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [{ role: 'user', parts: [{ text: promptText }] }]
      });
      const aiResult = JSON.parse(result.text.replace(/```json|```/g, "").trim());
      await db.collection('submissions').doc(docId).update({
        aiScore: aiResult.score, aiFeedback: aiResult.feedback, checkedByAI: true,
        grade: aiResult.score.toString(), feedback: aiResult.feedback
      });
      res.json({ success: true, aiResult });
    } catch (aiError) {
      res.json({ success: true, aiError: 'AI offline' });
    }
  } catch (error) {
    next(error);
  }
});

app.post('/api/chatbot/query', async (req, res, next) => {
  try {
    const { query } = req.body;
    const user = (req as any).user;
    const historySnapshot = await db.collection('chatbotLogs').where('userId', '==', user.uid).orderBy('timestamp', 'desc').limit(3).get();
    const history = historySnapshot.docs.reverse().map(doc => `User: ${doc.data().query}\nAssistant: ${doc.data().response}`).join('\n\n');
    
    const roleContexts: any = { student: "Help with homework.", teacher: "Help with lessons.", admin: "Help with ops." };
    const systemPrompt = roleContexts[user.roles[0]] || "Helpful assistant.";
    
    const result = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ role: 'user', parts: [{ text: `SI: ${systemPrompt}\nHistory: ${history}\nQuery: ${query}` }] }],
      config: { maxOutputTokens: 500, temperature: 0.7 }
    });

    const responseText = result.text;
    const logRef = await db.collection('chatbotLogs').add({
      userId: user.uid, userName: user.displayName || 'User', role: user.roles[0],
      query, response: responseText, timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ id: logRef.id, response: responseText, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await db.listCollections();
    res.json({ status: 'ok', database: 'connected', environment: process.env.NODE_ENV || 'development' });
  } catch (error) {
    res.status(500).json({ status: 'error', error: (error as Error).message });
  }
});

// Vite & Static
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.status(404).send('Not Found');
    }
  });
}

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(JSON.stringify({ severity: 'ERROR', message: err.message, stack: err.stack }));
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal Error' : err.message });
});

async function startServer() {
  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
