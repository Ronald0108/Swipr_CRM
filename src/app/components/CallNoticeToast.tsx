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
            ? 'border-blue-400/30 bg-blue-500/20 text-blue-100'
            : 'border-rose-400/30 bg-rose-500/20 text-rose-100'
            }`}
          style={{ backdropFilter: 'blur(16px)' }}
        >
          {notice.message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
