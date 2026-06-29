'use client';

import { motion } from 'motion/react';
import { useApp } from '@/app/providers';
import { SwipeAction } from '@/app/components/LeadCard';

type AnyAction = SwipeAction | 'notes' | 'email' | 'call' | 'previous';

export const KEY_ACTIONS: Record<string, AnyAction> = {
  q: 'voicemail', e: 'notes', a: 'lost', d: 'connected',
  c: 'call', x: 'email', r: 'next', t: 'previous',
};

export const SHORTCUT_KEYS: {
  key: string; label: string; action: AnyAction;
  color: string; bg: string;
}[] = [
    { key: 'Q', label: 'Voicemail', action: 'voicemail', color: 'text-amber-400', bg: 'border-amber-500/40 bg-amber-500/10' },
    { key: 'A', label: 'Lost', action: 'lost', color: 'text-rose-400', bg: 'border-rose-500/40 bg-rose-500/10' },
    { key: 'D', label: 'Connected', action: 'connected', color: 'text-emerald-400', bg: 'border-emerald-500/40 bg-emerald-500/10' },
    { key: 'R', label: 'Next', action: 'next', color: 'text-sky-400', bg: 'border-sky-500/40 bg-sky-500/10' },
    { key: 'T', label: 'Previous', action: 'previous', color: 'text-gray-300', bg: 'border-gray-500/40 bg-gray-500/10' },
    { key: 'C', label: 'Call', action: 'call', color: 'text-blue-400', bg: 'border-blue-500/40 bg-blue-500/10' },
    { key: 'E', label: 'Notes', action: 'notes', color: 'text-yellow-300', bg: 'border-yellow-500/40 bg-yellow-500/10' },
    { key: 'X', label: 'Email', action: 'email', color: 'text-purple-400', bg: 'border-purple-500/40 bg-purple-500/10' },
  ];

export function KeyboardLegend() {
  const {
    pressedKey, setPressedKey,
    setShowNotesModal, promptLeadEmail, promptLeadCall, currentLead,
    navigatePrev, isDone, triggerSwipeAction, addActivity
  } = useApp();

  return (
    <footer className="flex-shrink-0 px-6 py-3 border-t flex items-center justify-center gap-2 flex-wrap" style={{ borderColor: 'var(--dash-border)', background: 'var(--dash-topbar)' }}>
      {SHORTCUT_KEYS.map(({ key, label, action, color, bg }) => {
        const isPressed = pressedKey === key;
        return (
          <motion.button key={key} animate={isPressed ? { scale: 0.88, y: -2 } : { scale: 1, y: 0 }} transition={{ duration: 0.1 }}
            onClick={() => {
              setPressedKey(key); setTimeout(() => setPressedKey(null), 300);
              if (action === 'notes') setShowNotesModal(true);
              else if (action === 'email') promptLeadEmail(currentLead);
              else if (action === 'call') promptLeadCall(currentLead);
              else if (action === 'previous') navigatePrev();
              else if (!isDone) triggerSwipeAction(action as SwipeAction, addActivity);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150 ${isPressed ? `${bg} scale-95` : 'border-gray-800 bg-transparent'}`}>
            <kbd className={`text-xs font-bold font-mono ${isPressed ? color : 'text-gray-400'} min-w-[14px]`}>{key}</kbd>
            <span className={`text-xs ${isPressed ? color : 'text-gray-600'}`}>{label}</span>
          </motion.button>
        );
      })}
    </footer>
  );
}

export type { AnyAction };
