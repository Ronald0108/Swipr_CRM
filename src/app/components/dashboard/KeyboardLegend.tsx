'use client';

import { motion } from 'motion/react';
import { useApp } from '@/app/providers';

export const KEY_ACTIONS: Record<string, string> = {
  c: 'call',
  v: 'voicemail',
  s: 'next',
  n: 'notes',
  e: 'email',
  d: 'delete',
  a: 'create',
};

export const LEGEND_KEYS = [
  { key: 'C', label: 'Call', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.12)' },
  { key: 'V', label: 'Voicemail', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.12)' },
  { key: 'S', label: 'Skip', color: '#38BDF8', bgColor: 'rgba(56,189,248,0.12)' },
  { key: 'N', label: 'Notes', color: '#EAB308', bgColor: 'rgba(234,179,8,0.12)' },
  { key: 'E', label: 'Email', color: '#A855F7', bgColor: 'rgba(168,85,247,0.12)' },
];

export const MANAGEMENT_KEYS = [
  { key: 'D', label: 'Delete lead', color: '#e11d48', bgColor: 'rgba(225,29,72,0.12)' },
  { key: 'A', label: 'Create lead', color: '#7c3aed', bgColor: 'rgba(124,58,237,0.12)' },
];

export function KeyboardLegend({
  orientation = 'horizontal',
  variant = 'classic',
}: {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'classic' | 'new';
}) {
  const { pressedKey } = useApp();
  const isVertical = orientation === 'vertical';
  const isNew = variant === 'new';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={[
        'fixed z-30 flex items-center rounded-xl',
        isVertical
          ? 'left-3 top-1/2 -translate-y-1/2 flex-col gap-1 px-1.5 py-2.5 sm:left-5'
          : 'bottom-4 left-1/2 -translate-x-1/2 gap-1 px-4 py-2.5',
      ].join(' ')}
      style={{
        background: isNew ? 'rgba(255, 255, 255, 0.94)' : 'var(--panel-bg)',
        border: isNew ? '1px solid #dfd1f4' : '1px solid var(--border-strong)',
        boxShadow: isNew ? '0 18px 45px rgba(74, 38, 112, 0.14)' : 'var(--shadow-modal)',
        color: isNew ? '#5f4a72' : undefined,
        fontFamily: isNew ? '"Avenir Next", "Century Gothic", sans-serif' : undefined,
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
                background: isPressed ? color : (isNew ? '#f0e7ff' : 'var(--input-bg)'),
                color: isPressed ? '#fff' : (isNew ? '#6b21a8' : 'var(--text-secondary)'),
                border: isPressed ? 'none' : (isNew ? '1px solid #dfd1f4' : '1px solid var(--border-subtle)'),
                boxShadow: isPressed
                  ? `0 0 12px ${color}40, 0 2px 4px rgba(0,0,0,0.3)`
                  : '0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 var(--border-subtle)',
                transition: 'all 0.15s ease',
              }}
            >
              {key}
            </span>
            {/* Label (hidden on small screens) */}
            <span className={isVertical ? 'hidden lg:inline text-[9px] font-medium' : 'hidden sm:inline text-[9px] font-medium'}
              style={{ color: isPressed ? color : (isNew ? '#7c6c91' : 'var(--text-tertiary)') }}>
              {label}
            </span>
          </motion.div>
        );
      })}

      {MANAGEMENT_KEYS.map(({ key, label, color, bgColor }) => {
        const isPressed = pressedKey === key;

        return (
          <motion.div
            key={key}
            animate={{ scale: isPressed ? 1.15 : 1, y: isPressed ? -4 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 cursor-default select-none"
            style={{
              background: isPressed ? bgColor : 'transparent',
              transition: 'background 0.15s ease',
            }}
          >
            <span
              className="inline-flex items-center justify-center rounded-md text-[10px] font-bold tabular-nums"
              style={{
                width: 20,
                height: 20,
                background: isPressed ? color : (isNew ? '#f0e7ff' : 'var(--input-bg)'),
                color: isPressed ? '#fff' : (isNew ? '#6b21a8' : 'var(--text-secondary)'),
                border: isPressed ? 'none' : (isNew ? '1px solid #dfd1f4' : '1px solid var(--border-subtle)'),
              }}
            >
              {key}
            </span>
            <span
              className={isVertical ? 'hidden lg:inline text-[9px] font-medium' : 'hidden sm:inline text-[9px] font-medium'}
              style={{ color: isPressed ? color : (isNew ? '#7c6c91' : 'var(--text-tertiary)') }}
            >
              {label}
            </span>
          </motion.div>
        );
      })}

      {/* Arrow keys hint stays at the bottom of the vertical legend. */}
      <div
        className={isVertical ? 'h-px w-5 my-1' : 'w-px h-5 mx-1'}
        style={{ background: isNew ? '#e7dcf3' : 'var(--border-subtle)' }}
      />
      <div className={isVertical ? 'flex flex-col items-center gap-1 px-1' : 'flex items-center gap-1 px-1'}>
        <span className="inline-flex items-center justify-center rounded-md text-[9px] font-medium"
          style={{
            width: 18, height: 18,
            background: isNew ? '#f0e7ff' : 'var(--input-bg)',
            color: isNew ? '#6b21a8' : 'var(--text-secondary)',
            border: isNew ? '1px solid #dfd1f4' : '1px solid var(--border-subtle)',
          }}>
          ↑↓
        </span>
        <span className={isVertical ? 'hidden lg:inline text-[9px] text-[var(--text-tertiary)]' : 'hidden sm:inline text-[9px] text-[var(--text-tertiary)]'}>Navigate</span>
      </div>
    </motion.div>
  );
}
