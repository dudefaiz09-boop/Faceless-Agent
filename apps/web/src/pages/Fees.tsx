import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { feesService } from '../lib/api-client';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Upload,
  Download,
  History,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign,
  PieChart as PieChartIcon,
  FileText,
  Send,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getActiveTenantId, getDefaultClassId, getDemoClassesForTenant } from '../lib/tenant';
import { validateFeesCSV, CSVValidationError } from '../lib/csvValidator';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DataTable, type DataTableColumn } from '../components/saas/DataTable';
import { SearchBar } from '../components/saas/SearchBar';
import { PageHeader } from '../components/ui/PageHeader';
import { PageShell } from '../components/ui/PageShell';
import { useToast } from '../components/saas/ToastProvider';

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
    dueDate?: string;
    status: string;
  }>;
}

interface FeeAccountResponse {
  fees?: FeeRecord[];
  payments?: PaymentRecord[];
}

function formatDate(value: PaymentRecord['paidAt']) {
  const date =
    typeof value === 'object' && value !== null && 'toDate' in value
      ? (value as { toDate: () => Date }).toDate()
      : value;
  return new Date((date as string | number | Date) || Date.now()).toLocaleDateString();
}

// Currency configuration - should match backend
const CURRENCY = 'INR';
const CURRENCY_SYMBOL = CURRENCY === 'INR' ? '₹' : '$';

