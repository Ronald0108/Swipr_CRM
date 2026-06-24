'use client';

import { motion } from 'motion/react';
import { Download, RefreshCw, Upload, Settings } from 'lucide-react';
import { useApp } from '@/app/providers';
import { SettingsMenu } from './SettingsMenu';

export function StatsBar() {
  const {
    setShowCrmModal, setCrmError, loadCrmStatus,
    setShowImportModal, setImportError, setImportSuccess
  } = useApp();

  return (
    <header className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 glass-panel"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}>

      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border-subtle)' }}>
          <img src="/images/logo_transparent.png" alt="Swipr CRM logo" className="w-full h-full object-cover" />
        </div>
        <span className="text-[var(--text-primary)] text-sm font-semibold tracking-tight hidden sm:block">SwiprCRM</span>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setShowCrmModal(true); setCrmError(''); void loadCrmStatus(); }}
          className="btn-premium px-3 py-1.5 rounded-xl text-[var(--accent-indigo)] text-xs font-semibold flex items-center gap-2"
          style={{ background: 'var(--accent-indigo-soft)', border: '1px solid rgba(67, 130, 223, 0.25)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Integrations</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setShowImportModal(true); setImportError(''); setImportSuccess(''); }}
          className="btn-premium px-3 py-1.5 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2"
          style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)' }}
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Import</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            // Export triggers handled through ExportModal
            const event = new CustomEvent('openExportModal');
            window.dispatchEvent(event);
          }}
          className="btn-premium px-3 py-1.5 rounded-xl text-amber-700 dark:text-amber-500 text-xs font-semibold flex items-center gap-2"
          style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)' }}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Export</span>
        </motion.button>

        <div className="w-px h-6 bg-[var(--border-subtle)] mx-1 hidden md:block" />
        <SettingsMenu />
      </div>
    </header>
  );
}
