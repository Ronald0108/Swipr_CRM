'use client';

import { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle,
  Download,
  Plus,
  RefreshCw,
  SkipForward,
  Users,
  Voicemail,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { LeadCard, type SwipeAction } from '@/app/components/LeadCard';
import { NotesModal } from '@/app/components/NotesModal';
import { EmailDraftModal } from '@/app/components/EmailDraftModal';
import { CrmModal } from '@/app/components/dashboard/CrmModal';
import { ImportModal } from '@/app/components/dashboard/ImportModal';
import { DeleteConfirmDialog } from '@/app/components/dashboard/DeleteConfirmDialog';
import {
  useApp,
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_STRIDE,
  CONTAINER_H,
  CENTER_Y,
} from '@/app/providers';
import { ActivitySidebar } from '@/app/components/dashboard/ActivitySidebar';
import { KeyboardLegend, KEY_ACTIONS } from '@/app/components/dashboard/KeyboardLegend';
import { LeadSearchPanel } from '@/app/components/dashboard/LeadSearchPanel';
import { StatsBar } from '@/app/components/dashboard/StatsBar';
import { CallNoticeToast } from '@/app/components/CallNoticeToast';
import { SettingsMenu } from '@/app/components/dashboard/SettingsMenu';



// ── Home Page ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const app = useApp();
  const [activityCollapsed, setActivityCollapsed] = useState(false);

  const {
    session, authLoading, authSubmitting, email, setEmail, password, setPassword, authError,
    handleLogin,
    leads, currentIndex, setCurrentIndex, leadsLoading, fetchLeads, currentLead, isDone,
    activityLog, statsCount, setStatsCount, setActivityLog,
    addActivity,
    showNotesModal, setShowNotesModal, showEmailModal, setShowEmailModal,
    showLeadSearch, setShowLeadSearch, showDeleteConfirm, setShowDeleteConfirm,
    showImportModal, setShowImportModal, showCrmModal, setShowCrmModal,
    handleLeadEdit, autoEditLeadId, autoEditLeadToken,
    handleCreateLead, creatingLead, handleDeleteCurrentLead, deletingLead,
    callNotice, promptLeadCall, promptLeadEmail,
    handleSaveNotes, handleEmailSent,
    leadSearchQuery, setLeadSearchQuery, jumpToLeadSearch, jumpToLeadSearchIndex, leadSearchMatchCount,
    navigatePrev, navigateNext, triggerSwipeAction,
    overlayInfo, pressedKey, setPressedKey,
    isAnimatingRef, cardAreaRef,
    csvHeaders, csvRows, csvPreviewRows, columnMapping, setColumnMapping,
    importFileName, importError, setImportError, importSuccess, setImportSuccess, importing,
    handleCsvSelected, clearCsvSelection, handleImportLeads,
    crmConnection, crmLastRun, crmAction, crmError, setCrmError, crmResult, crmBusy,
    loadCrmStatus, startHubSpotOAuth, runHubSpotAction,
    getLeadStatusLabel, openLeadHistory, currentLeadIdRef,
  } = app;

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
      else { if (noModal) triggerSwipeAction(action as SwipeAction, addActivity); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSwipeAction, navigatePrev, navigateNext, showNotesModal, showEmailModal, currentLead, openLeadHistory, promptLeadCall, promptLeadEmail, setPressedKey, setShowNotesModal, addActivity]);

  // ── Modals extracted ──

  // ── Auth loading ──
  if (authLoading) {
    return (
      <div className="swipr-dashboard h-screen w-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: 'var(--dash-text)' }}>Loading Swipr CRM...</p>
          <p className="text-sm mt-2" style={{ color: 'var(--dash-muted)' }}>Checking your session</p>
        </div>
      </div>
    );
  }

  // ── Login ──
  if (!session) {
    return (
      <div className="login-gradient-bg h-screen w-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border p-8 bg-[#13131a] border-[#1c1c2a]">
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
                className="w-full rounded-xl border px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none bg-[#0a0a0f] border-[#1c1c2a]" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
                className="w-full rounded-xl border px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none bg-[#0a0a0f] border-[#1c1c2a]" />
            </div>
            {authError ? (<div className="rounded-xl border px-3 py-2 text-sm text-rose-300 bg-[#2a1117] border-[#5a1f2b]">{authError}</div>) : null}
            <div className="pt-2">
              <button type="submit" disabled={authSubmitting} className="w-full rounded-xl px-4 py-3 text-white font-semibold transition-colors disabled:opacity-60 bg-[#4f46e5]">
                {authSubmitting ? 'Loading...' : 'Log In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Leads loading ──
  if (leadsLoading && leads.length === 0) {
    return (
      <div className="swipr-dashboard h-screen w-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: 'var(--dash-text)' }}>Loading SwiprCRM...</p>
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (leads.length === 0) {
    return (
      <div className="swipr-dashboard h-screen w-screen overflow-hidden flex flex-col">
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'var(--dash-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
              <img src="/images/logo_transparent.png" alt="Swipr CRM logo" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => void handleCreateLead()} disabled={creatingLead} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-60 bg-[#4f46e5] border-[#6366f1] border">
              <Plus className="w-4 h-4" />{creatingLead ? 'Adding...' : 'Add Lead'}
            </button>
            <button onClick={() => { setShowCrmModal(true); setCrmError(''); void loadCrmStatus(); }} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2 bg-[#164e63] border border-[#0e7490]">
              <RefreshCw className="w-4 h-4" />CRM Integration
            </button>
            <button onClick={() => { setShowImportModal(true); setImportError(''); setImportSuccess(''); }} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2 bg-[#312e81] border border-[#4338ca]">
              <Download className="w-4 h-4" />Import Leads
            </button>
            <SettingsMenu />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 text-center">
          <div>
            <Users className="w-10 h-10 text-gray-700 mx-auto mb-4" />
            <p className="text-lg font-semibold" style={{ color: 'var(--dash-text)' }}>No leads loaded</p>
            <p className="text-sm mt-2" style={{ color: 'var(--dash-muted)' }}>Add a lead manually or import a CSV to start reviewing leads.</p>
            <button onClick={() => void handleCreateLead()} disabled={creatingLead} className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 bg-[#4f46e5]">
              <Plus className="w-4 h-4" />{creatingLead ? 'Adding...' : 'Add Lead'}
            </button>
            <button onClick={() => { setShowCrmModal(true); setCrmError(''); void loadCrmStatus(); }} className="ml-3 mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors bg-[#164e63]">
              <RefreshCw className="w-4 h-4" />CRM Integration
            </button>
          </div>
        </main>
        {/* Import modal (empty state) */}
        <ImportModal />
        <CrmModal />
      </div>
    );
  }

  // ── Main rolodex view ──
  return (
    <div className="swipr-dashboard h-screen w-screen overflow-hidden flex flex-col">
      {/* ── TOP BAR ── */}
      <StatsBar />

      {/* ── MAIN ── */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* ── LEFT SIDEBAR: Activity Log ── */}
        <ActivitySidebar collapsed={activityCollapsed} />

        {/* ── Sidebar buttons ── */}
        <LeadSearchPanel
          activityCollapsed={activityCollapsed}
          onToggleActivity={() => setActivityCollapsed((value) => !value)}
        />

        {/* ── CENTER: Rolodex ── */}
        <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
          {isDone ? (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-5">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h2 className="mb-2" style={{ color: 'var(--dash-text)' }}>All Leads Reviewed!</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--dash-muted)' }}>{statsCount.connected} connected · {statsCount.voicemail} voicemails · {statsCount.lost} lost</p>
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
      </main>

      <CallNoticeToast notice={callNotice} />

      <div className="fixed bottom-20 right-5 z-40 grid grid-cols-2 gap-1.5 rounded-xl border p-1.5 shadow-2xl" style={{ backdropFilter: 'blur(14px)', background: 'var(--dash-panel)', borderColor: 'var(--dash-border)' }}>
        {([
          { icon: CheckCircle, count: statsCount.connected, color: 'text-emerald-400', label: 'Connected' },
          { icon: XCircle, count: statsCount.lost, color: 'text-rose-400', label: 'Lost' },
          { icon: Voicemail, count: statsCount.voicemail, color: 'text-amber-400', label: 'Voicemail' },
          { icon: SkipForward, count: statsCount.next, color: 'text-sky-400', label: 'Skipped' },
        ] as const).map(({ icon: Icon, count, color, label }) => (
          <div key={label} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: 'var(--dash-elevated)' }}>
            <Icon className={`h-3.5 w-3.5 ${color}`} />
            <span className="text-xs font-semibold" style={{ color: 'var(--dash-text)' }}>{count}</span>
            <span className="hidden text-[10px] sm:inline" style={{ color: 'var(--dash-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── BOTTOM KEYBOARD LEGEND ── */}
      <KeyboardLegend />

      {/* ── MODALS ── */}
      {currentLead && (
        <>
          <NotesModal lead={currentLead} isOpen={showNotesModal} onClose={() => setShowNotesModal(false)} onSave={handleSaveNotes} />
          <EmailDraftModal lead={currentLead} isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} onSend={handleEmailSent} />
        </>
      )}
      <AnimatePresence>
        <DeleteConfirmDialog />
      </AnimatePresence>
      <ImportModal />
      <CrmModal />
    </div>
  );
}