function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString()}`;
}

function createIdempotencyKey(prefix: string, id: string) {
  return `${prefix}-${id}-${Date.now()}`;
}

export const FeesPage = () => {
  const { user, isStudent, canManageFees, classId: userClassId, schoolId } = useAuth();
  const { toast } = useToast();
  const activeTenantId = getActiveTenantId(schoolId);
  const classOptions = React.useMemo(
    () => getDemoClassesForTenant(activeTenantId),
    [activeTenantId]
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [report, setReport] = useState<FeeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'summary' | 'management' | 'reports'>(
    canManageFees ? 'management' : 'summary'
  );

  // Management State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [selectedClass, setSelectedClass] = useState(userClassId || getDefaultClassId(schoolId));
  const [feeSearch, setFeeSearch] = useState('');
  const [uploadError, setUploadError] = useState<CSVValidationError[] | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (!classOptions.some((option) => option.id === selectedClass)) {
      queueMicrotask(() =>
        setSelectedClass(userClassId || classOptions[0]?.id || getDefaultClassId(activeTenantId))
      );
    }
  }, [activeTenantId, classOptions, selectedClass, userClassId]);

  const loadStudentData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = (await feesService.getStudentAccount(String(user?.uid))) as FeeAccountResponse;
      setFees(data.fees || []);
      setPayments(data.payments || []);
    } catch (error) {
      console.error('Failed to load student fees:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadReport = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = (await feesService.getClassReport(selectedClass)) as FeeReport;
      setReport(data);
    } catch (error) {
      console.error('Failed to load fee report:', error);
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
    setUploadError(null);
    setUploadSuccess(false);

    if (!uploadText.trim()) {
      toast({
        tone: 'error',
        title: 'No data',
        description: 'Please paste CSV data.',
      });
      return;
    }

    // Validate CSV format
    const validation = validateFeesCSV(uploadText);
    if (!validation.isValid) {
      setUploadError(validation.errors || []);
      return;
    }

    try {
      const records = validation.records!.map((r) => ({
        ...r,
        classId: selectedClass,
      }));

      await feesService.upload(records, createIdempotencyKey('fees', selectedClass));

      setUploadSuccess(true);
      toast({
        tone: 'success',
        title: 'Fee records imported',
        description: `${records.length} records were added for ${selectedClass}.`,
      });
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadText('');
        setUploadSuccess(false);
        loadReport();
      }, 2000);
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        tone: 'error',
        title: 'Import failed',
        description: 'Fix the CSV validation errors and try again.',
      });
      setUploadError([
        {
          line: 0,
          message: error instanceof Error ? error.message : 'Upload failed. Please try again.',
          value: '',
        },
      ]);
    }
  };

  const readCsvFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadText(String(reader.result || ''));
    reader.readAsText(file);
  };

  const downloadFeeSample = () => {
    const sample =
      'studentId,amountDue,dueDate,status,amountPaid\nstudent_demo1_a,5000,2026-06-30,pending,0\nstudent_demo1_b,4500,2026-06-15,paid,4500';
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'educonnect-fees-sample.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const processPayment = async (feeId: string, amount: number) => {
    try {
      await feesService.pay(
        { feeId, amount, method: 'online' },
        createIdempotencyKey('payment', feeId)
      );
      toast({
        tone: 'success',
        title: 'Payment recorded',
        description: `${formatCurrency(amount)} was recorded successfully.`,
      });
      loadStudentData();
    } catch (error) {
      console.error('Payment failed:', error);
      toast({
        tone: 'error',
        title: 'Payment failed',
        description: 'Please try again or contact the accounts office.',
      });
    }
  };

  const totalDue = React.useMemo(() => fees.reduce((sum, f) => sum + f.amountDue, 0), [fees]);
  const totalPaid = React.useMemo(() => fees.reduce((sum, f) => sum + f.amountPaid, 0), [fees]);

  const reportStats = React.useMemo(
    () =>
      report
        ? [
            { name: 'Paid', value: report.totalPaid, color: '#10b981' },
            { name: 'Pending', value: report.pending, color: '#ef4444' },
          ]
        : [],
    [report]
  );

  const filteredFeeRecords = React.useMemo(() => {
    const query = feeSearch.trim().toLowerCase();
    return (report?.records || []).filter((record) =>
      record.studentId.toLowerCase().includes(query)
    );
  }, [report, feeSearch]);

  const exportFeeCsv = () => {
    const rows = filteredFeeRecords;
    if (rows.length === 0) {
      toast({
        tone: 'warning',
        title: 'No records',
        description: 'There are no fee rows to export.',
      });
      return;
    }
    const csv = [
      'studentId,amountDue,dueDate,status,amountPaid',
      ...rows.map((record) =>
        [
          record.studentId,
          record.amountDue,
          record.dueDate || '',
          record.status,
          record.amountPaid,
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fees-${selectedClass}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const feeColumns: Array<DataTableColumn<FeeReport['records'][number]>> = [
    {
      key: 'studentId',
      header: 'Student ID',
      render: (record) => (
        <span className="font-bold text-slate-700 dark:text-slate-200">{record.studentId}</span>
      ),
    },
    {
      key: 'amountDue',
      header: 'Due',
      align: 'right',
      render: (record) => (
        <span className="font-black text-slate-900 dark:text-white">
          {formatCurrency(record.amountDue)}
        </span>
      ),
    },
    {
      key: 'amountPaid',
      header: 'Paid',
      align: 'right',
      render: (record) => (
        <span className="font-black text-emerald-600">{formatCurrency(record.amountPaid)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (record) => (
        <span
          className={cn(
            'text-[9px] font-black uppercase px-2 py-1 rounded-full',
            record.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          )}
        >
          {record.status}
        </span>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Financial Management"
        description={
          isStudent
            ? 'Track your fee status and make secure payments.'
            : 'Monitor academy revenue and manage student dues.'
        }
      >
        <div className="flex items-center gap-3">
          {canManageFees && (
            <div className="flex bg-slate-100 p-1 rounded-xl dark:bg-slate-900">
              <button
                onClick={() => setView('management')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-bold transition-all',
                  view === 'management'
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                    : 'text-slate-500'
                )}
              >
                Overview
              </button>
              <button
                onClick={() => setView('reports')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-bold transition-all',
                  view === 'reports'
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                    : 'text-slate-500'
                )}
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
      </PageHeader>

      {isStudent ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Student Sidebar: Quick Summary */}
          <div className="space-y-6">
            <div className="bg-blue-600 p-8 rounded-[32px] text-white shadow-xl shadow-blue-100 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div>
                  <p className="text-blue-100 text-xs font-black uppercase tracking-widest mb-1">
                    Total Outstanding
                  </p>
                  <h3 className="text-5xl font-black">{formatCurrency(totalDue - totalPaid)}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-100 text-[10px] font-black uppercase mb-1">Paid</p>
                    <p className="text-xl font-bold">{formatCurrency(totalPaid)}</p>
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
                  <p className="text-xs text-slate-500 italic">No payments recorded yet.</p>
                ) : (
                  payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {formatCurrency(p.amount)}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">
                          {formatDate(p.paidAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => window.open(p.receiptUrl, '_blank')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Student Content: Fee Detailed List */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Fee Breakdown</h2>
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : fees.length === 0 ? (
              <div className="bg-white p-20 rounded-3xl border border-dashed border-slate-200 text-center">
                <p className="text-slate-500 font-medium">No fee records found for your account.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {fees.map((fee) => (
                  <div
                    key={fee.id}
                    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all"
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={cn(
                          'w-14 h-14 rounded-2xl flex items-center justify-center transition-all',
                          fee.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-amber-50 text-amber-600'
                        )}
                      >
                        <DollarSign size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                          Quarterly Tuition Fee
                        </p>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-slate-900">
                            {formatCurrency(fee.amountDue)}
                          </h3>
                          <span
                            className={cn(
                              'text-[10px] font-black uppercase px-2 py-0.5 rounded-full',
                              fee.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            )}
                          >
                            {fee.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-slate-500 uppercase">Due Date</p>
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
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Users size={14} />
                  Filter Class
                </label>
                <select
                  aria-label="Filter fee records by class"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl outline-none font-bold text-slate-700"
                >
                  {classOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-4 border-t border-slate-50 space-y-2">
                <button
                  onClick={exportFeeCsv}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600">
                    Download Excel
                  </span>
                  <Download size={16} className="text-slate-500" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600">
                    Send Reminders
                  </span>
                  <Send size={16} className="text-slate-500" />
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
                    <span className="font-bold text-emerald-600">
                      {formatCurrency(report.totalPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-medium">Pending</span>
                    <span className="font-bold text-red-600">{formatCurrency(report.pending)}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-sm font-black text-slate-900 uppercase">
                      Total Target
                    </span>
                    <span className="font-black text-blue-600">
                      {formatCurrency(report.totalDue)}
                    </span>
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
                  <div className="w-full sm:w-72">
                    <SearchBar
                      value={feeSearch}
                      onChange={setFeeSearch}
                      placeholder="Search student ID..."
                    />
                  </div>
                </div>
                {loading ? (
                  <div className="p-20 text-center text-slate-500">Loading data...</div>
                ) : (
                  <DataTable
                    columns={feeColumns}
                    rows={filteredFeeRecords}
                    getRowKey={(record) => record.studentId}
                    emptyMessage="No fee records match this class or search."
                  />
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[300px] min-h-[300px] w-full min-w-0">
                    <h4 className="font-bold text-slate-900 mb-6">Payment Distribution</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {reportStats.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-900">Collection Insights</h4>
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                            <PieChartIcon size={20} />
                          </div>
                          <span className="text-sm font-bold text-slate-600">Collection Rate</span>
                        </div>
                        <span className="text-xl font-black text-slate-900">
                          {report ? Math.round((report.totalPaid / report.totalDue) * 100) : 0}%
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                            <AlertCircle size={20} />
                          </div>
                          <span className="text-sm font-bold text-slate-600">Overdue Count</span>
                        </div>
                        <span className="text-xl font-black text-red-600">
                          {report?.records.filter((record) => record.status !== 'paid').length || 0}
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden p-10 space-y-8 dark:bg-slate-900 dark:border dark:border-slate-800 dark:text-slate-50"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    Import Fee Data
                  </h3>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    Bulk upload student fee records for{' '}
                    <span className="text-blue-600 font-bold">Class {selectedClass}</span>.
                  </p>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {uploadSuccess ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl">✓</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-emerald-600">Upload Successful!</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      Your fee records have been imported.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpload} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={14} />
                      Paste CSV Records
                    </label>
                    <textarea
                      aria-label="Paste fee CSV records"
                      required
                      rows={8}
                      value={uploadText}
                      onChange={(e) => setUploadText(e.target.value)}
                      placeholder="studentId,amountDue,dueDate,status,amountPaid&#10;student_demo1_a,5000,2026-06-30,pending,0&#10;student_demo1_b,4500,2026-06-15,paid,4500"
                      className="w-full bg-slate-50 border border-slate-200 p-6 rounded-3xl text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-mono text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <input
                      aria-label="Choose fee CSV file"
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(event) => readCsvFile(event.target.files?.[0])}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-blue-700 hover:bg-blue-100"
                      >
                        Choose CSV File
                      </button>
                      <button
                        type="button"
                        onClick={downloadFeeSample}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
                      >
                        Download Sample CSV
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase text-center tracking-wider">
                      Format: studentId, amountDue, dueDate, status, amountPaid
                    </p>
                  </div>

                  {uploadError && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
                      <p className="text-sm font-bold text-red-700">Validation Errors:</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {uploadError.map((err, i) => (
                          <p key={i} className="text-xs text-red-600">
                            <span className="font-bold">Line {err.line}:</span> {err.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="px-8 bg-slate-100 text-slate-600 py-5 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};
