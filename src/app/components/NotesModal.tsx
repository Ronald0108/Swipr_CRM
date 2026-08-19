'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, FileText } from 'lucide-react';
import { Lead } from '../data/leads';

interface NotesModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
  onKeyboardSave?: () => void;
}

export function NotesModal({ lead, isOpen, onClose, onSave, onKeyboardSave }: NotesModalProps) {
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
    onKeyboardSave?.();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
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
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            key="notes-panel"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-lg rounded-3xl overflow-hidden"
            style={{
              background: 'var(--surface-overlay)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-modal)',
              backdropFilter: 'blur(var(--glass-blur))',
            }}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                  <FileText className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] text-lg font-semibold tracking-tight">Edit Notes</h3>
                  <p className="text-[var(--text-secondary)] text-xs">{lead.name} · {lead.company}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--input-bg)]"
              >
                <X className="w-4 h-4 text-[var(--text-tertiary)]" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <textarea
                ref={textareaRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-48 resize-none rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none transition-all placeholder:text-[var(--text-tertiary)] placeholder:opacity-50"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                }}
                placeholder="Add notes about this lead..."
              />
              <p className="text-[10px] text-[var(--text-tertiary)] mt-2 flex items-center gap-2">
                <span>Press <kbd className="font-sans px-1.5 py-0.5 rounded text-[var(--text-secondary)] bg-[var(--input-bg)] border border-[var(--border-subtle)] mx-0.5">⌘</kbd> + <kbd className="font-sans px-1.5 py-0.5 rounded text-[var(--text-secondary)] bg-[var(--input-bg)] border border-[var(--border-subtle)] mx-0.5">Enter</kbd> to save</span>
                <span className="w-1 h-1 rounded-full bg-[var(--border-subtle)]" />
                <span>Press <kbd className="font-sans px-1.5 py-0.5 rounded text-[var(--text-secondary)] bg-[var(--input-bg)] border border-[var(--border-subtle)] mx-0.5">Esc</kbd> to cancel</span>
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--input-bg)] transition-colors font-medium"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSave()}
                className="btn-premium flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold transition-colors"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', border: '1px solid rgba(124,58,237,0.35)' }}
              >
                <Save className="w-3.5 h-3.5" />
                Save Notes
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
