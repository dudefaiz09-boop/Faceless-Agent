import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, Search, Plus, Download, BookOpen, 
  Tag, Clock, Filter,
  Layers, GraduationCap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useDebounce } from '../lib/hooks';

interface LibraryResource {
  id: string;
  title: string;
  subject: string;
  grade: string;
  fileUrl: string;
  tags: string[];
  uploadedAt: any;
}

interface BorrowRecord {
  id: string;
  resourceId: string;
  studentId: string;
  studentName: string;
  borrowedAt: any;
  status: 'borrowed' | 'returned';
  returnedAt: any;
}

export const LibraryPage = () => {
  const { isStudent, canManageLibrary, user } = useAuth();
  
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [borrowHistory, setBorrowHistory] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'catalog' | 'my-books'>('catalog');
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload Form
  const [uploadData, setUploadData] = useState({
    title: '',
    subject: '',
    grade: '',
    fileUrl: '',
    tags: ''
  });

  const loadResources = useCallback(async () => {
    try {
      const data = await apiFetch('/api/library/resources', {
        cacheTTL: 5 * 60 * 1000 // 5 minutes cache
      });
      setResources(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyHistory = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/library/borrow/history/${user?.uid}`);
      setBorrowHistory(data);
    } catch (error) {
      console.error(error);
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      await loadResources();
      if (isStudent) {
        await loadMyHistory();
      }
    };
    init();
  }, [isStudent, loadResources, loadMyHistory]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/api/library/upload', {
        method: 'POST',
        body: JSON.stringify({
          ...uploadData,
          tags: uploadData.tags.split(',').map(t => t.trim()).filter(t => t !== '')
        })
      });
      setIsUploadModalOpen(false);
      loadResources();
      setUploadData({ title: '', subject: '', grade: '', fileUrl: '', tags: '' });
    } catch {
      alert('Upload failed');
    }
  };

  const borrowBook = async (resourceId: string) => {
    try {
      await apiFetch('/api/library/borrow', {
        method: 'POST',
        body: JSON.stringify({ resourceId })
      });
      alert('Book borrowed successfully!');
      loadMyHistory();
    } catch {
      alert('Borrowing failed');
    }
  };

  const returnBook = async (recordId: string) => {
    try {
      await apiFetch('/api/library/return', {
        method: 'POST',
        body: JSON.stringify({ recordId })
      });
      loadMyHistory();
      if (canManageLibrary) {
        // Refresh all if admin/teacher
      }
    } catch {
      alert('Return failed');
    }
  };

  const subjects = ['All', ...new Set(resources.map(r => r.subject))];
  
  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                          r.tags.some(t => t.toLowerCase().includes(debouncedSearch.toLowerCase()));
    const matchesSubject = selectedSubject === 'All' || r.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Academic Library</h1>
          <p className="text-slate-500 mt-1 text-lg">Access eBooks, research papers, and study materials.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {isStudent && (
            <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
              <button 
                onClick={() => setView('catalog')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", view === 'catalog' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
              >
                Catalog
              </button>
              <button 
                onClick={() => setView('my-books')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", view === 'my-books' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
              >
                My Library
              </button>
            </div>
          )}
          {canManageLibrary && (
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Plus size={20} />
              Add Resource
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className="lg:w-64 space-y-6 shrink-0">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="space-y-3">
               <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Search size={14} />
                 Search
               </label>
               <input 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 placeholder="Title, tags..."
                 className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 text-sm font-medium"
               />
            </div>

            <div className="space-y-3">
               <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Filter size={14} />
                 Subject
               </label>
               <div className="space-y-1">
                 {subjects.map(s => (
                   <button
                     key={s}
                     onClick={() => setSelectedSubject(s)}
                     className={cn(
                       "w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-all",
                       selectedSubject === s ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"
                     )}
                   >
                     {s}
                   </button>
                 ))}
               </div>
            </div>
          </div>

          <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-100 space-y-4 relative overflow-hidden">
             <div className="relative z-10">
               <h4 className="font-bold text-lg mb-2">Need a book?</h4>
               <p className="text-blue-100 text-sm leading-relaxed">If you can&apos;t find what you&apos;re looking for, request a resource from the librarian.</p>
               <button className="mt-4 text-xs font-black uppercase tracking-widest bg-white text-blue-600 px-4 py-2 rounded-lg">Request Book</button>
             </div>
             <Book className="absolute -bottom-4 -right-4 w-24 h-24 text-blue-500 opacity-30 rotate-12" />
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="flex-1">
          {view === 'catalog' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full py-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
              ) : filteredResources.length === 0 ? (
                <div className="col-span-full bg-white p-20 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center gap-4 text-center">
                   <BookOpen size={48} className="text-slate-200" />
                   <p className="text-slate-400 font-medium">No resources found in the library.</p>
                </div>
              ) : filteredResources.map((res, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={res.id}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                       <Book size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                      {res.subject}
                    </span>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">{res.title}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {res.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                           <Tag size={10} /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                       <GraduationCap size={14} />
                       Grade {res.grade}
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => window.open(res.fileUrl, '_blank')}
                         className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                       >
                         <Download size={18} />
                       </button>
                       {isStudent && (
                         <button 
                           onClick={() => borrowBook(res.id)}
                           className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                           title="Borrow Physical Book"
                         >
                           <Layers size={18} />
                         </button>
                       )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
               <h2 className="text-xl font-bold text-slate-900">Borrowing History</h2>
               <div className="grid gap-4">
                 {borrowHistory.length === 0 ? (
                   <div className="bg-white p-20 rounded-3xl text-center text-slate-400 border border-slate-100">
                      No borrowing history found.
                   </div>
                 ) : borrowHistory.map((record) => (
                   <div key={record.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                          record.status === 'borrowed' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                           <Clock size={18} />
                        </div>
                        <div>
                           <p className="font-bold text-slate-900">Resource ID: {record.resourceId.slice(-6)}</p>
                           <p className="text-xs text-slate-400">Borrowed: {record.borrowedAt?.toDate().toLocaleDateString()}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className={cn(
                          "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                          record.status === 'borrowed' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {record.status}
                        </span>
                        {canManageLibrary && record.status === 'borrowed' && (
                          <button 
                            onClick={() => returnBook(record.id)}
                            className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl"
                          >
                            Mark Returned
                          </button>
                        )}
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUploadModalOpen(false)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden p-8 space-y-6"
            >
               <h3 className="text-2xl font-bold text-slate-900">Add Library Resource</h3>
               <form onSubmit={handleUpload} className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Title</label>
                   <input 
                     required value={uploadData.title}
                     onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                     className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none" 
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Subject</label>
                      <input 
                        required value={uploadData.subject}
                        onChange={(e) => setUploadData({...uploadData, subject: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none" 
                        placeholder="e.g. Science"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Grade</label>
                      <input 
                        required value={uploadData.grade}
                        onChange={(e) => setUploadData({...uploadData, grade: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none" 
                        placeholder="e.g. 10"
                      />
                    </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest">File URL</label>
                   <input 
                     required value={uploadData.fileUrl}
                     onChange={(e) => setUploadData({...uploadData, fileUrl: e.target.value})}
                     className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none" 
                     placeholder="https://..."
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tags (comma separated)</label>
                   <input 
                     value={uploadData.tags}
                     onChange={(e) => setUploadData({...uploadData, tags: e.target.value})}
                     className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none" 
                     placeholder="physics, chapter-1, 2024"
                   />
                 </div>
                 <div className="flex gap-3 pt-4">
                   <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all">Upload Resource</button>
                   <button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-6 bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
