'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Download,
  History,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Plus,
  RefreshCw,
  Search,
  SkipForward,
  Upload,
  Voicemail,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useApp } from '@/app/providers';
import type { Lead } from '@/app/data/leads';
import type { SwipeAction } from '@/app/components/LeadCard';
import { actionMeta } from '@/app/lib/constants';
import { SettingsMenu } from './SettingsMenu';
import { KeyboardLegend } from './KeyboardLegend';
import { DemoKeyboard } from './DemoKeyboard';
import Link from 'next/link';

type EditableLeadField = 'name' | 'company' | 'title' | 'phone' | 'email' | 'location' | 'notes';

function InlineEdit({
  value,
  field,
  lead,
  onSave,
  className = '',
  multiline = false,
  emptyLabel = 'Add details',
}: {
  value: string;
  field: EditableLeadField;
  lead: Lead;
  onSave: (leadId: string, field: EditableLeadField, value: string) => void;
  className?: string;
  multiline?: boolean;
  emptyLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const nextValue = draft.trim();
    if (nextValue !== value) onSave(lead.id, field, nextValue);
    setEditing(false);
  };

  if (editing) {
    const sharedClassName =
      'w-full rounded-xl border border-[#b58ae8] bg-white/95 px-3 py-2 text-[#20241a] outline-none ring-4 ring-[#7c3aed]/10';

    if (multiline) {
      return (
        <textarea
          autoFocus
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Escape') {
              setDraft(value);
              setEditing(false);
            }
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              commit();
            }
          }}
          className={`${sharedClassName} resize-none ${className}`}
        />
      );
    }

    return (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
          if (event.key === 'Enter') commit();
        }}
        className={`${sharedClassName} ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`rounded-md text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed] ${className}`}
      title="Click to edit"
    >
      {value || emptyLabel}
    </button>
  );
}

function IconAction({
  label,
  icon,
  onClick,
  emphasis = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  emphasis?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`group flex min-w-[76px] flex-col items-center gap-2 rounded-2xl px-3 py-3 text-xs font-semibold transition-colors ${
        emphasis
          ? 'bg-[#6d28d9] text-white shadow-[0_10px_30px_rgba(109,40,217,0.24)]'
          : 'text-[#5f5d50] hover:bg-[#f2f0e8] hover:text-[#2f3918]'
      }`}
      aria-label={label}
    >
      <span className={`grid h-8 w-8 place-items-center rounded-full ${emphasis ? 'bg-white/14' : 'bg-[#f0eee4]'}`}>
        {icon}
      </span>
      {label}
    </motion.button>
  );
}

const STATUS_ACTIONS: Array<{
  action: SwipeAction;
  label: string;
  icon: React.ReactNode;
  tone: string;
}> = [
  { action: 'connected', label: 'Connected', icon: <Check className="h-4 w-4" />, tone: 'bg-[#6d28d9] text-white' },
  { action: 'voicemail', label: 'Voicemail', icon: <Voicemail className="h-4 w-4" />, tone: 'bg-[#f0e7ff] text-[#6b21a8]' },
  { action: 'next', label: 'Skip', icon: <SkipForward className="h-4 w-4" />, tone: 'bg-[#e9e1f7] text-[#5b4b75]' },
  { action: 'lost', label: 'Lost', icon: <X className="h-4 w-4" />, tone: 'bg-[#f3e2f0] text-[#9a3c7e]' },
];

export function NewDashboardView({ demoMode }: {
  demoMode: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const {
    leads,
    currentLead,
    currentIndex,
    setCurrentIndex,
    currentLeadIdRef,
    isDone,
    fetchLeads,
    statsCount,
    setStatsCount,
    setActivityLog,
    activityLog,
    addActivity,
    handleLeadEdit,
    handleCreateLead,
    creatingLead,
    promptLeadCall,
    promptLeadEmail,
    setShowNotesModal,
    setShowCrmModal,
    setCrmError,
    loadCrmStatus,
    setShowImportModal,
    setImportError,
    setImportSuccess,
    openLeadHistory,
    triggerSwipeAction,
    navigatePrev,
    navigateNext,
    leadSearchQuery,
    setLeadSearchQuery,
    jumpToLeadSearch,
    leadSearchMatchCount,
    getLeadStatusLabel,
    crmConnection,
  } = useApp();

  const [navigation, setNavigation] = useState({ index: currentIndex, direction: 1 });
  if (navigation.index !== currentIndex) {
    setNavigation({ index: currentIndex, direction: currentIndex > navigation.index ? 1 : -1 });
  }

  const openIntegrations = () => {
    setShowCrmModal(true);
    setCrmError('');
    void loadCrmStatus();
  };

  const openImport = () => {
    setShowImportModal(true);
    setImportError('');
    setImportSuccess('');
  };

  const openExport = () => {
    window.dispatchEvent(new CustomEvent('openExportModal'));
  };

  const runStatusAction = (action: SwipeAction) => {
    triggerSwipeAction(action, addActivity);
  };

  const selectLead = (index: number) => {
    setCurrentIndex(index);
    currentLeadIdRef.current = leads[index]?.id ?? null;
  };

  if (isDone || !currentLead) {
    return (
      <div className="new-dashboard min-h-screen">
        {demoMode && <DemoKeyboard />}
        <NewDashboardHeader
          demoMode={demoMode}
          searchValue={leadSearchQuery}
          matchCount={leadSearchMatchCount}
          onSearchChange={setLeadSearchQuery}
          onSearchSubmit={() => jumpToLeadSearch(1)}
          onCreate={() => void handleCreateLead()}
          creating={creatingLead}
          onImport={openImport}
          onExport={openExport}
          onIntegrations={openIntegrations}
        />
        <main className="grid min-h-[calc(100vh-76px)] place-items-center px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg rounded-[32px] border border-[#dbd8cd] bg-white p-10 text-center shadow-[0_24px_80px_rgba(54,50,38,0.10)]"
          >
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#eee4ff] text-[#6d28d9]">
              <Check className="h-7 w-7" />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#7b7b68]">Queue complete</p>
            <h2 className="text-3xl font-bold tracking-[-0.04em] text-[#24271f]">Every lead has been reviewed.</h2>
            <p className="mt-3 text-sm leading-6 text-[#737164]">
              {statsCount.connected} connected · {statsCount.voicemail} voicemails · {statsCount.lost} lost
            </p>
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(0);
                currentLeadIdRef.current = leads[0]?.id ?? null;
                void fetchLeads('reset');
                setStatsCount({ connected: 0, lost: 0, voicemail: 0, next: 0 });
                setActivityLog([]);
              }}
              className="mt-7 rounded-2xl bg-[#6d28d9] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(109,40,217,0.24)]"
            >
              Start again
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  const statusLabel = getLeadStatusLabel(currentLead);
  const initials = currentLead.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || currentLead.company.slice(0, 2).toUpperCase() || 'SL';

  return (
    <div className="new-dashboard min-h-screen text-[#25271f]">
      {demoMode && <DemoKeyboard />}
      <NewDashboardHeader
        demoMode={demoMode}
        searchValue={leadSearchQuery}
        matchCount={leadSearchMatchCount}
        onSearchChange={setLeadSearchQuery}
        onSearchSubmit={() => jumpToLeadSearch(1)}
        onCreate={() => void handleCreateLead()}
        creating={creatingLead}
        onImport={openImport}
        onExport={openExport}
        onIntegrations={openIntegrations}
      />
      <KeyboardLegend orientation="vertical" variant="new" />

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-10 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[30px]">
        <AnimatePresence initial={false} mode="popLayout" custom={navigation.direction}>
        <motion.article
          key={currentLead.id}
          custom={navigation.direction}
          variants={{
            enter: (direction: number) => ({ y: reducedMotion ? 0 : `${direction * 100}%` }),
            center: { y: 0 },
            exit: (direction: number) => ({ y: reducedMotion ? 0 : `${direction * -100}%` }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-[30px] border border-[#d8d6cb] bg-white shadow-[0_22px_70px_rgba(58,52,40,0.11)]"
        >
          <section className="new-dashboard-hero relative min-h-[310px] overflow-hidden p-6 sm:min-h-[370px] sm:p-8">
            <div className="new-dashboard-contours absolute inset-0 opacity-60" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-white">
                <div className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-white/15 text-sm font-black backdrop-blur-md">
                  {initials}
                </div>
                <div>
                  <InlineEdit
                    value={currentLead.name}
                    field="name"
                    lead={currentLead}
                    onSave={handleLeadEdit}
                    className="block text-sm font-bold text-white hover:bg-white/10"
                  />
                  <p className="mt-0.5 text-xs text-white/75">{currentLead.source || (demoMode ? 'Swipr lead' : 'Swipr lead')}</p>
                </div>
              </div>
              <span className="rounded-full border border-white/20 bg-[#2d1455]/65 px-4 py-2 text-xs font-bold text-white backdrop-blur-md">
                {statusLabel === 'None' ? 'Ready to contact' : statusLabel}
              </span>
            </div>

            <div className="absolute inset-x-6 bottom-7 z-10 max-w-[760px] text-white sm:inset-x-8 sm:bottom-9">
              <InlineEdit
                value={currentLead.company}
                field="company"
                lead={currentLead}
                onSave={handleLeadEdit}
                emptyLabel={currentLead.name}
                className="block max-w-full text-4xl font-bold leading-[1.02] tracking-[-0.05em] text-white hover:bg-white/10 sm:text-5xl"
              />
              <InlineEdit
                value={currentLead.title}
                field="title"
                lead={currentLead}
                onSave={handleLeadEdit}
                className="mt-3 block text-base font-medium text-white/82 hover:bg-white/10 sm:text-lg"
              />
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-white/75 sm:text-sm">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{currentLead.location || 'Location unknown'}</span>
                <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{currentLead.timezone || 'Timezone unknown'}</span>
                <span>{currentLead.callAttempts} call attempt{currentLead.callAttempts === 1 ? '' : 's'}</span>
              </div>
            </div>
          </section>

          <section className="grid gap-0 lg:grid-cols-[1fr_360px]">
            <div className="border-b border-[#e3e0d6] p-6 lg:border-b-0 lg:border-r sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#8c897b]">Phone</p>
                  <InlineEdit
                    value={currentLead.phone}
                    field="phone"
                    lead={currentLead}
                    onSave={handleLeadEdit}
                    className="text-sm font-bold text-[#34372d]"
                  />
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#8c897b]">Email</p>
                  <InlineEdit
                    value={currentLead.email}
                    field="email"
                    lead={currentLead}
                    onSave={handleLeadEdit}
                    className="max-w-full truncate text-sm font-bold text-[#34372d]"
                  />
                </div>
              </div>
              <div className="mt-6">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#8c897b]">Conversation notes</p>
                <InlineEdit
                  value={currentLead.notes}
                  field="notes"
                  lead={currentLead}
                  onSave={handleLeadEdit}
                  multiline
                  className="block w-full text-sm leading-6 text-[#676559]"
                />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {currentLead.tags.length > 0 ? currentLead.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#f0e7ff] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#6b21a8]">
                    {tag}
                  </span>
                )) : (
                  <span className="text-xs text-[#989486]">No tags added</span>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between p-5 sm:p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c897b]">Quick actions</p>
                <div className="mt-3 grid grid-cols-4 gap-1">
                  <IconAction label="Call" icon={<Phone className="h-4 w-4" />} onClick={() => promptLeadCall(currentLead, { demoMode })} emphasis />
                  <IconAction label="Email" icon={<Mail className="h-4 w-4" />} onClick={() => promptLeadEmail(currentLead)} />
                  <IconAction label="Notes" icon={<MessageSquareText className="h-4 w-4" />} onClick={() => setShowNotesModal(true)} />
                  {!demoMode && <IconAction label="History" icon={<History className="h-4 w-4" />} onClick={() => openLeadHistory(currentLead.id)} />}
                </div>
              </div>
              <div className="mt-5 border-t border-[#e5e2d8] pt-5">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#8c897b]">Log outcome</p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_ACTIONS.map((item) => (
                    <button
                      type="button"
                      key={item.action}
                      onClick={() => runStatusAction(item.action)}
                      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-transform hover:-translate-y-0.5 ${item.tone}`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <footer className="flex items-center justify-between border-t border-[#e5e2d8] px-5 py-4 sm:px-8">
            <button
              type="button"
              onClick={navigatePrev}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[#6d6b5f] transition-colors hover:bg-[#f3f1e9] disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#e9e7df] sm:w-52">
              <motion.div
                className="h-full rounded-full bg-[#7c3aed]"
                animate={{ width: `${((currentIndex + 1) / leads.length) * 100}%` }}
              />
            </div>
            <button
              type="button"
              onClick={navigateNext}
              disabled={currentIndex >= leads.length - 1}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[#6d6b5f] transition-colors hover:bg-[#f3f1e9] disabled:opacity-30"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </footer>
        </motion.article>
        </AnimatePresence>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
          <div className="rounded-[26px] border border-[#dcd9ce] bg-white p-6 shadow-[0_14px_45px_rgba(58,52,40,0.06)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c897b]">Queue</p>
                <h2 className="mt-1 text-lg font-bold tracking-[-0.03em]">Coming up next</h2>
              </div>
              <ArrowDown className="h-4 w-4 text-[#7b7a6d]" />
            </div>
            <div className="space-y-2">
              {leads.slice(currentIndex + 1, currentIndex + 4).map((lead, queueOffset) => {
                const index = currentIndex + queueOffset + 1;
                return (
                  <button
                    type="button"
                    key={lead.id}
                    onClick={() => selectLead(index)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-all hover:border-[#dfd1f4] hover:bg-[#f7f1ff]"
                  >
                    <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[#eee4ff] text-xs font-black text-[#6b21a8]">
                      {(lead.name[0] || lead.company[0] || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#33362b]">{lead.name || 'Unnamed lead'}</p>
                      <p className="truncate text-xs text-[#858174]">{lead.company || 'No company'} · {lead.title || 'No title'}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-none text-[#aaa699]" />
                  </button>
                );
              })}
              {currentIndex >= leads.length - 1 && (
                <p className="rounded-2xl bg-[#f7f1ff] px-4 py-5 text-center text-xs text-[#817e71]">You’re on the final lead.</p>
              )}
            </div>
          </div>

          <div className="rounded-[26px] border border-[#dcd9ce] bg-white p-6 shadow-[0_14px_45px_rgba(58,52,40,0.06)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c897b]">Recent work</p>
                <h2 className="mt-1 text-lg font-bold tracking-[-0.03em]">Latest activity</h2>
              </div>
              <span className="rounded-full bg-[#f0e7ff] px-3 py-1 text-xs font-bold text-[#6b21a8]">{activityLog.length}</span>
            </div>
            <div className="space-y-2">
              {activityLog.slice(0, 4).map((item) => {
                const meta = actionMeta[item.action];
                const ActivityIcon = meta.Icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => openLeadHistory(item.leadId)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-[#f5f4ee]"
                  >
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[#f0efe8] text-[#5b642f]">
                      <ActivityIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#37392f]">{item.leadName || 'Unnamed lead'}</p>
                      <p className="truncate text-xs text-[#858174]">{item.company || 'No company'}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7c3aed]">{meta.label}</span>
                  </button>
                );
              })}
              {activityLog.length === 0 && (
                <p className="rounded-2xl bg-[#f7f1ff] px-4 py-8 text-center text-xs text-[#817e71]">Your actions will appear here.</p>
              )}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

function NewDashboardHeader({
  demoMode,
  searchValue,
  matchCount,
  onSearchChange,
  onSearchSubmit,
  onCreate,
  creating,
  onImport,
  onExport,
  onIntegrations,
}: {
  demoMode: boolean;
  searchValue: string;
  matchCount: number;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onCreate: () => void;
  creating: boolean;
  onImport: () => void;
  onExport: () => void;
  onIntegrations: () => void;
}) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let previousScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 24 || currentScrollY < previousScrollY - 4) {
        setIsHidden(false);
      } else if (currentScrollY > previousScrollY + 4) {
        setIsHidden(true);
      }
      previousScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      animate={{ y: isHidden ? '-110%' : 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 border-b border-[#e4e1d8] bg-[#f7f5ef]/92 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-[76px] max-w-[1500px] items-center gap-3 px-4 sm:px-6">
        <div className="flex flex-none items-center gap-2.5">
          <img src="/images/logo_transparent.png" alt={demoMode ? 'Swipr' : 'Swipr'} className="h-9 w-9 rounded-full object-cover" />
          <span className="hidden text-lg font-black tracking-[-0.04em] text-[#1e211b] sm:block">{demoMode ? 'Swipr' : 'Swipr'}</span>
        </div>

        <div className="relative ml-1 min-w-0 flex-1 sm:ml-5 sm:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777568]" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSearchSubmit();
            }}
            placeholder="Search leads"
            className="h-11 w-full rounded-full border border-[#d7d4ca] bg-white pl-11 pr-12 text-sm text-[#2e3128] outline-none transition-shadow placeholder:text-[#99968b] focus:shadow-[0_0_0_4px_rgba(79,104,20,0.10)]"
          />
          {searchValue && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#737064]">{matchCount}</span>
          )}
        </div>

        {!demoMode && <nav className="ml-auto hidden items-center gap-1 lg:flex">
          <button type="button" className="rounded-xl bg-[#eee4ff] px-4 py-2.5 text-sm font-bold text-[#5b21b6]">Leads</button>
          <button type="button" onClick={onIntegrations} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#5f5d54] hover:bg-[#eee4ff]">
            Integrations
          </button>
          <button type="button" onClick={onImport} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#5f5d54] hover:bg-[#eee4ff]">
            Import
          </button>
          <button type="button" onClick={onExport} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#5f5d54] hover:bg-[#eee4ff]">
            Export
          </button>
        </nav>}

        <div className="ml-auto flex items-center gap-2 lg:ml-3">
          {demoMode && <Link href="/" className="rounded-2xl bg-purple-600 px-4 py-3 text-sm font-bold text-white">Exit demo</Link>}
          {!demoMode && <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#6d28d9] px-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(109,40,217,0.22)] disabled:opacity-50 sm:px-5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{creating ? 'Adding…' : 'New lead'}</span>
          </button>}
          {!demoMode && <div className="hidden sm:block">
            <SettingsMenu />
          </div>}
        </div>
      </div>

      {!demoMode && <div className="flex items-center justify-center gap-1 border-t border-[#e7e4db] px-3 py-2 lg:hidden">
        <button type="button" onClick={onIntegrations} className="grid h-9 w-9 place-items-center rounded-xl text-[#666457] hover:bg-white" aria-label="Open integrations">
          <RefreshCw className="h-4 w-4" />
        </button>
        <button type="button" onClick={onImport} className="grid h-9 w-9 place-items-center rounded-xl text-[#666457] hover:bg-white" aria-label="Import leads">
          <Upload className="h-4 w-4" />
        </button>
        <button type="button" onClick={onExport} className="grid h-9 w-9 place-items-center rounded-xl text-[#666457] hover:bg-white" aria-label="Export leads">
          <Download className="h-4 w-4" />
        </button>
        <div className="sm:hidden">
          <SettingsMenu />
        </div>
      </div>}
    </motion.header>
  );
}
