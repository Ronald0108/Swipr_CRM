'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, CheckCircle, Voicemail, PhoneMissed, PhoneOff, AlertTriangle, X, Save } from 'lucide-react';
import type { Lead } from '../data/leads';
import type { CallOutcome } from '../types/activity';
import { formatPhoneDisplay } from '../lib/utils';

interface CallOutcomeModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (outcome: CallOutcome, notes: string) => void;
}

const OUTCOME_OPTIONS: {
  value: CallOutcome;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
}[] = [
  { value: 'connected',    label: 'Connected',    Icon: CheckCircle,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', border: 'border-emerald-500/30' },
  { value: 'voicemail',    label: 'Voicemail',    Icon: Voicemail,     color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-500/10 dark:bg-amber-500/15',     border: 'border-amber-500/30'   },
  { value: 'no_answer',    label: 'No Answer',    Icon: PhoneMissed,   color: 'text-sky-600 dark:text-sky-400',     bg: 'bg-sky-500/10 dark:bg-sky-500/15',         border: 'border-sky-500/30'     },
  { value: 'busy',         label: 'Busy',         Icon: PhoneOff,      color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-500/10 dark:bg-orange-500/15',   border: 'border-orange-500/30'  },
  { value: 'wrong_number', label: 'Wrong Number', Icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400',    bg: 'bg-rose-500/10 dark:bg-rose-500/15',       border: 'border-rose-500/30'    },
];

export function CallOutcomeModal({ lead, isOpen, onClose, onSave }: CallOutcomeModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!selectedOutcome) return;
    onSave(selectedOutcome, notes);
    setSelectedOutcome(null);
    setNotes('');
  };

  const handleClose = () => {
    setSelectedOutcome(null);
    setNotes('');
    onClose();
  };

  if (!lead) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="call-outcome-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={handleClose}
        >
          <motion.div
            key="call-outcome-panel"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: 'var(--surface-overlay)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-modal)',
              backdropFilter: 'blur(var(--glass-blur))',
            }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <Phone className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] text-lg font-semibold tracking-tight">Call Outcome</h3>
                  <p className="text-[var(--text-secondary)] text-xs">{lead.name} · {formatPhoneDisplay(lead.phone)}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--input-bg)]"
              >
                <X className="w-4 h-4 text-[var(--text-tertiary)]" />
              </button>
            </div>

            {/* ── Outcome Buttons ── */}
            <div className="px-6 py-5">
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-3">What happened?</p>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOME_OPTIONS.map(({ value, label, Icon, color, bg, border }) => {
                  const isSelected = selectedOutcome === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedOutcome(value)}
                      className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold border transition-all ${
                        isSelected 
                          ? `${bg} ${border}` 
                          : 'bg-[var(--input-bg)] border-[var(--border-subtle)] hover:bg-[var(--input-bg)]/80'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? color : 'text-[var(--text-tertiary)]'}`} />
                      <span className={isSelected ? color : 'text-[var(--text-secondary)]'}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Notes ── */}
            <div className="px-6 pb-5">
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-2.5">Call Notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                rows={3}
                placeholder="Add notes about the call..."
                className="w-full rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none transition-all placeholder:text-[var(--text-tertiary)] placeholder:opacity-50 resize-none"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                }}
              />
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center justify-end gap-3 px-6 pb-5">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--input-bg)] transition-colors"
              >
                Skip
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={!selectedOutcome}
                className="btn-premium flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', border: '1px solid rgba(59,130,246,0.3)' }}
              >
                <Save className="w-3.5 h-3.5" />
                Save Outcome
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
