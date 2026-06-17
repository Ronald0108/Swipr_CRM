'use client';

import { useEffect } from 'react';
import {
  Award,
  BarChart3,
  CheckCircle,
  ArrowUpToLine,
  Download,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  SkipForward,
  Trash2,
  Unplug,
  Upload,
  Users,
  Voicemail,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { LeadCard, type SwipeAction } from '@/app/components/LeadCard';
import { NotesModal } from '@/app/components/NotesModal';
import { EmailDraftModal } from '@/app/components/EmailDraftModal';
import {
  useApp,
  actionMeta,
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_STRIDE,
  CONTAINER_H,
  CENTER_Y,
  IMPORTABLE_FIELDS,
  timeAgo,
  LeadImportField,
} from '@/app/providers';
import type { ActivityType } from '@/app/types/activity';

// ── Shortcut keys ─────────────────────────────────────────────────────────
type AnyAction = SwipeAction | 'notes' | 'email' | 'call' | 'previous';

const KEY_ACTIONS: Record<string, AnyAction> = {
  q: 'voicemail', e: 'notes', a: 'lost', d: 'connected',
  c: 'call', x: 'email', r: 'next', t: 'previous',
};

const SHORTCUT_KEYS: {
  key: string; label: string; action: AnyAction;
  color: string; bg: string;
}[] = [
    { key: 'Q', label: 'Voicemail', action: 'voicemail', color: 'text-amber-400', bg: 'border-amber-500/40 bg-amber-500/10' },
    { key: 'A', label: 'Lost', action: 'lost', color: 'text-rose-400', bg: 'border-rose-500/40 bg-rose-500/10' },
    { key: 'D', label: 'Connected', action: 'connected', color: 'text-emerald-400', bg: 'border-emerald-500/40 bg-emerald-500/10' },
    { key: 'R', label: 'Next', action: 'next', color: 'text-sky-400', bg: 'border-sky-500/40 bg-sky-500/10' },
    { key: 'T', label: 'Previous', action: 'previous', color: 'text-gray-300', bg: 'border-gray-500/40 bg-gray-500/10' },
    { key: 'C', label: 'Call', action: 'call', color: 'text-blue-400', bg: 'border-blue-500/40 bg-blue-500/10' },
    { key: 'E', label: 'Notes', action: 'notes', color: 'text-yellow-300', bg: 'border-yellow-500/40 bg-yellow-500/10' },
    { key: 'X', label: 'Email', action: 'email', color: 'text-purple-400', bg: 'border-purple-500/40 bg-purple-500/10' },
  ];

// ── CallNotice Toast ──────────────────────────────────────────────────────
function CallNoticeToast({ notice }: { notice: { kind: 'success' | 'error'; message: string } | null }) {
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

// ── Home Page ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const app = useApp();

  const {
    session, authLoading, authSubmitting, email, setEmail, password, setPassword, authError,
    handleLogin, handleLogout,
    leads, currentIndex, setCurrentIndex, leadsLoading, fetchLeads, currentLead, isDone,
    activityLog, statsCount, setStatsCount, setActivityLog,
    showNotesModal, setShowNotesModal, showEmailModal, setShowEmailModal,
    showLeadSearch, setShowLeadSearch, showDeleteConfirm, setShowDeleteConfirm,
    showImportModal, setShowImportModal, showCrmModal, setShowCrmModal,
    handleLeadEdit, autoEditLeadId, autoEditLeadToken,
    handleCreateLead, creatingLead, handleDeleteCurrentLead, deletingLead,
    callNotice, promptLeadCall, promptLeadEmail,
    handleSaveNotes, handleEmailSent,
    leadSearchQuery, setLeadSearchQuery, jumpToLeadSearch, jumpToLeadSearchIndex, leadSearchMatchCount,
    navigatePrev, navigateNext, jumpToFirstLead, triggerSwipeAction,
    overlayInfo, pressedKey, setPressedKey,
    isAnimatingRef, cardAreaRef,
    csvHeaders, csvRows, csvPreviewRows, columnMapping, setColumnMapping,
    importFileName, importError, setImportError, importSuccess, setImportSuccess, importing,
    handleCsvSelected, clearCsvSelection, handleImportLeads,
    crmConnection, crmLastRun, crmAction, crmError, setCrmError, crmResult, crmBusy,
    loadCrmStatus, startHubSpotOAuth, runHubSpotAction,
    getLeadStatusLabel, openLeadHistory, currentLeadIdRef,
  } = app;

  const total = leads.length;
  const progress = total > 0 ? (currentIndex / total) * 100 : 0;
  const remaining = Math.max(0, total - currentIndex);
  const currentLeadPosition = total > 0 ? Math.min(currentIndex + 1, total) : 0;

  // ── Wheel event for rolodex scroll ───────────────────────────────────
  useEffect(() => {
    const el = cardAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 20) navigateNext();
      else if (e.deltaY < -20) navigatePrev();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [navigateNext, navigatePrev, cardAreaRef]);

  // ── Keyboard handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const noModal = !showNotesModal && !showEmailModal;

      if (noModal && e.key === 'ArrowDown') { e.preventDefault(); navigateNext(); return; }
      if (noModal && e.key === 'ArrowUp') { e.preventDefault(); navigatePrev(); return; }
      if (e.key === 'Enter' && noModal && currentLead) { e.preventDefault(); openLeadHistory(currentLead.id); return; }

      const key = e.key.toLowerCase();
      const action = KEY_ACTIONS[key];
      if (!action) return;

      setPressedKey(key.toUpperCase());
      setTimeout(() => setPressedKey(null), 300);

      if (action === 'notes') { if (noModal) setShowNotesModal(true); }
      else if (action === 'email') { if (noModal) promptLeadEmail(currentLead); }
      else if (action === 'call') { if (noModal) promptLeadCall(currentLead); }
      else if (action === 'previous') { if (noModal) navigatePrev(); }
      else { if (noModal) triggerSwipeAction(action as SwipeAction); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSwipeAction, navigatePrev, navigateNext, showNotesModal, showEmailModal, currentLead, openLeadHistory, promptLeadCall, promptLeadEmail, setPressedKey, setShowNotesModal]);

  // ── CRM Modal ──
  const crmModal = (
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

  // ── Auth loading ──
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <p className="text-white text-lg font-semibold">Loading Swipr CRM...</p>
          <p className="text-gray-500 text-sm mt-2">Checking your session</p>
        </div>
      </div>
    );
  }

  // ── Login ──
  if (!session) {
    return (
      <div className="login-gradient-bg h-screen w-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border p-8" style={{ background: '#13131a', borderColor: '#1c1c2a' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
              <img src="/images/logo_transparent.png" alt="Swipr CRM Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold tracking-tight">SwiprCRM</h1>
              <p className="text-gray-400 text-sm"></p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void handleLogin(); }}>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
                className="w-full rounded-xl border px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none"
                style={{ background: '#0a0a0f', borderColor: '#1c1c2a' }} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
                className="w-full rounded-xl border px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none"
                style={{ background: '#0a0a0f', borderColor: '#1c1c2a' }} />
            </div>
            {authError ? (<div className="rounded-xl border px-3 py-2 text-sm text-rose-300" style={{ background: '#2a1117', borderColor: '#5a1f2b' }}>{authError}</div>) : null}
            <div className="pt-2">
              <button type="submit" disabled={authSubmitting} className="w-full rounded-xl px-4 py-3 text-white font-semibold transition-colors disabled:opacity-60" style={{ background: '#4f46e5' }}>
                {authSubmitting ? 'Loading...' : 'Log In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Leads loading ──
  if (leadsLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <p className="text-white text-lg font-semibold">Loading SwiprCRM...</p>
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (leads.length === 0) {
    return (
      <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ background: '#0a0a0f' }}>
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: '#1c1c2a' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
              <img src="/images/logo_transparent.png" alt="Swipr CRM logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-bold tracking-tight">Swipr CRM</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => void handleCreateLead()} disabled={creatingLead} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-60" style={{ background: '#4f46e5', border: '1px solid #6366f1' }}>
              <Plus className="w-4 h-4" />{creatingLead ? 'Adding...' : 'Add Lead'}
            </button>
            <button onClick={() => { setShowCrmModal(true); setCrmError(''); void loadCrmStatus(); }} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2" style={{ background: '#164e63', border: '1px solid #0e7490' }}>
              <RefreshCw className="w-4 h-4" />CRM Integration
            </button>
            <button onClick={() => { setShowImportModal(true); setImportError(''); setImportSuccess(''); }} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2" style={{ background: '#312e81', border: '1px solid #4338ca' }}>
              <Download className="w-4 h-4" />Import Leads
            </button>
            <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors" style={{ background: '#1f2937', border: '1px solid #374151' }}>Logout</button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 text-center">
          <div>
            <Users className="w-10 h-10 text-gray-700 mx-auto mb-4" />
            <p className="text-white text-lg font-semibold">No leads loaded</p>
            <p className="text-gray-500 text-sm mt-2">Add a lead manually or import a CSV to start reviewing leads.</p>
            <button onClick={() => void handleCreateLead()} disabled={creatingLead} className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60" style={{ background: '#4f46e5' }}>
              <Plus className="w-4 h-4" />{creatingLead ? 'Adding...' : 'Add Lead'}
            </button>
            <button onClick={() => { setShowCrmModal(true); setCrmError(''); void loadCrmStatus(); }} className="ml-3 mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors" style={{ background: '#164e63' }}>
              <RefreshCw className="w-4 h-4" />CRM Integration
            </button>
          </div>
        </main>
        {/* Import modal (empty state) */}
        <AnimatePresence>
          {showImportModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowImportModal(false); }}>
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 18 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }} className="w-full max-w-5xl rounded-3xl border overflow-hidden" style={{ background: '#11111a', borderColor: '#1f1f2e' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1f1f2e' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-indigo-300" /></div>
                    <div><h3 className="text-white text-lg font-semibold">Import Leads from CSV</h3><p className="text-gray-400 text-sm">Upload a CSV, preview the rows, and choose which columns to import.</p></div>
                  </div>
                  <button onClick={() => setShowImportModal(false)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
                </div>
                <div className="p-6">
                  <label htmlFor="csv-upload-input-empty" className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-8 cursor-pointer text-center transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/5" style={{ borderColor: '#2a2a3a' }}>
                    <Upload className="w-8 h-8 text-indigo-300" />
                    <div><p className="text-white font-medium">Choose CSV file</p><p className="text-gray-500 text-sm mt-1">Click to upload lead data from your computer</p></div>
                    <input id="csv-upload-input-empty" type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void handleCsvSelected(e.target.files?.[0] ?? null)} />
                  </label>
                  <div className="mt-4 rounded-2xl border px-4 py-3 text-left" style={{ background: '#13131a', borderColor: '#1f1f2e' }}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-gray-500 text-xs uppercase tracking-wider">Selected file</p>
                      {importFileName ? (<button type="button" onClick={clearCsvSelection} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 transition-colors"><X className="w-3.5 h-3.5" />Remove file</button>) : null}
                    </div>
                    <p className="text-white text-sm font-medium break-all">{importFileName || 'No file chosen yet'}</p>
                    <p className="text-gray-500 text-xs mt-2">{csvHeaders.length > 0 ? `${csvHeaders.length} columns detected · ${csvRows.length} row${csvRows.length === 1 ? '' : 's'} ready` : 'Choose a CSV to load it into the importer.'}</p>
                  </div>
                  {importError ? (<div className="mt-4 rounded-xl border px-4 py-3 text-left text-sm text-rose-300" style={{ background: '#2a1117', borderColor: '#5a1f2b' }}>{importError}</div>) : null}
                  {importSuccess ? (<div className="mt-4 rounded-xl border px-4 py-3 text-left text-sm text-emerald-300" style={{ background: '#0f2218', borderColor: '#1d5134' }}>{importSuccess}</div>) : null}
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => void handleImportLeads()} disabled={importing} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60" style={{ background: '#4f46e5' }}>
                      {importing ? 'Importing...' : 'Import Leads'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {crmModal}
      </div>
    );
  }

  // ── Main rolodex view ──
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ background: '#0a0a0f' }}>
      {/* ── TOP BAR ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: '#1c1c2a' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
            <img src="/images/logo_transparent.png" alt="Swipr CRM logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-white font-bold tracking-tight">Swipr CRM</span>
        </div>
        <div className="flex items-center gap-2">
          {([
            { icon: CheckCircle, count: statsCount.connected, color: 'text-emerald-400', label: 'Connected' },
            { icon: XCircle, count: statsCount.lost, color: 'text-rose-400', label: 'Lost' },
            { icon: Voicemail, count: statsCount.voicemail, color: 'text-amber-400', label: 'Voicemail' },
            { icon: SkipForward, count: statsCount.next, color: 'text-sky-400', label: 'Skipped' },
          ] as const).map(({ icon: Icon, count, color, label }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#13131a', border: '1px solid #1c1c2a' }}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-white font-semibold text-sm">{count}<span className="text-gray-600 font-normal">/{total}</span></span>
              <span className="text-gray-500 text-xs hidden md:block">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end gap-0.5">
            <span className="text-white text-sm font-semibold">Lead {currentLeadPosition} of {total}</span>
            <div className="w-32 h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#13131a', border: '1px solid #1c1c2a' }}>
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-white font-semibold text-sm">{remaining}</span>
            <span className="text-gray-500 text-xs">left</span>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#13131a', border: '1px solid #1c1c2a' }}>
            <span className="text-gray-500 text-xs">{session.user.email}</span>
          </div>
          <button onClick={() => { setShowCrmModal(true); setCrmError(''); void loadCrmStatus(); }} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2" style={{ background: '#164e63', border: '1px solid #0e7490' }}>
            <RefreshCw className="w-4 h-4" />CRM Integration
          </button>
          <button onClick={() => { setShowImportModal(true); setImportError(''); setImportSuccess(''); }} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2" style={{ background: '#312e81', border: '1px solid #4338ca' }}>
            <Download className="w-4 h-4" />Import Leads
          </button>
          <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors" style={{ background: '#1f2937', border: '1px solid #374151' }}>Logout</button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* ── CENTER: Rolodex ── */}
        <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
          {isDone ? (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-5">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-white mb-2">All Leads Reviewed!</h2>
              <p className="text-gray-400 text-sm mb-6">{statsCount.connected} connected · {statsCount.voicemail} voicemails · {statsCount.lost} lost</p>
              <button onClick={() => { setCurrentIndex(0); currentLeadIdRef.current = leads[0]?.id ?? null; void fetchLeads('reset'); setStatsCount({ connected: 0, lost: 0, voicemail: 0, next: 0 }); setActivityLog([]); }}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">Back to First Lead</button>
            </motion.div>
          ) : (
            <>
              <div ref={cardAreaRef} className="relative overflow-hidden" style={{ width: CARD_WIDTH, height: CONTAINER_H }}>
                {leads.map((lead, i) => {
                  const offset = i - currentIndex;
                  if (Math.abs(offset) > 1) return null;
                  return (
                    <motion.div key={lead.id} className="absolute inset-x-0"
                      style={{ height: CARD_HEIGHT, top: 0, pointerEvents: offset === 0 ? 'auto' : 'none', zIndex: offset === 0 ? 10 : 1 }}
                      animate={{ y: offset * CARD_STRIDE + CENTER_Y, scale: offset === 0 ? 1 : 0.87, opacity: offset === 0 ? 1 : 0.38 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 28 }}>
                      <LeadCard lead={lead} overlayInfo={overlayInfo} cardIndex={i}
                        onEdit={(field, value) => handleLeadEdit(lead.id, field, value)}
                        isActive={offset === 0}
                        onViewHistory={offset === 0 ? () => openLeadHistory(lead.id) : undefined}
                        onCall={offset === 0 ? () => promptLeadCall(lead) : undefined}
                        autoEditNameToken={autoEditLeadId === lead.id ? autoEditLeadToken : undefined}
                        statusLabel={getLeadStatusLabel(lead)} />
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Sidebar buttons ── */}
        <div className="relative w-12 flex-shrink-0 border-l flex flex-col items-center gap-2 pt-4" style={{ borderColor: '#1c1c2a', background: '#0a0a0f' }}>
          <button type="button" title="Add new lead" disabled={!session || creatingLead} onClick={() => void handleCreateLead()}
            className="h-9 w-9 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 flex items-center justify-center transition-colors hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" title="Search leads" onClick={() => setShowLeadSearch((value) => !value)}
            className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors ${showLeadSearch ? 'border-indigo-400 bg-indigo-500/15 text-indigo-300' : 'border-gray-800 bg-transparent text-gray-500 hover:text-gray-300'}`}>
            <Search className="h-4 w-4" />
          </button>
          <button type="button" title="Delete current lead" disabled={!currentLead} onClick={() => setShowDeleteConfirm(true)}
            className="h-9 w-9 rounded-lg border border-gray-800 bg-transparent text-gray-500 flex items-center justify-center transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30">
            <Trash2 className="h-4 w-4" />
          </button>
          <AnimatePresence>
            {showLeadSearch && (
              <motion.div initial={{ opacity: 0, x: 10, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 10, scale: 0.96 }}
                transition={{ duration: 0.15 }} className="absolute right-12 top-4 z-30 w-72 rounded-xl border p-3 shadow-2xl" style={{ background: '#11111a', borderColor: '#252538' }}>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <input autoFocus value={leadSearchQuery}
                    onChange={(event) => { const value = event.target.value; setLeadSearchQuery(value); jumpToLeadSearchIndex(value, -1, 1); }}
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); jumpToLeadSearch(event.shiftKey ? -1 : 1); } if (event.key === 'Escape') setShowLeadSearch(false); }}
                    placeholder="Search leads" className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{leadSearchQuery ? `${leadSearchMatchCount} match${leadSearchMatchCount === 1 ? '' : 'es'}` : 'Type to search'}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => jumpToLeadSearch(-1)} className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-white/5">Up</button>
                    <button type="button" onClick={() => jumpToLeadSearch(1)} className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-white/5">Down</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── RIGHT SIDEBAR: Activity Log ── */}
        <aside className="w-72 flex-shrink-0 flex flex-col border-l overflow-hidden" style={{ background: '#0e0e17', borderColor: '#1c1c2a' }}>
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: '#1c1c2a' }}>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span className="text-white text-sm font-semibold">Activity Log</span>
            </div>
            <span className="text-gray-600 text-xs">{activityLog.length} actions</span>
          </div>
          {!isDone && (
            <div className="px-4 py-3 border-b mx-3 mt-3 rounded-xl" style={{ background: '#13131a', border: '1px solid #1f1f2e' }}>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5">Current Lead</p>
              <p className="text-white font-semibold text-sm truncate">{currentLead!.name}</p>
              <p className="text-gray-400 text-xs truncate">{currentLead!.company}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-indigo-400 text-xs font-semibold">{currentLead!.industry}</span>
                <span className="text-gray-500 text-xs">Score: {currentLead!.score ?? 0}</span>
              </div>
              <button onClick={() => openLeadHistory(currentLead!.id)} className="mt-2 w-full rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2 py-1.5 text-xs font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/20">View History</button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
            <AnimatePresence initial={false}>
              {activityLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <Zap className="w-8 h-8 text-gray-700 mb-3" />
                  <p className="text-gray-600 text-xs">Actions will appear here</p>
                  <p className="text-gray-700 text-xs mt-1">Press a key to get started</p>
                </div>
              ) : (
                activityLog.map((item) => {
                  const meta = actionMeta[item.action];
                  const Icon = meta.Icon;
                  return (
                    <motion.button type="button" key={item.id}
                      initial={{ opacity: 0, x: 20, height: 0 }} animate={{ opacity: 1, x: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }} onClick={() => openLeadHistory(item.leadId)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-transform hover:scale-[1.01] ${meta.bgColor}`}>
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{item.leadName}</p>
                        <p className="text-gray-500 text-xs truncate">{item.company}</p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className={`text-[10px] font-semibold ${meta.color}`}>{meta.label}</span>
                        <span className="text-gray-600 text-[10px]">{timeAgo(item.timestamp)}</span>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </aside>
      </main>

      <CallNoticeToast notice={callNotice} />

      {leads.length > 0 && currentIndex > 0 ? (
        <motion.button type="button" onClick={jumpToFirstLead} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
          className="group fixed bottom-20 left-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 text-indigo-100 shadow-2xl transition-all duration-200 hover:w-36 hover:bg-indigo-500/25"
          title="Back to the top" aria-label="Back to the top" style={{ backdropFilter: 'blur(14px)' }}>
          <ArrowUpToLine className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:-translate-x-10" />
          <span className="absolute left-10 whitespace-nowrap text-xs font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100">Back to the top</span>
        </motion.button>
      ) : null}

      {/* ── BOTTOM KEYBOARD LEGEND ── */}
      <footer className="flex-shrink-0 px-6 py-3 border-t flex items-center justify-center gap-2 flex-wrap" style={{ borderColor: '#1c1c2a', background: '#0a0a0f' }}>
        {SHORTCUT_KEYS.map(({ key, label, action, color, bg }) => {
          const isPressed = pressedKey === key;
          return (
            <motion.button key={key} animate={isPressed ? { scale: 0.88, y: -2 } : { scale: 1, y: 0 }} transition={{ duration: 0.1 }}
              onClick={() => {
                setPressedKey(key); setTimeout(() => setPressedKey(null), 300);
                if (action === 'notes') setShowNotesModal(true);
                else if (action === 'email') promptLeadEmail(currentLead);
                else if (action === 'call') promptLeadCall(currentLead);
                else if (action === 'previous') navigatePrev();
                else if (!isDone) triggerSwipeAction(action as SwipeAction);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150 ${isPressed ? `${bg} scale-95` : 'border-gray-800 bg-transparent'}`}>
              <kbd className={`text-xs font-bold font-mono ${isPressed ? color : 'text-gray-400'} min-w-[14px]`}>{key}</kbd>
              <span className={`text-xs ${isPressed ? color : 'text-gray-600'}`}>{label}</span>
            </motion.button>
          );
        })}
      </footer>

      {/* ── MODALS ── */}
      {currentLead && (
        <>
          <NotesModal lead={currentLead} isOpen={showNotesModal} onClose={() => setShowNotesModal(false)} onSave={handleSaveNotes} />
          <EmailDraftModal lead={currentLead} isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} onSend={handleEmailSent} />
        </>
      )}
      <AnimatePresence>
        {showDeleteConfirm && currentLead && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={(event) => { if (event.target === event.currentTarget) setShowDeleteConfirm(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }} className="w-full max-w-sm rounded-2xl border p-5" style={{ background: '#11111a', borderColor: '#2b1f2a' }}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-rose-500/15 flex items-center justify-center"><Trash2 className="h-5 w-5 text-rose-300" /></div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold">Delete lead?</h3>
                  <p className="mt-1 text-sm text-gray-400">This will remove {currentLead.name} from your rolodex.</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowDeleteConfirm(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5">Cancel</button>
                <button type="button" onClick={() => void handleDeleteCurrentLead()} disabled={deletingLead}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                  {deletingLead ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Import modal (full version with mapping) */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowImportModal(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }} className="w-full max-w-5xl rounded-3xl border overflow-hidden" style={{ background: '#11111a', borderColor: '#1f1f2e' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1f1f2e' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-indigo-300" /></div>
                  <div><h3 className="text-white text-lg font-semibold">Import Leads from CSV</h3><p className="text-gray-400 text-sm">Upload a CSV, preview the rows, and choose which columns to import.</p></div>
                </div>
                <button onClick={() => setShowImportModal(false)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] min-h-[560px]">
                <div className="border-r p-5 space-y-4" style={{ borderColor: '#1f1f2e', background: '#0d0d14' }}>
                  <label htmlFor="csv-upload-input" className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-8 cursor-pointer text-center transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/5" style={{ borderColor: '#2a2a3a' }}>
                    <Upload className="w-8 h-8 text-indigo-300" />
                    <div><p className="text-white font-medium">Choose CSV file</p><p className="text-gray-500 text-sm mt-1">Click to upload lead data from your computer</p></div>
                    <input id="csv-upload-input" type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void handleCsvSelected(e.target.files?.[0] ?? null)} />
                  </label>
                  <div className="rounded-2xl border px-4 py-3" style={{ background: '#13131a', borderColor: '#1f1f2e' }}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-gray-500 text-xs uppercase tracking-wider">Selected file</p>
                      {importFileName ? (<button type="button" onClick={clearCsvSelection} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 transition-colors"><X className="w-3.5 h-3.5" />Remove file</button>) : null}
                    </div>
                    <p className="text-white text-sm font-medium break-all">{importFileName || 'No file chosen yet'}</p>
                    <p className="text-gray-500 text-xs mt-2">{csvHeaders.length > 0 ? `${csvHeaders.length} columns detected` : 'Upload a CSV to begin mapping columns.'}</p>
                  </div>
                  <div className="rounded-2xl border px-4 py-3 space-y-3" style={{ background: '#13131a', borderColor: '#1f1f2e' }}>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">Column mapping</p>
                    {csvHeaders.length === 0 ? (<p className="text-gray-500 text-sm">No columns to map yet.</p>) : (
                      csvHeaders.map((header) => (
                        <div key={header} className="space-y-1.5">
                          <label className="block text-xs text-gray-400 truncate">{header}</label>
                          <select value={columnMapping[header] ?? 'skip'}
                            onChange={(e) => { const value = e.target.value as LeadImportField; setColumnMapping((prev) => ({ ...prev, [header]: value })); }}
                            className="w-full rounded-xl border px-3 py-2 text-sm text-white focus:outline-none" style={{ background: '#0d0d14', borderColor: '#2a2a3a' }}>
                            {IMPORTABLE_FIELDS.map((field) => (<option key={field.value} value={field.value}>{field.label}</option>))}
                          </select>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="p-5 flex flex-col min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div><h4 className="text-white font-semibold">Preview</h4><p className="text-gray-500 text-sm">Review the first few rows before importing.</p></div>
                    <div className="text-xs text-gray-500">{csvPreviewRows.length > 0 ? `${csvPreviewRows.length} preview row${csvPreviewRows.length === 1 ? '' : 's'}` : 'No rows loaded'}</div>
                  </div>
                  {importError ? (<div className="mb-4 rounded-xl border px-4 py-3 text-sm text-rose-300" style={{ background: '#2a1117', borderColor: '#5a1f2b' }}>{importError}</div>) : null}
                  {importSuccess ? (<div className="mb-4 rounded-xl border px-4 py-3 text-sm text-emerald-300" style={{ background: '#0f2218', borderColor: '#1d5134' }}>{importSuccess}</div>) : null}
                  <div className="flex-1 min-h-0 rounded-2xl border overflow-hidden" style={{ borderColor: '#1f1f2e' }}>
                    {csvHeaders.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center px-6" style={{ background: '#0d0d14' }}>
                        <div><FileSpreadsheet className="w-10 h-10 text-gray-700 mx-auto mb-3" /><p className="text-gray-400 text-sm">Upload a CSV file to preview lead rows here.</p></div>
                      </div>
                    ) : (
                      <div className="overflow-auto h-full" style={{ background: '#0d0d14' }}>
                        <table className="min-w-full text-sm">
                          <thead><tr style={{ background: '#13131a' }}>{csvHeaders.map((header) => (<th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 border-b whitespace-nowrap" style={{ borderColor: '#1f1f2e' }}>{header}</th>))}</tr></thead>
                          <tbody>{csvPreviewRows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b last:border-b-0" style={{ borderColor: '#1f1f2e' }}>
                              {csvHeaders.map((header) => (<td key={`${rowIndex}-${header}`} className="px-4 py-3 text-gray-200 whitespace-nowrap">{row[header] || <span className="text-gray-600">—</span>}</td>))}
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">Mapped columns set to &quot;Do not import&quot; will be ignored.</p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/5 transition-colors">Cancel</button>
                      <button onClick={() => void handleImportLeads()} disabled={importing} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60" style={{ background: '#4f46e5' }}>
                        {importing ? 'Importing...' : 'Import Leads'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {crmModal}
    </div>
  );
}
