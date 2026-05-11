import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, Upload, Download, History, 
  AlertCircle, TrendingUp, Users,
  DollarSign, Search,
  PieChart as PieChartIcon, FileText, Send
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

interface FeeRecord {
  id: string;
  studentId: string;
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'partial';
  uploadedAt: { toDate: () => Date } | string | number | null;
}

interface PaymentRecord {
  id: string;
  feeId: string;
  amount: number;
  paidAt: { toDate: () => Date } | string | number | null;
  method: string;
  receiptUrl: string;
}

interface FeeReport {
  totalPaid: number;
  pending: number;
  totalDue: number;
  records: Array<{
    studentId: string;
    amountDue: number;
    amountPaid: number;
    status: string;
  }>;
}

export const FeesPage = () => {
  const { user, isStudent, canManageFees, classId: userClassId } = useAuth();
  
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [report, setReport] = useState<FeeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'summary' | 'management' | 'reports'>(
    canManageFees ? 'management' : 'summary'
  );

  // Management State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadText, setUploadData] = useState('');
  const [selectedClass, setSelectedClass] = useState(userClassId || '10A');

  const loadStudentData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/fees/${user?.uid}`);
      setFees(data.fees);
      setPayments(data.payments);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadReport = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/fees/report/${selectedClass}`);
      setReport(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    const init = async () => {
      if (isStudent) {
        await loadStudentData();
      } else if (canManageFees) {
        await loadReport();
      }
    };
    init();
  }, [isStudent, canManageFees, loadStudentData, loadReport]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Basic CSV-like simulation: studentId, amount, dueDate
      const lines = uploadText.split('\n').filter(l => l.trim() !== '');
      const records = lines.map(line => {
        const [studentId, amountDue, dueDate] = line.split(',').map(s => s.trim());
        return { studentId, amountDue: parseFloat(amountDue), dueDate, classId: selectedClass };
      });

      await apiFetch('/api/fees/upload', {
        method: 'POST',
        body: JSON.stringify({ records })
      });
      setIsUploadModalOpen(false);
      setUploadData('');
      loadReport();
    } catch {
      alert('Upload failed');
    }
  };

  const processPayment = async (feeId: string, amount: number) => {
    try {
      await apiFetch('/api/fees/pay', {
        method: 'POST',
        body: JSON.stringify({ feeId, amount, method: 'online' })
      });
      alert('Payment successful!');
      loadStudentData();
    } catch {
      alert('Payment failed');
    }
  };

  const totalDue = fees.reduce((sum, f) => sum + f.amountDue, 0);
  const totalPaid = fees.reduce((sum, f) => sum + f.amountPaid, 0);

  const reportStats = report ? [
    { name: 'Paid', value: report.totalPaid, color: '#10b981' },
    { name: 'Pending', value: report.pending, color: '#ef4444' }
  ] : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financial Management</h1>
          <p className="text-slate-500 mt-1 text-lg">
            {isStudent ? 'Track your fee status and make secure payments.' : 'Monitor academy revenue and manage student dues.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {canManageFees && (
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setView('management')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", view === 'management' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
              >
                Overview
              </button>
              <button 
                onClick={() => setView('reports')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", view === 'reports' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
              >
                Analytics
              </button>
            </div>
          )}
          {canManageFees && (
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Upload size={20} />
              Import Data
            </button>
          )}
        </div>
      </div>

      {isStudent ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Student Sidebar: Quick Summary */}
           <div className="space-y-6">
              <div className="bg-blue-600 p-8 rounded-[32px] text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                 <div className="relative z-10 space-y-6">
                    <div>
                      <p className="text-blue-100 text-xs font-black uppercase tracking-widest mb-1">Total Outstanding</p>
                      <h3 className="text-5xl font-black">${totalDue - totalPaid}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <p className="text-blue-100 text-[10px] font-black uppercase mb-1">Paid</p>
                         <p className="text-xl font-bold">${totalPaid}</p>
                       </div>
                       <div>
                         <p className="text-blue-100 text-[10px] font-black uppercase mb-1">Due Date</p>
                         <p className="text-xl font-bold">May 15</p>
                       </div>
                    </div>
                    <button className="w-full bg-white text-blue-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-50 transition-colors">
                       Pay Now
                    </button>
                 </div>
                 <CreditCard className="absolute -bottom-6 -right-6 w-32 h-32 text-blue-500 opacity-20 rotate-12" />
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                 <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <History size={18} className="text-blue-600" />
                    Recent Payments
                 </h4>
                 <div className="space-y-3">
                    {payments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No payments recorded yet.</p>
                    ) : payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                         <div>
                            <p className="font-bold text-slate-900 text-sm">${p.amount}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{p.paidAt?.toDate().toLocaleDateString()}</p>
                         </div>
                         <button onClick={() => window.open(p.receiptUrl, '_blank')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Download size={16} />
                         </button>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Main Student Content: Fee Detailed List */}
           <div className="lg:col-span-2 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Fee Breakdown</h2>
              {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
              ) : fees.length === 0 ? (
                <div className="bg-white p-20 rounded-3xl border border-dashed border-slate-200 text-center">
                   <p className="text-slate-400 font-medium">No fee records found for your account.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                   {fees.map(fee => (
                     <div key={fee.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all">
                        <div className="flex items-center gap-6">
                           <div className={cn(
                             "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                             fee.status === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                           )}>
                              <DollarSign size={24} />
                           </div>
                           <div>
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Quarterly Tuition Fee</p>
                              <div className="flex items-center gap-3">
                                 <h3 className="text-xl font-bold text-slate-900">${fee.amountDue}</h3>
                                 <span className={cn(
                                   "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                                   fee.status === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                 )}>
                                   {fee.status}
                                 </span>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right hidden sm:block">
                              <p className="text-[10px] font-black text-slate-400 uppercase">Due Date</p>
                              <p className="font-bold text-slate-700">{fee.dueDate}</p>
                           </div>
                           {fee.status !== 'paid' && (
                             <button 
                               onClick={() => processPayment(fee.id, fee.amountDue - fee.amountPaid)}
                               className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                             >
                               Pay
                             </button>
                           )}
                        </div>
                     </div>
                   ))}
                </div>
              )}
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           {/* Staff Sidebar */}
           <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                 <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Users size={14} />
                       Filter Class
                    </label>
                    <select 
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl outline-none font-bold text-slate-700"
                    >
                       <option value="10A">Class 10A</option>
                       <option value="10B">Class 10B</option>
                       <option value="9A">Class 9A</option>
                    </select>
                 </div>
                 <div className="pt-4 border-t border-slate-50 space-y-2">
                    <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                       <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600">Download Excel</span>
                       <Download size={16} className="text-slate-400" />
                    </button>
                    <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                       <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600">Send Reminders</span>
                       <Send size={16} className="text-slate-400" />
                    </button>
                 </div>
              </div>

              {report && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                   <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp size={18} className="text-emerald-600" />
                      Class Revenue
                   </h4>
                   <div className="space-y-3">
                      <div className="flex justify-between items-center">
                         <span className="text-sm text-slate-500 font-medium">Collected</span>
                         <span className="font-bold text-emerald-600">${report.totalPaid}</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-sm text-slate-500 font-medium">Pending</span>
                         <span className="font-bold text-red-600">${report.pending}</span>
                      </div>
                      <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                         <span className="text-sm font-black text-slate-900 uppercase">Total Target</span>
                         <span className="font-black text-blue-600">${report.totalDue}</span>
                      </div>
                   </div>
                </div>
              )}
           </div>

           {/* Staff Main Content */}
           <div className="lg:col-span-3 space-y-6">
              {view === 'management' ? (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                   <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-900">Student Fee Records</h3>
                      <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                         <input className="bg-slate-50 border-none pl-10 pr-4 py-2 rounded-xl text-sm outline-none w-64" placeholder="Search student ID..." />
                      </div>
                   </div>
                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                         <thead>
                            <tr className="bg-slate-50/50">
                               <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student ID</th>
                               <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Due</th>
                               <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Paid</th>
                               <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {loading ? (
                               <tr><td colSpan={4} className="p-20 text-center text-slate-400">Loading data...</td></tr>
                            ) : !report?.records || report.records.length === 0 ? (
                               <tr><td colSpan={4} className="p-20 text-center text-slate-400">No records for this class.</td></tr>
                            ) : report.records.map((r: any, i: number) => (
                               <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                                  <td className="px-8 py-4 font-bold text-slate-700">{r.studentId}</td>
                                  <td className="px-8 py-4 font-black text-slate-900 text-right">${r.amountDue}</td>
                                  <td className="px-8 py-4 font-black text-emerald-600 text-right">${r.amountPaid}</td>
                                  <td className="px-8 py-4 text-center">
                                     <span className={cn(
                                       "text-[9px] font-black uppercase px-2 py-1 rounded-full",
                                       r.status === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                     )}>
                                       {r.status}
                                     </span>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
              ) : (
                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[300px]">
                         <h4 className="font-bold text-slate-900 mb-6">Payment Distribution</h4>
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reportStats}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                               <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                               <Tooltip cursor={{fill: '#f8fafc'}} />
                               <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                  {reportStats.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                               </Bar>
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                         <h4 className="font-bold text-slate-900">Collection Insights</h4>
                         <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600"><PieChartIcon size={20}/></div>
                                  <span className="text-sm font-bold text-slate-600">Collection Rate</span>
                               </div>
                               <span className="text-xl font-black text-slate-900">
                                  {report ? Math.round((report.totalPaid / report.totalDue) * 100) : 0}%
                               </span>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600"><AlertCircle size={20}/></div>
                                  <span className="text-sm font-bold text-slate-600">Overdue Count</span>
                               </div>
                               <span className="text-xl font-black text-red-600">
                                  {report?.records.filter((r: any) => r.status !== 'paid').length || 0}
                               </span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUploadModalOpen(false)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden p-10 space-y-8"
            >
               <div className="space-y-2">
                 <h3 className="text-3xl font-black text-slate-900">Import Fee Data</h3>
                 <p className="text-slate-500 font-medium leading-relaxed">Bulk upload student fee records for <span className="text-blue-600 font-bold">Class {selectedClass}</span>.</p>
               </div>
               <form onSubmit={handleUpload} className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <FileText size={14} />
                       Paste CSV Records
                    </label>
                    <textarea 
                      required rows={8}
                      value={uploadText}
                      onChange={(e) => setUploadData(e.target.value)}
                      placeholder="studentId, amountDue, yyyy-mm-dd&#10;user_uid_1, 5000, 2026-05-30&#10;user_uid_2, 4500, 2026-06-15"
                      className="w-full bg-slate-50 border border-slate-200 p-6 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-mono text-xs leading-relaxed" 
                    />
                    <p className="text-[10px] text-slate-400 font-bold uppercase text-center tracking-wider">Format: UID, Amount, DueDate (one per line)</p>
                 </div>
                 <div className="flex gap-4">
                   <button type="submit" className="flex-1 bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Import Records</button>
                   <button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-8 bg-slate-100 text-slate-500 py-5 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-all">Cancel</button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
