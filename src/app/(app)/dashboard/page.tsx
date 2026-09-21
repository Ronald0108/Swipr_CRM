"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  CheckCircle,
  Plus,
  RefreshCw,
  SkipForward,
  Upload,
  Users,
  Voicemail,
  XCircle,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { LeadCard, type SwipeAction } from "@/app/components/LeadCard";
import { NotesModal } from "@/app/components/NotesModal";
import { EmailDraftModal } from "@/app/components/EmailDraftModal";
import { CrmModal } from "@/app/components/dashboard/CrmModal";
import { ImportModal } from "@/app/components/dashboard/ImportModal";
import { ExportModal } from "@/app/components/dashboard/ExportModal";
import { DeleteConfirmDialog } from "@/app/components/dashboard/DeleteConfirmDialog";
import {
  useApp,
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_STRIDE,
  CONTAINER_H,
  CENTER_Y,
} from "@/app/providers";
import { ActivitySidebar } from "@/app/components/dashboard/ActivitySidebar";
import {
  KeyboardLegend,
  KEY_ACTIONS,
} from "@/app/components/dashboard/KeyboardLegend";
import { LeadSearchPanel } from "@/app/components/dashboard/LeadSearchPanel";
import { StatsBar } from "@/app/components/dashboard/StatsBar";
import { CallNoticeToast } from "@/app/components/CallNoticeToast";
import { CallOutcomeModal } from "@/app/components/CallOutcomeModal";
import { SettingsMenu } from "@/app/components/dashboard/SettingsMenu";
import { StatsSidebar } from "@/app/components/dashboard/StatsSidebar";
import { NewDashboardView } from "@/app/components/dashboard/NewDashboardView";

