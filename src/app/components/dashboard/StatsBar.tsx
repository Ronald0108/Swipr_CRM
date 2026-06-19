'use client';

import { motion } from 'motion/react';
import { Download, RefreshCw } from 'lucide-react';
import { useApp } from '@/app/providers';

export function StatsBar() {
  const {
    leads, currentIndex,
    setShowCrmModal, setCrmError, loadCrmStatus,
    setShowImportModal, setImportError, setImportSuccess,
    handleLogout
  } = useApp();

  const total = leads.length;
  const progress = total > 0 ? (currentIndex / total) * 100 : 0;
  const currentLeadPosition = total > 0 ? Math.min(currentIndex + 1, total) : 0;

  return (
    <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: '#1c1c2a' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
          <img src="/images/logo_transparent.png" alt="Swipr CRM logo" className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end gap-0.5">
          <span className="text-white text-sm font-semibold">Lead {currentLeadPosition} of {total}</span>
          <div className="w-32 h-1.5 rounded-full bg-gray-800 overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
        <button onClick={() => { setShowCrmModal(true); setCrmError(''); void loadCrmStatus(); }} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2" style={{ background: '#164e63', border: '1px solid #0e7490' }}>
          <RefreshCw className="w-4 h-4" />CRM Integration
        </button>
        <button onClick={() => { setShowImportModal(true); setImportError(''); setImportSuccess(''); }} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2" style={{ background: '#312e81', border: '1px solid #4338ca' }}>
          <Download className="w-4 h-4" />Import Leads
        </button>
        <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors" style={{ background: '#1f2937', border: '1px solid #374151' }}>Logout</button>
      </div>
    </header>
  );
}
