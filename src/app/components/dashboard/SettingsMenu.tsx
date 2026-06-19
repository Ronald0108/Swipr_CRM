'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crown, LogOut, Settings, User } from 'lucide-react';
import { useApp } from '@/app/providers';

type SettingsPanel = 'account' | 'upgrade' | null;

export function SettingsMenu() {
  const { handleLogout } = useApp();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<SettingsPanel>(null);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2 bg-[#1f2937] border border-[#374151]"
      >
        <Settings className="h-4 w-4" />
        Settings
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-xl border border-[#252538] bg-[#11111a] p-1.5 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => { setPanel('account'); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-white/5"
            >
              <User className="h-4 w-4 text-gray-400" />
              Account settings
            </button>
            <button
              type="button"
              onClick={() => { setPanel('upgrade'); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-white/5"
            >
              <Crown className="h-4 w-4 text-amber-300" />
              Upgrade account
            </button>
            <div className="my-1 h-px bg-[#252538]" />
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-200 transition-colors hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4 text-rose-300" />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPanel(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-[#252538] bg-[#11111a] p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                    Settings
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    {panel === 'account' ? 'Account settings' : 'Upgrade account'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="rounded-lg border border-[#2f2f45] px-2 py-1 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/5"
                >
                  Close
                </button>
              </div>
              <div className="mt-5 rounded-xl border border-[#252538] bg-[#0b0b12] p-4">
                {panel === 'account' ? (
                  <>
                    <p className="text-sm font-semibold text-white">Profile controls coming soon</p>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      This placeholder will contain profile, password, notification, and workspace preferences.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-white">Billing controls coming soon</p>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      This placeholder will contain plan selection, subscription status, invoices, and payment management.
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