// ── Home Page ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const app = useApp();
  const [activityCollapsed, setActivityCollapsed] = useState(false);
  const { demoMode } = app;
  const dashboardView = "new";

  const {
    session,
    authLoading,
    authSubmitting,
    email,
    setEmail,
    password,
    setPassword,
    authError,
    handleLogin,
    leads,
    currentIndex,
    setCurrentIndex,
    leadsLoading,
    fetchLeads,
    currentLead,
    isDone,
    activityLog,
    statsCount,
    setStatsCount,
    setActivityLog,
    addActivity,
    showNotesModal,
    setShowNotesModal,
    showEmailModal,
    setShowEmailModal,
    showLeadSearch,
    setShowLeadSearch,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showImportModal,
    setShowImportModal,
    showCrmModal,
    setShowCrmModal,
    handleLeadEdit,
    autoEditLeadId,
    autoEditLeadToken,
    handleCreateLead,
    creatingLead,
    handleDeleteCurrentLead,
    deletingLead,
    callNotice,
    promptLeadCall,
    promptLeadEmail,
    showCallOutcomeModal,
    callOutcomeLead,
    handleCallOutcome,
    closeCallOutcomeModal,
    handleSaveNotes,
    handleEmailSent,
    leadSearchQuery,
    setLeadSearchQuery,
    jumpToLeadSearch,
    jumpToLeadSearchIndex,
    leadSearchMatchCount,
    navigatePrev,
    navigateNext,
    triggerSwipeAction,
    overlayInfo,
    pressedKey,
    setPressedKey,
    isAnimatingRef,
    cardAreaRef,
    csvHeaders,
    csvRows,
    csvPreviewRows,
    columnMapping,
    setColumnMapping,
    importFileName,
    importError,
    setImportError,
    importSuccess,
    setImportSuccess,
    importing,
    crmConnection,
    crmLastRun,
    crmAction,
    crmError,
    setCrmError,
    crmResult,
    crmBusy,
    loadCrmStatus,
    startHubSpotOAuth,
    runHubSpotAction,
    getLeadStatusLabel,
    openLeadHistory,
    currentLeadIdRef,
    loading: organizationLoading,
  } = app;

  const handleNotesKeyboardSave = useCallback(() => {
    setPressedKey("N");
    window.setTimeout(() => setPressedKey(null), 300);
  }, [setPressedKey]);

  // ── Wheel event for rolodex scroll ───────────────────────────────────
  useEffect(() => {
    const el = cardAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 20) navigateNext();
      else if (e.deltaY < -20) navigatePrev();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [navigateNext, navigatePrev, cardAreaRef]);

  // ── Keyboard handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const noModal = !showNotesModal && !showEmailModal && !showCallOutcomeModal;

      if (noModal && e.key === "ArrowDown") {
        e.preventDefault();
        navigateNext();
        return;
      }
      if (noModal && e.key === "ArrowUp") {
        e.preventDefault();
        navigatePrev();
        return;
      }
      if (e.key === "Enter" && noModal && currentLead) {
        e.preventDefault();
        openLeadHistory(currentLead.id);
        return;
      }

      const key = e.key.toLowerCase();
      const action = KEY_ACTIONS[key];
      if (!action) return;

      // Call outcome shortcuts are handled exclusively by the open panel.
      if (showCallOutcomeModal) return;

      if (action !== "notes" && action !== "email" && action !== "call") {
        setPressedKey(key.toUpperCase());
        setTimeout(() => setPressedKey(null), 300);
      }

      if (action === "notes") {
        if (noModal) setShowNotesModal(true);
      } else if (action === "email") {
        if (noModal) promptLeadEmail(currentLead);
      } else if (action === "call") {
        if (noModal) promptLeadCall(currentLead, { demoMode: dashboardView === "new" && demoMode });
      } else if (action === "previous") {
        if (noModal) navigatePrev();
      } else if (action === "delete") {
        if (noModal) setShowDeleteConfirm(true);
      } else if (action === "create") {
        if (noModal) void handleCreateLead();
      } else {
        if (noModal) triggerSwipeAction(action as SwipeAction, addActivity);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    triggerSwipeAction,
    navigatePrev,
    navigateNext,
    showNotesModal,
    showEmailModal,
    showCallOutcomeModal,
    currentLead,
    openLeadHistory,
    promptLeadCall,
    dashboardView,
    demoMode,
    promptLeadEmail,
    setPressedKey,
    setShowNotesModal,
    setShowDeleteConfirm,
    handleCreateLead,
    addActivity,
  ]);

  // ── Auth loading ──
  if (authLoading || organizationLoading) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center transition-colors duration-300"
        style={{ background: "var(--surface-base)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.12)" }}
          >
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
          <p className="text-white/80 text-sm font-semibold">
            Loading Swipr
          </p>
          <p className="text-white/20 text-xs mt-1">Checking your session…</p>
        </motion.div>
      </div>
    );
  }

  // ── Login ──
  if (!session && !demoMode) {
    return (
      <div className="login-gradient-bg h-screen w-screen flex items-center justify-center px-4">
        <Link
          href="/"
          className="absolute left-5 top-5 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/75 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
        >
          Return to website
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md rounded-3xl p-8"
          style={{
            background: "var(--panel-bg)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-modal)",
            backdropFilter: "blur(40px) saturate(180%)",
          }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <img
                src="/images/logo_transparent.png"
                alt="Swipr Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-[var(--text-primary)] text-xl font-bold tracking-tight">
                Swipr
              </h1>
              <p className="text-[var(--text-tertiary)] text-xs">
                Sign in to your account
              </p>
            </div>
          </div>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleLogin();
            }}
          >
            <div>
              <label className="block text-[11px] text-white/40 font-medium mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--border-default)",
                }}
              />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 font-medium mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--border-default)",
                }}
              />
            </div>
            {authError ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl px-3 py-2.5 text-xs text-rose-300/90 flex items-start gap-2"
                style={{
                  background: "rgba(244,63,94,0.08)",
                  border: "1px solid rgba(244,63,94,0.2)",
                }}
              >
                <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-400" />
                {authError}
              </motion.div>
            ) : null}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={authSubmitting}
                className="btn-premium w-full rounded-xl px-4 py-3 text-sm text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                  boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
                }}
              >
                {authSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  // ── Leads loading ──
  if ((leadsLoading || organizationLoading) && leads.length === 0) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center transition-colors duration-300"
        style={{ background: "var(--surface-base)" }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--accent-indigo-soft)" }}
          >
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          </div>
          <p className="text-[var(--text-primary)] text-sm font-semibold">
            Loading your leads…
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Empty state ──
  if (!organizationLoading && leads.length === 0) {
    return (
      <div
        className="h-screen w-screen overflow-hidden flex flex-col transition-colors duration-300"
        style={{ background: "var(--surface-base)" }}
      >
        <header
          className="flex-shrink-0 flex items-center justify-between px-5 py-2.5"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--glass-bg)",
            backdropFilter: "blur(40px)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <img
                src="/images/logo_transparent.png"
                alt="Swipr logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[var(--text-primary)] text-sm font-semibold tracking-tight">
              Swipr
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => void handleCreateLead()}
              disabled={creatingLead}
              className="btn-premium px-3 py-1.5 rounded-xl text-white/90 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                border: "1px solid rgba(99,102,241,0.3)",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              {creatingLead ? "Adding…" : "Add Lead"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setShowCrmModal(true);
                setCrmError("");
                void loadCrmStatus();
              }}
              className="btn-premium px-3 py-1.5 rounded-xl text-white/90 text-xs font-semibold flex items-center gap-2"
              style={{
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.25)",
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Integrations
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setShowImportModal(true);
                setImportError("");
                setImportSuccess("");
              }}
              className="btn-premium px-3 py-1.5 rounded-xl text-white/90 text-xs font-semibold flex items-center gap-2"
              style={{
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              Import
            </motion.button>
            <SettingsMenu />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="w-16 h-16 rounded-3xl mx-auto mb-5 flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Users className="w-7 h-7 text-[var(--text-tertiary)]" />
            </div>
            <p className="text-[var(--text-primary)] text-lg font-semibold">
              No leads yet
            </p>
            <p className="text-[var(--text-secondary)] text-sm mt-2 max-w-xs mx-auto">
              Add leads manually, import from a file, or connect your CRM to get
              started.
            </p>
            <div className="flex items-center gap-3 justify-center mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void handleCreateLead()}
                disabled={creatingLead}
                className="btn-premium inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                }}
              >
                <Plus className="w-4 h-4" />
                {creatingLead ? "Adding…" : "Add Lead"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowCrmModal(true);
                  setCrmError("");
                  void loadCrmStatus();
                }}
                className="btn-premium inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white/80"
                style={{
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.25)",
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Connect CRM
              </motion.button>
            </div>
          </motion.div>
        </main>
        <ImportModal />
        <CrmModal />
      </div>
    );
  }

  if (dashboardView === "new") {
    return (
      <>
        <NewDashboardView demoMode={demoMode} />
        <div className="new-dashboard-overlays">
          <CallNoticeToast notice={callNotice} />
          {currentLead && (
            <>
              <NotesModal
                lead={currentLead}
                isOpen={showNotesModal}
                onClose={() => setShowNotesModal(false)}
                onSave={handleSaveNotes}
                onKeyboardSave={handleNotesKeyboardSave}
              />
              <EmailDraftModal
                lead={currentLead}
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                onSend={handleEmailSent}
                onKeyboardSend={() => {
                  setPressedKey("E");
                  window.setTimeout(() => setPressedKey(null), 300);
                }}
              />
            </>
          )}
          <CallOutcomeModal
            lead={callOutcomeLead}
            isOpen={showCallOutcomeModal}
            onClose={closeCallOutcomeModal}
            onSave={handleCallOutcome}
            onSaved={() => {
              setPressedKey("C");
              window.setTimeout(() => setPressedKey(null), 300);
            }}
          />
          <AnimatePresence>
            <DeleteConfirmDialog />
          </AnimatePresence>
          <ImportModal />
          <CrmModal />
          <ExportModal />
        </div>
      </>
    );
  }

  // ── Main rolodex view ──
  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col transition-colors duration-300"
      style={{ background: "var(--surface-base)" }}
    >
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
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{
                  background: "linear-gradient(135deg, #10B981, #14B8A6)",
                }}
              >
                <Award className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-[var(--text-primary)] text-xl font-bold mb-2">
                All Leads Reviewed!
              </h2>
              <p className="text-[var(--text-secondary)] text-sm mb-6">
                {statsCount.connected} connected · {statsCount.voicemail}{" "}
                voicemails · {statsCount.lost} lost
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setCurrentIndex(0);
                  currentLeadIdRef.current = leads[0]?.id ?? null;
                  void fetchLeads("reset");
                  setStatsCount({
                    connected: 0,
                    lost: 0,
                    voicemail: 0,
                    next: 0,
                  });
                  setActivityLog([]);
                }}
                className="btn-premium px-6 py-3 rounded-xl text-white font-semibold"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                }}
              >
                Back to First Lead
              </motion.button>
            </motion.div>
          ) : (
            <>
              <div
                ref={cardAreaRef}
                className="relative overflow-hidden"
                style={{ width: CARD_WIDTH, height: CONTAINER_H }}
              >
                {leads.map((lead, i) => {
                  const offset = i - currentIndex;
                  if (Math.abs(offset) > 3) return null;
                  return (
                    <motion.div
                      key={lead.id}
                      className="absolute inset-x-0 mx-auto"
                      style={{
                        height: CARD_HEIGHT,
                        top: 0,
                        pointerEvents: offset === 0 ? "auto" : "none",
                        zIndex: offset === 0 ? 10 : 1,
                      }}
                      animate={{
                        y: offset * CARD_STRIDE + CENTER_Y,
                        x: 0,
                        scale: 1,
                        opacity: Math.max(0, 1 - Math.abs(offset)),
                      }}
                      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                      drag={offset === 0 ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.8}
                      onDragEnd={(_, info) => {
                        if (info.offset.x > 200)
                          triggerSwipeAction("connected", addActivity);
                        else if (info.offset.x < -200)
                          triggerSwipeAction("lost", addActivity);
                      }}
                    >
                      <LeadCard
                        lead={lead}
                        overlayInfo={overlayInfo}
                        cardIndex={i}
                        onEdit={(field, value) =>
                          handleLeadEdit(lead.id, field, value)
                        }
                        isActive={offset === 0}
                        onViewHistory={
                          offset === 0
                            ? () => openLeadHistory(lead.id)
                            : undefined
                        }
                        onCall={
                          offset === 0 ? () => promptLeadCall(lead) : undefined
                        }
                        autoEditNameToken={
                          autoEditLeadId === lead.id
                            ? autoEditLeadToken
                            : undefined
                        }
                        statusLabel={getLeadStatusLabel(lead)}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT SIDEBAR: Stats & CRM Sync ── */}
        <StatsSidebar />
      </main>

      <CallNoticeToast notice={callNotice} />

      {/* ── BOTTOM KEYBOARD LEGEND ── */}
      <KeyboardLegend />

      {/* ── MODALS ── */}
      {currentLead && (
        <>
          <NotesModal
            lead={currentLead}
            isOpen={showNotesModal}
            onClose={() => setShowNotesModal(false)}
            onSave={handleSaveNotes}
            onKeyboardSave={handleNotesKeyboardSave}
          />
          <EmailDraftModal
            lead={currentLead}
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            onSend={handleEmailSent}
            onKeyboardSend={() => {
              setPressedKey("E");
              window.setTimeout(() => setPressedKey(null), 300);
            }}
          />
        </>
      )}
      <CallOutcomeModal
        lead={callOutcomeLead}
        isOpen={showCallOutcomeModal}
        onClose={closeCallOutcomeModal}
        onSave={handleCallOutcome}
        onSaved={() => {
          setPressedKey("C");
          window.setTimeout(() => setPressedKey(null), 300);
        }}
      />
      <AnimatePresence>
        <DeleteConfirmDialog />
      </AnimatePresence>
      <ImportModal />
      <CrmModal />
      <ExportModal />
    </div>
  );
}
