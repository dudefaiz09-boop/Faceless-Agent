import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { useAuth, handleFirestoreError, OperationType } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, Shield, Search, Plus, 
  Upload, History, X, Save, Trash2, 
  Filter, BookOpen, Briefcase, Clock, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';
import { useDebounce } from '../lib/hooks';

interface TeacherProfile {
  uid: string;
  displayName: string;
  email: string;
  roles: string[];
  subjects?: string[];
  classes?: string[];
  createdAt?: any;
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: any;
  performedBy: string;
}

export const TeachersPage = () => {
  const { user: currentUser, isAdmin, role: currentUserRole } = useAuth();
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherProfile | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    subjects: '',
    classes: '',
  });

  const [bulkText, setBulkText] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'users'), 
      where('roles', 'array-contains', 'teacher')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as TeacherProfile);
      setTeachers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, []);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/teachers/create', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          subjects: formData.subjects.split(',').map(s => s.trim()).filter(Boolean),
          classes: formData.classes.split(',').map(s => s.trim()).filter(Boolean),
        })
      });
      setIsAddModalOpen(false);
      setFormData({ email: '', password: '', displayName: '', subjects: '', classes: '' });
      alert('Teacher created successfully');
    } catch (error) {
      alert('Error creating teacher: ' + (error as Error).message);
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    try {
      await apiFetch(`/api/teachers/${selectedTeacher.uid}`, {
        method: 'PUT',
        body: JSON.stringify({
          displayName: formData.displayName,
          subjects: formData.subjects.split(',').map(s => s.trim()).filter(Boolean),
          classes: formData.classes.split(',').map(s => s.trim()).filter(Boolean),
        })
      });
      setSelectedTeacher(null);
      setFormData({ email: '', password: '', displayName: '', subjects: '', classes: '' });
      alert('Teacher updated successfully');
    } catch (error) {
      alert('Error updating teacher: ' + (error as Error).message);
    }
  };

  const handleDeleteTeacher = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) return;
    try {
      await apiFetch(`/api/teachers/${uid}`, { method: 'DELETE' });
      alert('Teacher deleted successfully');
    } catch (error) {
      alert('Error deleting teacher: ' + (error as Error).message);
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkText.trim().split('\n');
    const teachersToImport = lines.map(line => {
      const [email, displayName, subjects, classes, password] = line.split(',').map(s => s.trim());
      return { 
        email, 
        displayName, 
        subjects: subjects ? subjects.split(';').map(s => s.trim()) : [], 
        classes: classes ? classes.split(';').map(s => s.trim()) : [], 
        password 
      };
    });

    try {
      const result = await apiFetch('/api/teachers/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ teachers: teachersToImport })
      });
      setIsBulkModalOpen(false);
      setBulkText('');
      alert(`Import completed. Success: ${result.results.filter((r: any) => r.success).length}, Failed: ${result.results.filter((r: any) => !r.success).length}`);
    } catch (error) {
      alert('Bulk import failed: ' + (error as Error).message);
    }
  };

  const viewAuditLogs = async (teacherUid?: string) => {
    setIsAuditModalOpen(true);
    const q = query(
      collection(db, 'auditLogs'),
      teacherUid ? where('targetUid', '==', teacherUid) : orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAuditLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
    });

    return () => unsubscribe();
  };

  const filtered = teachers.filter(t => 
    t.displayName?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
    t.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    t.subjects?.some(s => s.toLowerCase().includes(debouncedSearch.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Faculty Management</h1>
          <p className="text-slate-500 font-medium mt-1 text-lg">Assign subjects, manage classes, and track staff activity.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => {
              setFormData({ email: '', password: '', displayName: '', subjects: '', classes: '' });
              setIsAddModalOpen(true);
            }}
            className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Plus size={20} />
            Add Teacher
          </button>
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Upload size={20} />
            Bulk Onboarding
          </button>
          <button 
            onClick={() => viewAuditLogs()}
            className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <History size={20} />
            Audit Logs
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          placeholder="Search by name, email, or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 pl-14 pr-6 py-4 rounded-3xl focus:ring-4 focus:ring-blue-100 outline-none text-base transition-all shadow-sm font-medium"
        />
      </div>

      {/* Teacher List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filtered.map((t) => (
            <motion.div 
              key={t.uid}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                <button 
                  onClick={() => {
                    setSelectedTeacher(t);
                    setFormData({ 
                      email: t.email, 
                      password: '', 
                      displayName: t.displayName, 
                      subjects: t.subjects?.join(', ') || '', 
                      classes: t.classes?.join(', ') || '' 
                    });
                  }}
                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 rounded-[24px] bg-slate-900 flex items-center justify-center text-white group-hover:bg-blue-600 transition-all duration-500 transform group-hover:-rotate-6">
                  <UserIcon size={32} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-black text-slate-900 truncate leading-tight">{t.displayName || 'Unnamed Teacher'}</h3>
                  <p className="text-sm text-slate-400 font-bold truncate tracking-wide">{t.email}</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <BookOpen size={10} /> Subjects
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.subjects?.map(s => (
                      <span key={s} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">{s}</span>
                    ))}
                    {(!t.subjects || t.subjects.length === 0) && <span className="text-xs text-slate-400 italic">None assigned</span>}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Briefcase size={10} /> Classes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.classes?.map(c => (
                      <span key={c} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">{c}</span>
                    ))}
                    {(!t.classes || t.classes.length === 0) && <span className="text-xs text-slate-400 italic">None assigned</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button 
                  onClick={() => viewAuditLogs(t.uid)}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                  <History size={14} />
                  History
                </button>
                <button 
                  onClick={() => handleDeleteTeacher(t.uid)}
                  className="px-4 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(isAddModalOpen || selectedTeacher) && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAddModalOpen(false); setSelectedTeacher(null); }} className="absolute inset-0 bg-black/40 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[48px] shadow-2xl overflow-hidden p-12"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-3xl font-black text-slate-900">{selectedTeacher ? 'Update Faculty' : 'Register Teacher'}</h3>
                  <p className="text-slate-500 font-medium mt-1">Manage core credentials and academic specialization.</p>
                </div>
                <button onClick={() => { setIsAddModalOpen(false); setSelectedTeacher(null); }} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={selectedTeacher ? handleUpdateTeacher : handleCreateTeacher} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">Full Name</label>
                    <input 
                      required value={formData.displayName}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                    />
                  </div>
                  {!selectedTeacher && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">Email</label>
                        <input 
                          type="email" required value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">Password</label>
                        <input 
                          type="password" required value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">Subjects (comma separated)</label>
                    <input 
                      value={formData.subjects}
                      onChange={(e) => setFormData({...formData, subjects: e.target.value})}
                      placeholder="e.g. Mathematics, Physics"
                      className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">Assigned Classes (comma separated)</label>
                    <input 
                      value={formData.classes}
                      onChange={(e) => setFormData({...formData, classes: e.target.value})}
                      placeholder="e.g. 10A, 10B, 11C"
                      className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-slate-900 text-white py-6 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
                    <Save size={20} />
                    {selectedTeacher ? 'Update Record' : 'Register Faculty'}
                  </button>
                  <button type="button" onClick={() => { setIsAddModalOpen(false); setSelectedTeacher(null); }} className="px-10 bg-slate-100 text-slate-500 py-6 rounded-[24px] font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-all">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBulkModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[48px] shadow-2xl overflow-hidden p-12"
            >
              <div className="space-y-2 mb-10">
                <h3 className="text-3xl font-black text-slate-900">Bulk Faculty Import</h3>
                <p className="text-slate-500 font-medium">Import large batches of staff using standardized CSV data.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Upload size={14} /> CSV Data (Email, Name, Subjects, Classes, Password)
                   </label>
                   <textarea
                     required rows={8}
                     value={bulkText}
                     onChange={(e) => setBulkText(e.target.value)}
                     placeholder="email, name, Math;Science, 10A;10B, Pass123!"
                     className="w-full bg-slate-50 border border-slate-100 p-8 rounded-[32px] outline-none focus:ring-4 focus:ring-blue-100 transition-all font-mono text-sm leading-relaxed"
                   />
                   <div className="p-6 bg-slate-900 rounded-3xl shadow-lg shadow-slate-100">
                     <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Note:</p>
                     <p className="text-sm text-white font-medium">Use semicolon (;) to separate multiple subjects or classes within a single field.</p>
                   </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={handleBulkImport} className="flex-1 bg-blue-600 text-white py-6 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Execute Import</button>
                  <button onClick={() => setIsBulkModalOpen(false)} className="px-10 bg-slate-100 text-slate-500 py-6 rounded-[24px] font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-all">Cancel</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Audit Logs Modal */}
      <AnimatePresence>
        {isAuditModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAuditModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/20">
                      <History size={28} />
                   </div>
                   <div>
                      <h3 className="text-2xl font-black">Staff Activity Logs</h3>
                      <p className="text-slate-400 font-medium">Verifiable history of administrative actions.</p>
                   </div>
                </div>
                <button onClick={() => setIsAuditModalOpen(false)} className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-4">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-6 rounded-3xl bg-white border border-slate-100 flex gap-6 items-start shadow-sm">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      log.action.includes('create') ? "bg-green-100 text-green-600" : 
                      log.action.includes('delete') ? "bg-red-100 text-red-600" : 
                      "bg-blue-100 text-blue-600"
                    )}>
                      {log.action.includes('create') ? <Plus size={20}/> : 
                       log.action.includes('delete') ? <Trash2 size={20}/> : 
                       <Clock size={20}/>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black uppercase tracking-widest text-blue-600">{log.action.replace('_', ' ')}</span>
                        <span className="text-xs font-bold text-slate-400">{log.timestamp?.toDate?.().toLocaleString() || 'Just now'}</span>
                      </div>
                      <p className="text-slate-900 font-bold text-lg leading-snug">{log.details}</p>
                      <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-2">
                        <UserIcon size={12}/> Executor UID: <span className="text-slate-900 font-bold">{log.performedBy}</span>
                      </p>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
                       <Clock size={40} className="text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold">No system activity captured yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Accessing Faculty Records...</p>
        </div>
      )}
    </div>
  );
};
