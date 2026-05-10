import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, where } from 'firebase/firestore';
import { useAuth, handleFirestoreError, OperationType } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Send, X, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';

interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  targetClasses: string[];
  visibility: string;
  createdAt: any;
}

export const AnnouncementsPage = () => {
  const { roles, isAdmin, user, classId } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetClassesInput, setTargetClassesInput] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let q;
    const isStudent = roles.includes('student');
    
    if (isStudent) {
      const studentTargets = ['all'];
      if (classId) studentTargets.push(classId);
      q = query(
        collection(db, 'announcements'), 
        where('targetClasses', 'array-contains-any', studentTargets),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'announcements');
    });

    return () => unsubscribe();
  }, [roles, classId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    setSubmitting(true);
    try {
      const targetClasses = targetClassesInput.split(',').map(s => s.trim()).filter(s => s !== '');
      await addDoc(collection(db, 'announcements'), {
        title,
        content,
        targetClasses: targetClasses.length > 0 ? targetClasses : ['all'],
        visibility: targetClasses.includes('all') ? 'school' : 'class',
        authorId: user?.uid,
        createdAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      setTitle('');
      setContent('');
      setTargetClassesInput('all');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'announcements');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `announcements/${id}`);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageHeader 
        title="Announcements" 
        description="Stay updated with the latest news and updates."
      >
        {isAdmin && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={20} />
            New Post
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <Card className="p-20 flex flex-col items-center justify-center text-center gap-4 border-dashed border-2">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
            <AlertCircle size={32} />
          </div>
          <p className="text-lg font-medium text-slate-600">No announcements yet.</p>
          <p className="text-slate-400 text-sm max-w-xs">When announcements are posted, they will appear here for everyone to see.</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          <AnimatePresence mode="popLayout">
            {announcements.map((ann, i) => (
              <motion.div 
                key={ann.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="group hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{ann.title}</h2>
                          {ann.targetClasses && (
                            <div className="flex gap-1">
                              {ann.targetClasses.map(tag => (
                                <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {ann.createdAt?.toDate().toLocaleDateString(undefined, { dateStyle: 'long' })}
                        </p>
                      </div>
                      {(isAdmin || ann.authorId === user?.uid) && (
                        <button 
                          onClick={() => handleDelete(ann.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {ann.content}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8 bg-blue-600 text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">New Announcement</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-8 space-y-6">
                <Input
                  label="Title"
                  autoFocus
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a catchy title..."
                />
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Content</label>
                  <textarea 
                    required
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Provide the details here. You can use markdown."
                    className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all resize-none placeholder:text-slate-400"
                  />
                </div>

                <Input
                  label="Target Classes"
                  value={targetClassesInput}
                  onChange={(e) => setTargetClassesInput(e.target.value)}
                  placeholder="e.g. all, 10A, 9B"
                />
                <p className="text-[10px] text-slate-400 font-medium -mt-4">Use &apos;all&apos; for school-wide, or comma-separated class IDs.</p>
                
                <Button 
                  type="submit"
                  disabled={submitting}
                  isLoading={submitting}
                  className="w-full py-4"
                >
                  <Send size={20} />
                  Post Announcement
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
