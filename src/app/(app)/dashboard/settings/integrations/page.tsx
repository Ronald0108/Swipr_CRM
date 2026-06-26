'use client';

import { useApp } from '@/app/providers';
import { CRM_PROVIDER_INFO, CrmProvider } from '@/app/contexts/CrmContext';
import { Loader2, RefreshCw, Unplug, ArrowDownToLine, ArrowUpFromLine, Repeat2, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

export default function IntegrationsPage() {
  const {
    connections,
    crmAction,
    crmActionProvider,
    crmError,
    crmBusy,
    startOAuth,
    runCrmAction,
    getConnection,
  } = useApp();

  const providers: CrmProvider[] = ['hubspot', 'salesforce'];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2 font-display">Integrations</h1>
        <p className="text-gray-400 text-sm">Manage your CRM connections and data sync settings.</p>
      </div>

      {crmError && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{crmError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((provider) => {
          const info = CRM_PROVIDER_INFO[provider];
          const connection = getConnection(provider);
          const isActing = crmActionProvider === provider;

          return (
            <div
              key={provider}
              className={`border p-6 rounded-2xl transition-all duration-300 ${
                connection
                  ? 'border-[#1f1f2e] bg-[#13131a] shadow-lg shadow-indigo-500/5'
                  : 'border-[#1f1f2e] bg-[#0c0c12]'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs"
                    style={{
                      background: info.bgColor,
                      border: `1px solid ${info.borderColor}`,
                      color: info.accentColor,
                    }}
                  >
                    {info.label.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{info.label}</h2>
                    {connection && (
                      <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Connected
                      </p>
                    )}
                  </div>
                </div>

                {!connection && (
                  <div className="bg-gray-500/10 text-gray-400 text-xs px-2 py-1 rounded-md font-medium">
                    Disconnected
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-400 mb-6 min-h-[48px]">
                {connection
                  ? `Connected as ${connection.account_name ?? 'Org'} (ID: ${connection.portal_id ?? 'N/A'}).`
                  : info.description}
              </p>

              {connection && connection.last_synced_at && (
                <p className="text-xs text-gray-500 mb-4">
                  Last synced: {new Date(connection.last_synced_at).toLocaleString()}
                </p>
              )}

              <div className="flex flex-wrap gap-2.5">
                {!connection ? (
                  <button
                    onClick={() => void startOAuth(provider)}
                    disabled={crmBusy}
                    className="inline-flex items-center justify-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-colors w-full disabled:opacity-40"
                    style={{ background: info.accentColor }}
                  >
                    {isActing && crmAction === 'connect' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        Connect {info.label}
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => void runCrmAction(provider, 'sync')}
                      disabled={crmBusy}
                      className="inline-flex items-center justify-center gap-2 bg-[#1a1a24] hover:bg-[#252535] text-white border border-[#1f1f2e] px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                      {isActing && crmAction === 'sync' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Repeat2 className="w-3.5 h-3.5" />
                      )}
                      Sync
                    </button>
                    <button
                      onClick={() => void runCrmAction(provider, 'import')}
                      disabled={crmBusy}
                      className="inline-flex items-center justify-center gap-2 bg-[#1a1a24] hover:bg-[#252535] text-white border border-[#1f1f2e] px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                      {isActing && crmAction === 'import' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                      )}
                      Import
                    </button>
                    <button
                      onClick={() => void runCrmAction(provider, 'export')}
                      disabled={crmBusy}
                      className="inline-flex items-center justify-center gap-2 bg-[#1a1a24] hover:bg-[#252535] text-white border border-[#1f1f2e] px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                      {isActing && crmAction === 'export' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ArrowUpFromLine className="w-3.5 h-3.5" />
                      )}
                      Export
                    </button>
                    <button
                      onClick={() => void runCrmAction(provider, 'disconnect')}
                      disabled={crmBusy}
                      className="inline-flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 ml-auto"
                    >
                      {isActing && crmAction === 'disconnect' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Unplug className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
