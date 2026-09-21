'use client';

import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw, X, Unplug, ArrowDownToLine, ArrowUpFromLine, Repeat2, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '@/app/providers';
import { CRM_PROVIDER_INFO, type CrmProvider as CrmProviderType } from '@/app/contexts/CrmContext';

/** CRM Provider brand logos (inline SVG for crisp rendering) */
function ProviderLogo({ provider, size = 24 }: { provider: CrmProviderType; size?: number }) {
  const info = CRM_PROVIDER_INFO[provider];
  return (
    <div className="flex items-center justify-center rounded-xl"
      style={{ width: size + 12, height: size + 12, background: info.bgColor, border: `1px solid ${info.borderColor}` }}>
      <span className="font-bold" style={{ fontSize: size * 0.5, color: info.accentColor }}>
        {info.label.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

/** Connection status indicator */
function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: '#10B981',
    error: '#F59E0B',
    disconnected: '#6B7280',
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full rounded-full opacity-50"
        style={{ backgroundColor: colors[status] ?? '#6B7280', animation: status === 'active' ? 'pulse-glow 2s infinite' : 'none' }} />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: colors[status] ?? '#6B7280' }} />
    </span>
  );
}

export function CrmModal() {
  const {
    showCrmModal, setShowCrmModal,
    connections, syncRuns, crmAction, crmActionProvider, crmError, crmResult, crmBusy,
    startOAuth, runCrmAction, getConnection,
  } = useApp();

  const allProviders: CrmProviderType[] = ['hubspot', 'salesforce', 'pipedrive', 'zoho'];

  return (
    <AnimatePresence>
      {showCrmModal ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={(event) => { if (event.target === event.currentTarget) setShowCrmModal(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-3xl rounded-3xl overflow-hidden"
            style={{
              background: 'var(--surface-overlay)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-modal)',
              backdropFilter: 'blur(var(--glass-blur))',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--accent-indigo-soft)', border: '1px solid rgba(67, 130, 223, 0.2)' }}>
                  <RefreshCw className="w-5 h-5 text-[var(--accent-indigo)]" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] text-lg font-semibold tracking-tight">Integrations</h3>
                  <p className="text-[var(--text-secondary)] text-xs">Connect your CRM to sync contacts with Swipr.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCrmModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--input-bg)]"
              >
                <X className="w-4 h-4 text-[var(--text-tertiary)]" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Error Banner */}
              {crmError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl px-4 py-3 text-sm flex items-start gap-3"
                  style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)' }}
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span className="text-rose-300/90 text-xs">{crmError}</span>
                </motion.div>
              )}

              {/* Sync Result */}
              {crmResult && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-4 gap-2"
                >
                  {([
                    ['Created', crmResult.created, '#10B981'],
                    ['Updated', crmResult.updated, '#6366F1'],
                    ['Skipped', crmResult.skipped, '#F59E0B'],
                    ['Failed', crmResult.failed, '#F43F5E'],
                  ] as const).map(([label, value, color]) => (
                    <div key={label} className="rounded-xl px-3 py-2.5 text-center"
                      style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                      <p className="text-[var(--text-primary)] text-lg font-bold tabular-nums">{value}</p>
                      <p className="text-[var(--text-secondary)] text-[10px] font-medium">{label}</p>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* CRM Provider Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allProviders.map((provider, i) => {
                  const info = CRM_PROVIDER_INFO[provider];
                  const connection = getConnection(provider);
                  const lastRun = syncRuns[provider];
                  const isActingOnThis = crmActionProvider === provider;

                  return (
                    <motion.div
                      key={provider}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: 'var(--input-bg)',
                        border: connection ? `1px solid ${info.borderColor}` : '1px solid var(--border-subtle)',
                      }}
                    >
                      {/* Provider Header */}
                      <div className="px-4 py-3 flex items-center gap-3">
                        <ProviderLogo provider={provider} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--text-primary)] text-sm font-semibold">{info.label}</span>
                            {connection && <StatusDot status={connection.status} />}
                            {!info.available && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
                                style={{ background: 'var(--input-bg)', color: 'var(--text-tertiary)' }}>
                                COMING SOON
                              </span>
                            )}
                          </div>
                          <p className="text-[var(--text-secondary)] text-[10px] mt-0.5 truncate">
                            {connection
                              ? `${connection.account_name ?? 'Connected'}${connection.last_synced_at ? ` · Last synced ${new Date(connection.last_synced_at).toLocaleString()}` : ''}`
                              : info.description
                            }
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {info.available && (
                        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                          {!connection ? (
                            <button
                              onClick={() => void startOAuth(provider)}
                              disabled={crmBusy}
                              className="btn-premium flex-1 rounded-xl px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40 hover:opacity-90"
                              style={{ background: info.accentColor, border: `1px solid ${info.accentColor}` }}
                            >
                              {isActingOnThis && crmAction === 'connect' ? (
                                <span className="flex items-center gap-1.5 justify-center">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Connecting…
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 justify-center">
                                  <ExternalLink className="w-3 h-3" /> Connect {info.label}
                                </span>
                              )}
                            </button>
                          ) : (
                            <>
                              {([
                                { action: 'import' as const, icon: ArrowDownToLine, label: 'Import' },
                                { action: 'export' as const, icon: ArrowUpFromLine, label: 'Export' },
                                { action: 'sync' as const, icon: Repeat2, label: 'Sync' },
                              ]).map(({ action, icon: Icon, label }) => (
                                <button
                                  key={action}
                                  onClick={() => void runCrmAction(provider, action)}
                                  disabled={crmBusy}
                                  className="btn-premium rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)] disabled:opacity-30 flex items-center gap-1 transition-colors hover:bg-[var(--input-bg)]/80"
                                  style={{ border: '1px solid var(--border-subtle)' }}
                                >
                                  {isActingOnThis && crmAction === action ? (
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  ) : (
                                    <Icon className="w-2.5 h-2.5" />
                                  )}
                                  {label}
                                </button>
                              ))}
                              <button
                                onClick={() => void runCrmAction(provider, 'disconnect')}
                                disabled={crmBusy}
                                className="btn-premium rounded-lg px-2 py-1.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 disabled:opacity-30 flex items-center gap-1 transition-colors hover:bg-rose-500/15"
                                style={{ border: '1px solid rgba(244,63,94,0.15)' }}
                              >
                                {isActingOnThis && crmAction === 'disconnect' ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Unplug className="w-2.5 h-2.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Last Sync Info */}
                      {lastRun && (
                        <div className="px-4 py-2 text-[10px] text-[var(--text-tertiary)] flex items-center gap-1.5"
                          style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          {lastRun.status === 'success' ? (
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500/50" />
                          ) : (
                            <AlertCircle className="w-2.5 h-2.5 text-amber-500/50" />
                          )}
                          Last {lastRun.operation}: {lastRun.status} · {new Date(lastRun.started_at).toLocaleString()}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
