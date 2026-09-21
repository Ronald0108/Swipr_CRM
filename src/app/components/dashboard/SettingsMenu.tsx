'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Crown, LogOut, Settings, Trash2, User, Webhook, CheckCircle } from 'lucide-react';
import { useApp } from '@/app/providers';

type SettingsPanel = 'account' | 'upgrade' | null;

export function SettingsMenu() {
  const { deleteAllLeads, handleLogout, leads, session } = useApp();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<SettingsPanel>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletingAllLeads, setDeletingAllLeads] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const userEmail = session?.user?.email ?? '';
  const userInitial = userEmail ? userEmail[0].toUpperCase() : 'U';

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:ring-2 hover:ring-indigo-500/30"
        style={{
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
        }}
      >
        <span className="text-white text-xs font-bold">{userInitial}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-2xl p-1.5"
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-modal)',
              backdropFilter: 'blur(40px)',
            }}
          >
            {/* User Info */}
            <div className="px-3 py-2.5 mb-1">
              <p className="text-[var(--text-primary)] text-xs font-semibold truncate">{userEmail || 'Signed in'}</p>
              <p className="text-[var(--text-tertiary)] text-[10px] mt-0.5">Swipr Account</p>
            </div>

            <div className="h-px mx-2 mb-1" style={{ background: 'var(--border-subtle)' }} />

            <button
              type="button"
              onClick={() => { setPanel('account'); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--input-bg)]"
            >
              <User className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              Account Settings
            </button>

            <a
              href="/dashboard/settings/team"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--input-bg)]"
            >
              <Webhook className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              Team Settings
            </a>

            <button
              type="button"
              onClick={() => { setPanel('upgrade'); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--input-bg)]"
            >
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              Upgrade Plan
            </button>

            <div className="h-px mx-2 my-1" style={{ background: 'var(--border-subtle)' }} />

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-rose-300/70 transition-colors hover:bg-rose-500/[0.08]"
            >
              <LogOut className="h-3.5 w-3.5 text-rose-400/60" />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel Modal */}
      <AnimatePresence>
        {panel && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPanel(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-3xl p-6"
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--shadow-modal)',
                backdropFilter: 'blur(40px)',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-[0.15em]">
                    Settings
                  </p>
                  <h2 className="mt-1.5 text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    {panel === 'account' ? 'Account Settings' : 'Upgrade Plan'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--input-bg)]"
                >
                  <span className="text-[var(--text-tertiary)] text-xs font-semibold">✕</span>
                </button>
              </div>

              {panel === 'account' ? (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Display Name</label>
                    <input type="text" defaultValue="John Doe" className="w-full bg-[var(--input-bg)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Email Address</label>
                    <input type="email" defaultValue={userEmail} disabled className="w-full bg-[var(--input-bg)] border border-[var(--border-default)] text-[var(--text-tertiary)] text-sm rounded-xl px-4 py-2.5 cursor-not-allowed" />
                  </div>
                  <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-end">
                    <button onClick={() => setPanel(null)} className="btn-premium px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                      Save Changes
                    </button>
                  </div>

                  <div className="border-t border-rose-500/20 pt-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400" />
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Delete all leads</h3>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--text-tertiary)]">
                          Permanently remove all {leads.length} leads from the active account. This cannot be undone.
                        </p>
                      </div>
                    </div>
                    {deleteAllError && <p className="mt-3 text-xs text-rose-400">{deleteAllError}</p>}
                    <button
                      type="button"
                      onClick={() => { setDeleteAllError(''); setShowDeleteAllConfirm(true); }}
                      disabled={deletingAllLeads || leads.length === 0}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete all leads
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl p-5" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-default)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[var(--text-primary)] font-bold text-lg">Pro Tier</span>
                      <span className="text-indigo-500 font-black text-xl">$49<span className="text-[var(--text-tertiary)] text-sm font-semibold">/mo</span></span>
                    </div>
                    <ul className="space-y-3 mb-6">
                      {['Unlimited Lead Storage', 'Advanced CRM Integrations', 'Custom AI Scoring', 'Priority Support'].map(feat => (
                        <li key={feat} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-medium">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full btn-premium py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                      Subscribe via Stripe
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteAllConfirm && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!deletingAllLeads) setShowDeleteAllConfirm(false); }}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl p-6"
              style={{ background: 'var(--panel-bg)', border: '1px solid rgba(244,63,94,0.25)', boxShadow: 'var(--shadow-modal)' }}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-400" />
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Delete every lead?</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    This will permanently delete all {leads.length} leads from this account. This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteAllConfirm(false)}
                  disabled={deletingAllLeads}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--input-bg)] disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingAllLeads(true);
                    setDeleteAllError('');
                    void deleteAllLeads()
                      .then(() => { setShowDeleteAllConfirm(false); })
                      .catch((error: unknown) => {
                        setDeleteAllError(error instanceof Error ? error.message : 'Failed to delete leads.');
                      })
                      .finally(() => setDeletingAllLeads(false));
                  }}
                  disabled={deletingAllLeads}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingAllLeads ? 'Deleting...' : 'Delete everything'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
