import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAuth, handleFirestoreError, OperationType } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { User as UserIcon, Shield, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDebounce } from '../lib/hooks';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
}

export const UsersPage = ({ type }: { type: 'student' | 'teacher' | 'all' }) => {
  const { role: currentUserRole, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => doc.data() as UserProfile);
      if (type === 'student') data = data.filter(u => u.role === 'student');
      if (type === 'teacher') data = data.filter(u => u.role === 'teacher');
      setUsers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [type]);

  const updateRole = async (targetUid: string, nextRole: string) => {
    if (currentUserRole !== 'admin') {
      alert('Only admins can change roles.');
      return;
    }

    try {
      // 1. Update Firestore
      await updateDoc(doc(db, 'users', targetUid), { role: nextRole });
      
      // 2. Update Custom Claims via Server API
      const idToken = await currentUser?.getIdToken();
      await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ uid: targetUid, role: nextRole })
      });
      
      alert(`Role updated to ${nextRole}`);
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const filtered = users.filter(u => 
    u.displayName?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
    u.email?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight capitalize">{type} Management</h1>
          <p className="text-slate-500 mt-1">Manage accounts and platform permissions.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 pl-12 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((u) => (
          <motion.div 
            key={u.uid}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <UserIcon size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 truncate">{u.displayName || 'Unnamed User'}</p>
                <p className="text-xs text-slate-500 truncate">{u.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                  <Shield size={14} />
                  Role
                </div>
                <span className="text-sm font-bold text-blue-600 capitalize">{u.role}</span>
              </div>

              {currentUserRole === 'admin' && (
                <div className="pt-2 border-t border-slate-50">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Change Role</p>
                   <div className="flex flex-wrap gap-2">
                     {['student', 'parent', 'teacher', 'staff', 'admin'].map((r) => (
                       <button
                         key={r}
                         onClick={() => updateRole(u.uid, r)}
                         className={cn(
                           "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                           u.role === r 
                             ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                             : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                         )}
                       >
                         {r}
                       </button>
                     ))}
                   </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
