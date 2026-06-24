'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useApp } from '@/app/providers';

export function DeleteConfirmDialog() {
  const {
    showDeleteConfirm, setShowDeleteConfirm,
    currentLead, handleDeleteCurrentLead, deletingLead
  } = useApp();

  return (
    <AnimatePresence>
      {showDeleteConfirm && currentLead && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={(event) => { if (event.target === event.currentTarget) setShowDeleteConfirm(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-sm rounded-3xl p-6"
            style={{
              background: 'var(--surface-overlay)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-modal)',
              backdropFilter: 'blur(var(--glass-blur))',
            }}
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 flex-shrink-0 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <AlertTriangle className="h-6 w-6 text-rose-400" />
              </div>
              <div className="min-w-0 pt-1">
                <h3 className="text-[var(--text-primary)] text-lg font-semibold tracking-tight">Delete lead?</h3>
                <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                  This will permanently remove <strong className="text-[var(--text-primary)] font-bold">{currentLead.name}</strong> from your CRM. This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--input-bg)] transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  void handleDeleteCurrentLead();
                  setShowDeleteConfirm(false);
                }}
                disabled={deletingLead}
                className="btn-premium flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white/90 disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #E11D48, #BE123C)', border: '1px solid rgba(244,63,94,0.3)' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deletingLead ? 'Deleting...' : 'Delete Lead'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
