import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, where } from 'firebase/firestore';
import { useAuth, handleFirestoreError, OperationType } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Send, X, AlertCircle, Users } from 'lucide-react';

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Announcements</h1>
          <p className="text-slate-500 mt-1 text-lg">Stay updated with the latest news and updates.</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={20} />
            New Post
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white p-20 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
            <AlertCircle size={32} />
          </div>
          <p className="text-lg font-medium text-slate-600">No announcements yet.</p>
          <p className="text-slate-400 text-sm max-w-xs">When announcements are posted, they will appear here for everyone to see.</p>
        </div>
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
                className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 group"
              >
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
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Title</label>
                  <input 
                    autoFocus
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a catchy title..."
                    className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
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

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Users size={14} />
                    Target Classes
                  </label>
                  <input 
                    value={targetClassesInput}
                    onChange={(e) => setTargetClassesInput(e.target.value)}
                    placeholder="e.g. all, 10A, 9B"
                    className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">Use 'all' for school-wide, or comma-separated class IDs.</p>
                </div>
                
                <button 
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Posting...' : (
                    <>
                      <Send size={20} />
                      Post Announcement
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
