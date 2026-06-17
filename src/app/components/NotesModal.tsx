import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, FileText } from 'lucide-react';
import { Lead } from '../data/leads';

interface NotesModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
}

export function NotesModal({ lead, isOpen, onClose, onSave }: NotesModalProps) {
  const [notes, setNotes] = useState(lead.notes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNotes(lead.notes);
  }, [lead.notes, isOpen]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSave = () => {
    onSave(notes);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="notes-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            key="notes-panel"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="w-full max-w-lg bg-white dark:bg-[#11111a] rounded-2xl shadow-2xl dark:shadow-none dark:border dark:border-[#1f1f2e] overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#1f1f2e]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white font-semibold">Edit Notes</h3>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">{lead.name} · {lead.company}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1a24] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <textarea
                ref={textareaRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-48 resize-none rounded-xl border border-gray-200 dark:border-[#2a2a3a] bg-gray-50 dark:bg-[#0a0a0f] px-4 py-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder-gray-400 dark:placeholder-gray-600"
                placeholder="Add notes about this lead..."
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">⌘ + Enter to save · Esc to cancel</p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a24] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save Notes
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
