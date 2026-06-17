'use client';

import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw, X, Unplug } from 'lucide-react';
import { useApp } from '@/app/providers';

export function CrmModal() {
  const {
    showCrmModal, setShowCrmModal,
    crmConnection, crmLastRun, crmAction, crmError, crmResult, crmBusy,
    startHubSpotOAuth, runHubSpotAction,
  } = useApp();

  return (
    <AnimatePresence>
      {showCrmModal ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(event) => { if (event.target === event.currentTarget) setShowCrmModal(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-3xl rounded-3xl border overflow-hidden"
            style={{ background: '#11111a', borderColor: '#1f1f2e' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1f1f2e' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <h3 className="text-white text-lg font-semibold">HubSpot CRM Integration</h3>
                  <p className="text-gray-400 text-sm">Import, export, and manually sync HubSpot contacts.</p>
                </div>
              </div>
              <button onClick={() => setShowCrmModal(false)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-2xl border p-4" style={{ background: '#0d0d14', borderColor: '#1f1f2e' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500">Connection</p>
                    <p className="mt-1 text-white font-semibold">{crmConnection ? crmConnection.account_name ?? 'HubSpot connected' : 'HubSpot not connected'}</p>
                    <p className="mt-1 text-sm text-gray-500">{crmConnection ? `Status: ${crmConnection.status}${crmConnection.portal_id ? ` · Portal ${crmConnection.portal_id}` : ''}` : 'Connect your HubSpot account to start syncing contacts.'}</p>
                    {crmConnection?.last_synced_at ? (<p className="mt-1 text-xs text-gray-600">Last synced: {new Date(crmConnection.last_synced_at).toLocaleString()}</p>) : null}
                  </div>
                  <button onClick={() => void startHubSpotOAuth()} disabled={crmBusy} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#4f46e5' }}>
                    {crmAction === 'connect' ? 'Connecting...' : crmConnection ? 'Reconnect HubSpot' : 'Connect HubSpot'}
                  </button>
                </div>
              </div>
              {crmError ? (<div className="rounded-xl border px-4 py-3 text-sm text-rose-300" style={{ background: '#2a1117', borderColor: '#5a1f2b' }}>{crmError}</div>) : null}
              {crmResult ? (
                <div className="grid grid-cols-4 gap-2">
                  {([['Created', crmResult.created], ['Updated', crmResult.updated], ['Skipped', crmResult.skipped], ['Failed', crmResult.failed]] as const).map(([label, value]) => (
                    <div key={label} className="rounded-xl border px-3 py-2 text-center" style={{ background: '#0d0d14', borderColor: '#1f1f2e' }}>
                      <p className="text-white text-lg font-bold">{value}</p>
                      <p className="text-gray-500 text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { action: 'import' as const, label: 'Import from HubSpot', description: 'Pull HubSpot contacts into Swipr.' },
                  { action: 'export' as const, label: 'Export to HubSpot', description: 'Push Swipr leads and activity notes.' },
                  { action: 'sync' as const, label: 'Sync HubSpot', description: 'Run import then export.' },
                ]).map((item) => (
                  <button key={item.action} onClick={() => void runHubSpotAction(item.action)} disabled={!crmConnection || crmBusy}
                    className="rounded-2xl border p-4 text-left transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: '#0d0d14', borderColor: '#1f1f2e' }}>
                    <p className="text-white text-sm font-semibold">{crmAction === item.action ? 'Working...' : item.label}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.description}</p>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border p-4" style={{ background: '#0d0d14', borderColor: '#1f1f2e' }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white text-sm font-semibold">Last sync run</p>
                    <p className="mt-1 text-xs text-gray-500">{crmLastRun ? `${crmLastRun.operation} · ${crmLastRun.status} · ${new Date(crmLastRun.started_at).toLocaleString()}` : 'No HubSpot sync has run yet.'}</p>
                  </div>
                  <button onClick={() => void runHubSpotAction('disconnect')} disabled={!crmConnection || crmBusy}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 disabled:cursor-not-allowed disabled:opacity-40">
                    <Unplug className="h-4 w-4" />{crmAction === 'disconnect' ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
