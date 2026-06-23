'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, CheckCircle, Voicemail, PhoneMissed, PhoneOff, AlertTriangle, X } from 'lucide-react';
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
  { value: 'connected',    label: 'Connected',    Icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-500/15 hover:bg-emerald-500/25', border: 'border-emerald-500/30' },
  { value: 'voicemail',    label: 'Voicemail',    Icon: Voicemail,     color: 'text-amber-400',   bg: 'bg-amber-500/15 hover:bg-amber-500/25',     border: 'border-amber-500/30'   },
  { value: 'no_answer',    label: 'No Answer',    Icon: PhoneMissed,   color: 'text-sky-400',     bg: 'bg-sky-500/15 hover:bg-sky-500/25',         border: 'border-sky-500/30'     },
  { value: 'busy',         label: 'Busy',         Icon: PhoneOff,      color: 'text-orange-400',  bg: 'bg-orange-500/15 hover:bg-orange-500/25',   border: 'border-orange-500/30'  },
  { value: 'wrong_number', label: 'Wrong Number', Icon: AlertTriangle, color: 'text-rose-400',    bg: 'bg-rose-500/15 hover:bg-rose-500/25',       border: 'border-rose-500/30'    },
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          style={{ backdropFilter: 'blur(6px)' }}
          onClick={handleClose}
        >
          <motion.div
            key="call-outcome-panel"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[#1f1f2e] bg-[#13131a] shadow-2xl overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b border-[#1f1f2e] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <Phone className="w-4.5 h-4.5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Call Outcome</p>
                  <p className="text-gray-500 text-xs">{lead.name} · {formatPhoneDisplay(lead.phone)}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Outcome Buttons ── */}
            <div className="px-5 py-4">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">What happened?</p>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOME_OPTIONS.map(({ value, label, Icon, color, bg, border }) => {
                  const isSelected = selectedOutcome === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedOutcome(value)}
                      className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all ${
                        isSelected
                          ? `${bg} ${border} ring-1 ring-current/20`
                          : 'border-[#1f1f2e] bg-[#0e0e17] hover:bg-[#1a1a28] text-gray-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? color : 'text-gray-500'}`} />
                      <span className={isSelected ? color : ''}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Notes ── */}
            <div className="px-5 pb-4">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Call Notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                rows={3}
                placeholder="Add notes about the call..."
                className="w-full rounded-xl border border-[#1f1f2e] bg-[#0a0a0f] px-3.5 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 resize-none transition-colors"
              />
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center justify-end gap-2 border-t border-[#1f1f2e] px-5 py-3">
              <button
                onClick={handleClose}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleSave}
                disabled={!selectedOutcome}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save Outcome
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
