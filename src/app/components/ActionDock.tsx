import { motion } from 'motion/react';
import { SwipeAction } from './LeadCard';

type DockAction = SwipeAction | 'notes' | 'email' | 'call' | 'previous';

interface DockShortcut {
  key: string;
  label: string;
  action: DockAction;
  color: string;
  bg: string;
}

interface ActionDockProps {
  shortcuts: DockShortcut[];
  pressedKey: string | null;
  onAction: (shortcut: DockShortcut) => void;
}

export function ActionDock({ shortcuts, pressedKey, onAction }: ActionDockProps) {
  return (
    <div className="swipr-action-dock">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--sw-muted)' }}>
          Action Dock
        </p>
        <p className="text-[11px]" style={{ color: 'var(--sw-muted)' }}>
          Keyboard ready
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {shortcuts.map((shortcut) => {
          const isPressed = pressedKey === shortcut.key;
          const isPrimary = shortcut.action === 'connected' || shortcut.action === 'call';

          return (
            <motion.button
              key={shortcut.key}
              type="button"
              animate={isPressed ? { scale: 0.94, y: -2 } : { scale: 1, y: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => onAction(shortcut)}
              className={`group flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 ${
                isPressed ? shortcut.bg : ''
              }`}
              style={{
                background: isPrimary ? 'rgba(214, 182, 118, 0.14)' : 'rgba(255, 252, 244, 0.045)',
                borderColor: isPrimary ? 'rgba(214, 182, 118, 0.35)' : 'var(--sw-border)',
                color: 'var(--sw-ivory)',
              }}
            >
              <kbd
                className="min-w-6 rounded-lg border px-1.5 py-0.5 text-center text-[11px] font-bold"
                style={{ borderColor: 'var(--sw-border)', color: isPressed ? 'var(--sw-gold)' : 'var(--sw-muted)' }}
              >
                {shortcut.key}
              </kbd>
              <span className={isPressed ? shortcut.color : ''}>{shortcut.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
