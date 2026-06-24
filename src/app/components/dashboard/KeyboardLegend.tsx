'use client';

import { motion } from 'motion/react';
import { useApp } from '@/app/providers';

export const KEY_ACTIONS: Record<string, string> = {
  c: 'connected',
  l: 'lost',
  v: 'voicemail',
  s: 'next',
  n: 'notes',
  e: 'email',
  p: 'previous',
  t: 'call',
};

const LEGEND_KEYS = [
  { key: 'C', label: 'Connected', color: '#10B981', bgColor: 'rgba(16,185,129,0.12)' },
  { key: 'L', label: 'Lost', color: '#F43F5E', bgColor: 'rgba(244,63,94,0.12)' },
  { key: 'V', label: 'Voicemail', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.12)' },
  { key: 'S', label: 'Skip', color: '#38BDF8', bgColor: 'rgba(56,189,248,0.12)' },
  { key: 'N', label: 'Notes', color: '#EAB308', bgColor: 'rgba(234,179,8,0.12)' },
  { key: 'E', label: 'Email', color: '#A855F7', bgColor: 'rgba(168,85,247,0.12)' },
  { key: 'T', label: 'Call', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.12)' },
  { key: 'P', label: 'Previous', color: '#8E8EA0', bgColor: 'rgba(142,142,160,0.08)' },
];

export function KeyboardLegend() {
  const { pressedKey } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-xl px-4 py-2.5"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow-modal)',
      }}
    >
      {LEGEND_KEYS.map(({ key, label, color, bgColor }) => {
        const isPressed = pressedKey === key;

        return (
          <motion.div
            key={key}
            animate={{
              scale: isPressed ? 1.15 : 1,
              y: isPressed ? -4 : 0,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-default select-none"
            style={{
              background: isPressed ? bgColor : 'transparent',
              transition: 'background 0.15s ease',
            }}
            title={`Press "${key}" to ${label.toLowerCase()}`}
          >
            {/* Key cap */}
            <span
              className="inline-flex items-center justify-center rounded-md text-[10px] font-bold tabular-nums"
              style={{
                width: 20,
                height: 20,
                background: isPressed ? color : 'var(--input-bg)',
                color: isPressed ? '#fff' : 'var(--text-secondary)',
                border: isPressed ? 'none' : '1px solid var(--border-subtle)',
                boxShadow: isPressed
                  ? `0 0 12px ${color}40, 0 2px 4px rgba(0,0,0,0.3)`
                  : '0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 var(--border-subtle)',
                transition: 'all 0.15s ease',
              }}
            >
              {key}
            </span>
            {/* Label (hidden on small screens) */}
            <span className="hidden sm:inline text-[9px] font-medium"
              style={{ color: isPressed ? color : 'var(--text-tertiary)' }}>
              {label}
            </span>
          </motion.div>
        );
      })}

      {/* Arrow keys hint */}
      <div className="w-px h-5 mx-1" style={{ background: 'var(--border-subtle)' }} />
      <div className="flex items-center gap-1 px-1">
        <span className="inline-flex items-center justify-center rounded-md text-[9px] font-medium"
          style={{
            width: 18, height: 18,
            background: 'var(--input-bg)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
          }}>
          ↑↓
        </span>
        <span className="text-[9px] text-[var(--text-tertiary)] hidden sm:inline">Navigate</span>
      </div>
    </motion.div>
  );
}
