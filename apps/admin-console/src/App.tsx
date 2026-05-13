import React from 'react';

export const AdminApp = () => {
  return (
    <div className="p-10 bg-slate-900 min-h-screen text-white">
      <h1 className="text-4xl font-black mb-8">EduConnect Admin Console</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
          <h2 className="text-xl font-bold mb-4">Tenant Management</h2>
          <p className="text-slate-400">Onboard new schools and manage active subscriptions.</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
          <h2 className="text-xl font-bold mb-4">Global Analytics</h2>
          <p className="text-slate-400">View performance across all registered schools.</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
          <h2 className="text-xl font-bold mb-4">System Health</h2>
          <p className="text-slate-400">Monitor API usage, errors, and infra performance.</p>
        </div>
      </div>
    </div>
  );
};
