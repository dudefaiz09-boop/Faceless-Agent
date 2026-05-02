import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Send, X, AlertCircle, FileText, 
  Calendar as CalendarIcon, Users, CheckCircle2, 
  Clock, MessageSquare, GraduationCap, ChevronRight,
  UploadCloud, ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  classId: string;
  attachments: string[];
  createdAt: any;
}

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  content: string;
  fileUrl: string | null;
  status: 'submitted' | 'graded';
  submittedAt: any;
  grade: string | null;
  feedback: string | null;
}

export const AssignmentsPage = () => {
  const { user, isStudent, canManageAssignments, classId: userClassId } = useAuth();
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedClass, setSelectedClass] = useState(userClassId || '10A');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Creation Form State
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDate: format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd'),
    classId: selectedClass
  });

  // Submission/Grading View State
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradingState, setGradingState] = useState<{studentId: string, grade: string, feedback: string} | null>(null);
  
  // Student Submission Form
  const [submissionContent, setSubmissionContent] = useState('');
  const [mySubmissions, setMySubmissions] = useState<Record<string, Submission>>({});

  useEffect(() => {
    loadAssignments();
    if (isStudent) {
      loadMyHistory();
    }
  }, [selectedClass, user?.uid]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/assignments/${selectedClass}`);
      setAssignments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyHistory = async () => {
    try {
      const data = await apiFetch(`/api/assignments/history/${user?.uid}`);
      const map: Record<string, Submission> = {};
      data.forEach((s: Submission) => map[s.assignmentId] = s);
      setMySubmissions(map);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/assignments/create', {
        method: 'POST',
        body: JSON.stringify(newAssignment)
      });
      setIsModalOpen(false);
      loadAssignments();
      setNewAssignment({...newAssignment, title: '', description: ''});
    } catch (error) {
      alert('Failed to create assignment');
    }
  };

  const viewSubmissions = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    try {
      const data = await apiFetch(`/api/assignments/submissions/${assignment.id}`);
      setSubmissions(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGrade = async () => {
    if (!gradingState || !selectedAssignment) return;
    try {
      await apiFetch('/api/assignments/grade', {
        method: 'POST',
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          ...gradingState
        })
      });
      setGradingState(null);
      viewSubmissions(selectedAssignment);
    } catch (error) {
      alert('Grading failed');
    }
  };

  const submitAssignment = async (assignmentId: string) => {
    try {
      await apiFetch('/api/assignments/submit', {
        method: 'POST',
        body: JSON.stringify({
          assignmentId,
          content: submissionContent
        })
      });
      setSubmissionContent('');
      setSelectedAssignment(null);
      loadMyHistory();
    } catch (error) {
      alert('Submission failed');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Assignments</h1>
          <p className="text-slate-500 mt-1">
            {isStudent ? 'Track your coursework and submit your work.' : 'Manage assignments and grade student submissions.'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {!isStudent && (
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-white border border-slate-200 px-4 py-3 rounded-2xl font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="10A">Class 10A</option>
              <option value="10B">Class 10B</option>
              <option value="9A">Class 9A</option>
            </select>
          )}
          {canManageAssignments && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Plus size={20} />
              Create
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assignment List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : assignments.length === 0 ? (
            <div className="bg-white p-20 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center gap-4 text-center">
               <FileText size={48} className="text-slate-200" />
               <p className="text-slate-500 font-medium">No assignments posted for this class.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {assignments.map((assignment) => {
                const mySub = mySubmissions[assignment.id];
                return (
                  <motion.div 
                    key={assignment.id}
                    layoutId={assignment.id}
                    onClick={() => canManageAssignments ? viewSubmissions(assignment) : setSelectedAssignment(assignment)}
                    className={cn(
                      "bg-white p-6 rounded-3xl border transition-all cursor-pointer group",
                      selectedAssignment?.id === assignment.id ? "border-blue-500 shadow-xl shadow-blue-50" : "border-slate-100 hover:border-blue-200 shadow-sm"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{assignment.title}</h3>
                           {isStudent && mySub && (
                             <span className={cn(
                               "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                               mySub.status === 'graded' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                             )}>
                               {mySub.status}
                             </span>
                           )}
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1"><CalendarIcon size={12}/> Due {assignment.dueDate}</span>
                          <span className="flex items-center gap-1"><Users size={12}/> {assignment.classId}</span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-all" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Details / Submission / Grading Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {!selectedAssignment ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-slate-50 border border-slate-100 p-8 rounded-3xl text-center flex flex-col items-center gap-4 h-full min-h-[400px] justify-center"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-200 shadow-sm">
                   <GraduationCap size={32} />
                </div>
                <p className="text-slate-400 font-medium max-w-[200px]">Select an assignment to view details and {isStudent ? 'submit work' : 'grade submissions'}.</p>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedAssignment.id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-lg space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">{selectedAssignment.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{selectedAssignment.description}</p>
                </div>

                {isStudent ? (
                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    {mySubmissions[selectedAssignment.id] ? (
                      <div className="space-y-4">
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">My Submission</p>
                          <p className="text-sm text-emerald-800">{mySubmissions[selectedAssignment.id].content}</p>
                        </div>
                        {mySubmissions[selectedAssignment.id].grade && (
                          <div className="bg-blue-600 p-6 rounded-2xl text-white">
                             <p className="text-xs font-bold uppercase opacity-60 mb-1">Grade Received</p>
                             <p className="text-3xl font-black mb-2">{mySubmissions[selectedAssignment.id].grade}</p>
                             <p className="text-sm font-medium italic opacity-90">"{mySubmissions[selectedAssignment.id].feedback}"</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Answer</label>
                         <textarea 
                           rows={5}
                           placeholder="Type your submission here..."
                           value={submissionContent}
                           onChange={(e) => setSubmissionContent(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                         />
                         <button 
                           onClick={() => submitAssignment(selectedAssignment.id)}
                           className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                         >
                           <Send size={18} />
                           Submit Work
                         </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 pt-4 border-t border-slate-50">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Users size={18} className="text-blue-600" />
                      Submissions ({submissions.length})
                    </h4>
                    
                    <div className="space-y-3">
                      {submissions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No submissions yet.</p>
                      ) : (
                        submissions.map(sub => (
                          <div key={sub.studentId} className="bg-slate-50 p-4 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                               <p className="font-bold text-slate-900 text-sm">{sub.studentName}</p>
                               <span className={cn(
                                 "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                                 sub.status === 'graded' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                               )}>
                                 {sub.status}
                               </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2 italic">"{sub.content}"</p>
                            
                            {gradingState?.studentId === sub.studentId ? (
                              <div className="pt-2 space-y-2">
                                <input 
                                  placeholder="Grade (e.g. A+)"
                                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm outline-none"
                                  onChange={(e) => setGradingState({...gradingState, grade: e.target.value})}
                                />
                                <input 
                                  placeholder="Feedback..."
                                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm outline-none"
                                  onChange={(e) => setGradingState({...gradingState, feedback: e.target.value})}
                                />
                                <div className="flex gap-2">
                                  <button onClick={handleGrade} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold">Save</button>
                                  <button onClick={() => setGradingState(null)} className="px-4 bg-slate-200 py-2 rounded-xl text-xs font-bold text-slate-500">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setGradingState({studentId: sub.studentId, grade: sub.grade || '', feedback: sub.feedback || ''})}
                                className="w-full text-xs font-bold text-blue-600 hover:text-blue-700 text-left flex items-center gap-1"
                              >
                                {sub.status === 'graded' ? 'Edit Grade' : 'Grade Submission'} <ChevronRight size={12} />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden p-8 space-y-6">
               <h3 className="text-2xl font-bold text-slate-900">Create Assignment</h3>
               <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Title</label>
                    <input 
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100" 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Description</label>
                    <textarea 
                      rows={4}
                      value={newAssignment.description}
                      onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100" 
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Due Date</label>
                       <input 
                         type="date"
                         value={newAssignment.dueDate}
                         onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl outline-none" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Class</label>
                       <select 
                         value={newAssignment.classId}
                         onChange={(e) => setNewAssignment({...newAssignment, classId: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl outline-none"
                       >
                         <option value="10A">10A</option>
                         <option value="10B">10B</option>
                       </select>
                    </div>
                 </div>
               </div>
               <div className="flex gap-3">
                 <button onClick={handleCreate} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all">Create Assignment</button>
                 <button onClick={() => setIsModalOpen(false)} className="px-6 bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
