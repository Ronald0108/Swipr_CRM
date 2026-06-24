'use client';

import { useApp } from '@/app/providers';
import { CheckCircle, XCircle, Voicemail, SkipForward, RefreshCw, Loader2, Link2 } from 'lucide-react';
import { CRM_PROVIDER_INFO, CrmProvider } from '@/app/contexts/CrmContext';
import { motion } from 'motion/react';

export function StatsSidebar() {
  const {
    leads,
    currentIndex,
    statsCount,
    connections,
    syncRuns,
    crmBusy,
    crmAction,
    crmActionProvider,
    runCrmAction,
    setShowCrmModal,
  } = useApp();

  // Progress metrics
  const totalLeads = leads.length;
  const reviewedCount = Math.min(currentIndex, totalLeads);
  const progressPercent = totalLeads > 0 ? Math.round((reviewedCount / totalLeads) * 100) : 0;

  // SVG parameters for progress circle
  const radius = 38;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const providers: CrmProvider[] = ['hubspot', 'salesforce'];

  return (
    <aside
      className="w-72 flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        background: 'var(--sidebar)',
        backdropFilter: 'blur(var(--glass-blur)) saturate(180%)',
        borderLeft: '1px solid var(--border-subtle)',
      }}
    >
      <div className="w-72 flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar p-5 space-y-6">
        
        {/* Section 1: Progress Circle */}
        <div>
          <h4 className="text-[var(--text-tertiary)] text-[10px] uppercase tracking-[0.15em] font-bold mb-3">
            Review Session
          </h4>
          <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-subtle)' }}>
            <div className="relative flex items-center justify-center flex-shrink-0">
              <svg className="w-20 h-20 transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="var(--border-subtle)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Foreground Ring */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="var(--accent-indigo)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[var(--text-primary)] text-sm font-bold leading-none">{progressPercent}%</span>
                <span className="text-[var(--text-tertiary)] text-[8px] mt-0.5 font-medium uppercase tracking-wider">Done</span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-primary)] text-xs font-semibold">Leads Progress</p>
              <p className="text-[var(--text-tertiary)] text-[10px] mt-1 tabular-nums">
                {reviewedCount} of {totalLeads} reviewed
              </p>
              <div className="w-full bg-[var(--border-subtle)] h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-[var(--accent-indigo)] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Outcome Grid */}
        <div>
          <h4 className="text-[var(--text-tertiary)] text-[10px] uppercase tracking-[0.15em] font-bold mb-3">
            Metrics
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            {([
              { 
                icon: CheckCircle, 
                count: statsCount.connected, 
                color: 'text-emerald-500', 
                bgColor: 'rgba(16, 185, 129, 0.08)',
                borderColor: 'rgba(16, 185, 129, 0.15)',
                label: 'Connected' 
              },
              { 
                icon: XCircle, 
                count: statsCount.lost, 
                color: 'text-rose-500', 
                bgColor: 'rgba(244, 63, 94, 0.08)',
                borderColor: 'rgba(244, 63, 94, 0.15)',
                label: 'Lost' 
              },
              { 
                icon: Voicemail, 
                count: statsCount.voicemail, 
                color: 'text-amber-500', 
                bgColor: 'rgba(245, 158, 11, 0.08)',
                borderColor: 'rgba(245, 158, 11, 0.15)',
                label: 'Voicemail' 
              },
              { 
                icon: SkipForward, 
                count: statsCount.next, 
                color: 'text-sky-500', 
                bgColor: 'rgba(56, 189, 248, 0.08)',
                borderColor: 'rgba(56, 189, 248, 0.15)',
                label: 'Skipped' 
              },
            ] as const).map(({ icon: Icon, count, color, bgColor, borderColor, label }) => (
              <div 
                key={label} 
                className="rounded-2xl p-3 flex flex-col justify-between transition-all hover:scale-[1.02]"
                style={{ 
                  background: 'var(--input-bg)', 
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: bgColor }}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <span className="text-[var(--text-primary)] text-sm font-bold tabular-nums">{count}</span>
                </div>
                <p className="text-[var(--text-secondary)] text-[10px] font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: CRM Connection Status */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[var(--text-tertiary)] text-[10px] uppercase tracking-[0.15em] font-bold">
              CRM Sync
            </h4>
            <button
              onClick={() => setShowCrmModal(true)}
              className="text-[var(--accent-indigo)] text-[10px] font-semibold flex items-center gap-1 hover:underline"
            >
              <Link2 className="w-2.5 h-2.5" /> Configure
            </button>
          </div>

          <div className="space-y-2">
            {providers.map((provider) => {
              const info = CRM_PROVIDER_INFO[provider];
              const conn = connections.find(c => c.provider === provider);
              const run = syncRuns[provider];
              const isSyncing = crmBusy && crmActionProvider === provider && crmAction === 'sync';

              return (
                <div
                  key={provider}
                  className="rounded-2xl p-3.5 space-y-2.5 transition-all"
                  style={{
                    background: 'var(--input-bg)',
                    border: conn ? `1px solid ${info.borderColor}` : '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                        style={{ background: info.bgColor, color: info.accentColor, border: `1px solid ${info.borderColor}` }}
                      >
                        {info.label.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[var(--text-primary)] text-xs font-semibold">{info.label}</p>
                        <p className="text-[var(--text-secondary)] text-[9px] truncate max-w-[120px]">
                          {conn ? (conn.account_name ?? 'Connected') : 'Disconnected'}
                        </p>
                      </div>
                    </div>

                    {conn ? (
                      <button
                        onClick={() => void runCrmAction(provider, 'sync')}
                        disabled={crmBusy}
                        className="btn-premium px-2 py-1 rounded-lg text-[9px] font-bold text-[var(--text-secondary)] disabled:opacity-40 transition-colors flex items-center gap-1 hover:bg-[var(--input-bg)]/80"
                        style={{ border: '1px solid var(--border-subtle)' }}
                        title="Sync leads with CRM"
                      >
                        {isSyncing ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-2.5 h-2.5" />
                        )}
                        Sync
                      </button>
                    ) : (
                      <span className="text-[8px] font-bold text-[var(--text-tertiary)] bg-[var(--border-subtle)] px-1.5 py-0.5 rounded-md">
                        OFFLINE
                      </span>
                    )}
                  </div>

                  {conn && (
                    <div className="text-[9px] text-[var(--text-tertiary)] flex flex-col gap-0.5 pt-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <span className="font-medium truncate">
                        Last synced: {conn.last_synced_at ? new Date(conn.last_synced_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Never'}
                      </span>
                      {run && (
                        <span className="opacity-80 truncate">
                          Last run: {run.status === 'success' ? '✓ Success' : '✗ Failed'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </aside>
  );
}
