import { AnimatePresence, motion } from 'motion/react';
import type { CallNotice } from '@/app/types/import';

export function CallNoticeToast({ notice }: { notice: CallNotice | null }) {
  return (
    <AnimatePresence>
      {notice ? (
        <motion.div
          key="call-notice"
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.16 }}
          role="status"
          aria-live="polite"
          className={`fixed right-5 top-5 z-[70] rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl ${notice.kind === 'success'
            ? 'border-blue-300 bg-blue-50 text-blue-900'
            : 'border-rose-300 bg-rose-50 text-rose-900'
            }`}
          >
          <span>{notice.message}</span>
          <motion.span
            key={`${notice.message}-expiry`}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: (notice.durationMs ?? 2600) / 1000, ease: 'linear' }}
            className="absolute bottom-0 left-0 right-0 h-0.5 origin-left bg-current opacity-60"
            aria-hidden="true"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
