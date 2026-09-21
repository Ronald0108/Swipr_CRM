'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const ROWS = [
  ['Escape', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Backspace'],
  ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['CapsLock', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Enter'],
  ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', 'ArrowUp'],
  ['Control', 'Alt', 'Meta', ' ', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
];
const LABELS: Record<string, string> = {
  Escape: 'Esc', Backspace: 'Delete', CapsLock: 'Caps', Control: 'Ctrl',
  Meta: '⌘', Alt: 'Option', ' ': 'Space', ArrowUp: '↑', ArrowDown: '↓',
  ArrowLeft: '←', ArrowRight: '→',
};

export function DemoKeyboard() {
  const [pressed, setPressed] = useState<string[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;
    let actionTimer: ReturnType<typeof setTimeout> | undefined;
    const replayed = new WeakSet<Event>();
    const cancelPending = () => {
      clearTimeout(actionTimer);
      actionTimer = undefined;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (replayed.has(event) || event.isComposing) return;
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === 'password') return;
      const editing = target instanceof HTMLElement && (
        target.isContentEditable || target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
      );
      const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
      const shortcut = event.key === 'Escape' ||
        ((event.metaKey || event.ctrlKey) && event.key === 'Enter') ||
        (!editing && !event.metaKey && !event.ctrlKey && !event.altKey &&
          ['A', 'C', 'D', 'E', 'N', 'S', 'V', 'U', 'B', 'W', 'Enter', 'ArrowUp', 'ArrowDown'].includes(key));

      if (!shortcut) {
        if (editing) {
          clearTimeout(hideTimer);
          setPressed([]);
        }
        return;
      }

      if (actionTimer !== undefined || event.repeat) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      setPressed([
        ...(event.metaKey ? ['Meta'] : []), ...(event.ctrlKey ? ['Control'] : []),
        ...(event.altKey ? ['Alt'] : []), ...(event.shiftKey ? ['Shift'] : []), key,
      ]);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setPressed([]), 1600);
      event.preventDefault();
      event.stopImmediatePropagation();
      const focused = document.activeElement;
      const replay = new KeyboardEvent('keydown', {
        key: event.key, code: event.code, metaKey: event.metaKey, ctrlKey: event.ctrlKey,
        altKey: event.altKey, shiftKey: event.shiftKey, bubbles: true, cancelable: true,
      });
      replayed.add(replay);
      // Let the keyboard appear before the existing dashboard or modal handler runs.
      actionTimer = setTimeout(() => {
        actionTimer = undefined;
        if (document.activeElement !== focused || !(target instanceof Node) || !target.isConnected) return;
        target.dispatchEvent(replay);
      }, 550);
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('pointerdown', cancelPending, true);
    window.addEventListener('blur', cancelPending);
    return () => {
      clearTimeout(hideTimer);
      cancelPending();
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointerdown', cancelPending, true);
      window.removeEventListener('blur', cancelPending);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[200] flex justify-center px-3" aria-hidden="true">
      <AnimatePresence>
        {pressed.length > 0 && (
          <motion.div
            initial={{ y: reducedMotion ? 0 : '120%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reducedMotion ? 0 : '120%', opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-[680px] rounded-3xl border border-purple-200/70 bg-purple-100/75 p-3 shadow-2xl backdrop-blur-md sm:p-4"
            style={{ fontFamily: '"Avenir Next", "Century Gothic", sans-serif' }}
          >
            <div className="mb-3 flex items-center justify-between text-xs font-bold text-purple-900">
              <span>Demo mode</span>
              <span>{Array.from(new Set(pressed)).map(key => LABELS[key] || key).join(' + ')}</span>
            </div>
            <div className="space-y-1.5">
              {ROWS.map((row, index) => (
                <div key={index} className="flex justify-center gap-1 sm:gap-1.5">
                  {row.map(key => (
                    <div key={key}
                      className={`flex h-8 min-w-0 items-center justify-center rounded-md border text-[9px] font-semibold transition-colors sm:h-10 sm:text-xs ${
                        pressed.includes(key)
                          ? 'border-purple-500 bg-purple-600 text-white shadow-[0_0_18px_rgba(147,51,234,0.5)]'
                          : 'border-white/80 bg-white/55 text-purple-900'
                      }`}
                      style={{ flex: key === ' ' ? 5 : key.length > 1 && !key.startsWith('Arrow') ? 1.5 : 1 }}
                    >{LABELS[key] || key}</div>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
