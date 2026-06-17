'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { useApp } from '@/app/providers';

export function DeleteConfirmDialog() {
  const {
    showDeleteConfirm, setShowDeleteConfirm,
    currentLead, handleDeleteCurrentLead, deletingLead
  } = useApp();

  return (
    <AnimatePresence>
      {showDeleteConfirm && currentLead && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(event) => { if (event.target === event.currentTarget) setShowDeleteConfirm(false); }}>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }} className="w-full max-w-sm rounded-2xl border p-5" style={{ background: '#11111a', borderColor: '#2b1f2a' }}>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-rose-500/15 flex items-center justify-center"><Trash2 className="h-5 w-5 text-rose-300" /></div>
              <div className="min-w-0">
                <h3 className="text-white font-semibold">Delete lead?</h3>
                <p className="mt-1 text-sm text-gray-400">This will remove {currentLead.name} from your rolodex.</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5">Cancel</button>
              <button type="button" onClick={() => void handleDeleteCurrentLead()} disabled={deletingLead}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                {deletingLead ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
