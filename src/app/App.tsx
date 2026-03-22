import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead } from './data/leads';
import { LeadCard, SwipeAction, OverlayAction } from './components/LeadCard';
import { NotesModal } from './components/NotesModal';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { EmailDraftModal } from './components/EmailDraftModal';
import logoImage from './components/square_logo.png' 
import { CallPanel } from './components/CallPanel';
import {
  Phone, Mail, Voicemail, XCircle, CheckCircle,
  Users, Award, Zap, SkipForward, BarChart3
} from 'lucide-react';

// ── Rolodex constants ──────────────────────────────────────────────────────
const CARD_WIDTH    = 420;
const CARD_HEIGHT   = 390;
const CARD_STRIDE   = 450;  // distance between card centres
const CONTAINER_H   = 630;
const CENTER_Y      = (CONTAINER_H - CARD_HEIGHT) / 2; // = 120

// ── Types ─────────────────────────────────────────────────────────────────
interface ActivityItem {
  id: string;
  action: SwipeAction | 'email' | 'call';
  leadName: string;
  company: string;
  timestamp: Date;
}

const actionMeta: Record<SwipeAction | 'email' | 'call', {
  label: string;
  color: string;
  bgColor: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  connected: { label: 'Connected',  color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', Icon: CheckCircle },
  lost:      { label: 'Lost',       color: 'text-rose-400',    bgColor: 'bg-rose-500/15',    Icon: XCircle    },
  voicemail: { label: 'Voicemail',  color: 'text-amber-400',   bgColor: 'bg-amber-500/15',   Icon: Voicemail  },
  next:      { label: 'Skipped',    color: 'text-sky-400',     bgColor: 'bg-sky-500/15',     Icon: SkipForward},
  email:     { label: 'Email sent', color: 'text-purple-400',  bgColor: 'bg-purple-500/15',  Icon: Mail       },
  call:      { label: 'Called',     color: 'text-blue-400',    bgColor: 'bg-blue-500/15',    Icon: Phone      },
};

type AnyAction = SwipeAction | 'notes' | 'email' | 'call' | 'previous';

const KEY_ACTIONS: Record<string, AnyAction> = {
  q: 'voicemail',
  e: 'notes',
  a: 'lost',
  d: 'connected',
  c: 'call',
  x: 'email',
  r: 'next',
  t: 'previous',
};

const SHORTCUT_KEYS: {
  key: string; label: string; action: AnyAction;
  color: string; bg: string;
}[] = [
  { key: 'Q', label: 'Voicemail', action: 'voicemail', color: 'text-amber-400',   bg: 'border-amber-500/40 bg-amber-500/10'   },
  { key: 'A', label: 'Lost',      action: 'lost',      color: 'text-rose-400',    bg: 'border-rose-500/40 bg-rose-500/10'     },
  { key: 'D', label: 'Connected', action: 'connected', color: 'text-emerald-400', bg: 'border-emerald-500/40 bg-emerald-500/10'},
  { key: 'R', label: 'Next',      action: 'next',      color: 'text-sky-400',     bg: 'border-sky-500/40 bg-sky-500/10'       },
  { key: 'T', label: 'Previous',  action: 'previous',  color: 'text-gray-300',    bg: 'border-gray-500/40 bg-gray-500/10'     },
  { key: 'C', label: 'Call',      action: 'call',      color: 'text-blue-400',    bg: 'border-blue-500/40 bg-blue-500/10'     },
  { key: 'E', label: 'Notes',     action: 'notes',     color: 'text-yellow-300',  bg: 'border-yellow-500/40 bg-yellow-500/10' },
  { key: 'X', label: 'Email',     action: 'email',     color: 'text-purple-400',  bg: 'border-purple-500/40 bg-purple-500/10' },
];

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [overlayInfo, setOverlayInfo]   = useState<{ action: OverlayAction; index: number } | null>(null);
  const [activityLog, setActivityLog]   = useState<ActivityItem[]>([]);
  const [showNotesModal, setShowNotesModal]   = useState(false);
  const [showEmailModal, setShowEmailModal]   = useState(false);
  const [showCallPanel,  setShowCallPanel]    = useState(false);
  const [pressedKey, setPressedKey]           = useState<string | null>(null);
  const [statsCount, setStatsCount]     = useState({ connected: 0, lost: 0, voicemail: 0, next: 0 });
  const [session, setSession]           = useState<Session | null>(null);
  const [authLoading, setAuthLoading]   = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [authError, setAuthError]       = useState('');
  // ── Auth handlers ─────────────────────────────────────────────
  const handleSignUp = useCallback(async () => {
    setAuthError('');
    setAuthSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
    }

    setAuthSubmitting(false);
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    setAuthError('');
    setAuthSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
    }

    setAuthSubmitting(false);
  }, [email, password]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setLeads([]);
    setCurrentIndex(0);
    setActivityLog([]);
    setStatsCount({ connected: 0, lost: 0, voicemail: 0, next: 0 });
  }, []);
  // ── Fetch leads from Supabase ───────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    if (!session) {
      setLeads([]);
      return;
    }

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error fetching leads:', error);
      return;
    }

    const normalizedLeads = (data || []).map((lead) => ({
      ...lead,
      company: lead.company ?? '',
      industry: lead.industry ?? '',
      score: Number(lead.score) || 0,
      status: lead.status ?? 'new',
      tags: Array.isArray(lead.tags) ? lead.tags : [],
      notes: lead.notes ?? '',
    }));

    setLeads(normalizedLeads as Lead[]);
    setCurrentIndex(0);
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchLeads();
    } else {
      setLeads([]);
      setCurrentIndex(0);
    }
  }, [fetchLeads, session]);

  const isAnimatingRef = useRef(false);
  const lastNavTime    = useRef(0);
  const cardAreaRef    = useRef<HTMLDivElement>(null);

  const isDone      = currentIndex >= leads.length;
  const currentLead = leads[currentIndex] ?? leads[leads.length - 1] ?? null;

  // ── Activity log ─────────────────────────────────────────────────────
  const addActivity = useCallback((action: SwipeAction | 'email' | 'call', lead: Lead) => {
    setActivityLog(prev => [{
      id: `${Date.now()}-${Math.random()}`,
      action, leadName: lead.name, company: lead.company, timestamp: new Date(),
    }, ...prev].slice(0, 50));
  }, []);

  // ── Swipe actions (Q/A/D/R) ──────────────────────────────────────────
  const triggerSwipeAction = useCallback((action: SwipeAction) => {
    if (isAnimatingRef.current || isDone) return;
    isAnimatingRef.current = true;

    setOverlayInfo({ action, index: currentIndex });
    setStatsCount(prev => ({ ...prev, [action]: (prev[action as keyof typeof prev] ?? 0) + 1 }));
    addActivity(action, leads[currentIndex]);

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => {
        setOverlayInfo(null);
        isAnimatingRef.current = false;
      }, 480);
    }, 300);
  }, [isDone, currentIndex, leads, addActivity]);

  // ── Navigate previous (T key / scroll up) ───────────────────────────
  const navigatePrev = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTime.current < 400) return;
    if (isAnimatingRef.current) return;
    lastNavTime.current = now;
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  // ── Navigate next via scroll (no action logged) ──────────────────────
  const navigateNext = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTime.current < 400) return;
    if (isAnimatingRef.current) return;
    lastNavTime.current = now;
    setCurrentIndex(prev => Math.min(prev + 1, leads.length - 1));
  }, [leads.length]);

  // ── Wheel event for rolodex scroll ───────────────────────────────────
  useEffect(() => {
    const el = cardAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 20)       navigateNext();
      else if (e.deltaY < -20) navigatePrev();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [navigateNext, navigatePrev]);

  // ── Keyboard handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key    = e.key.toLowerCase();
      const action = KEY_ACTIONS[key];
      if (!action) return;

      setPressedKey(key.toUpperCase());
      setTimeout(() => setPressedKey(null), 300);

      const noModal = !showNotesModal && !showEmailModal && !showCallPanel;

      if (action === 'notes')    { if (noModal) setShowNotesModal(true); }
      else if (action === 'email')    { if (noModal) setShowEmailModal(true); }
      else if (action === 'call')     { if (noModal) setShowCallPanel(true); }
      else if (action === 'previous') { if (noModal) navigatePrev(); }
      else { if (noModal) triggerSwipeAction(action as SwipeAction); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSwipeAction, navigatePrev, showNotesModal, showEmailModal, showCallPanel]);

  // ── Edit lead field ──────────────────────────────────────────────────
  const handleLeadEdit = useCallback((leadId: string, field: keyof Lead, value: string | string[] | number) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, [field]: value } : l));
  }, []);

  // ── Save notes (no activity log entry) ───────────────────────────────
  const handleSaveNotes = (notes: string) => {
    if (!currentLead) return;
    setLeads(prev => prev.map(l => l.id === currentLead.id ? { ...l, notes } : l));
  };

  // ── Email sent callback ───────────────────────────────────────────────
  const handleEmailSent = useCallback(() => {
    const capturedIndex = currentIndex;
    const capturedLead  = leads[capturedIndex];
    if (!capturedLead) return;

    addActivity('email', capturedLead);
    setTimeout(() => {
      setOverlayInfo({ action: 'email', index: capturedIndex });
      setTimeout(() => setOverlayInfo(null), 1400);
    }, 1700);
  }, [currentIndex, leads, addActivity]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const timeAgo = (date: Date) => {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  };

  const progress  = leads.length > 0 ? (currentIndex / leads.length) * 100 : 0;
  const remaining = Math.max(0, leads.length - currentIndex);
  const total     = leads.length;

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

  if (!session) {
    return (
      <div className="h-screen w-screen flex items-center justify-center px-4" style={{ background: '#0a0a0f' }}>
        <div className="w-full max-w-md rounded-2xl border p-8" style={{ background: '#13131a', borderColor: '#1c1c2a' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
              <img
              src ={logoImage}
              alt="Swipr CRM Logo"
              className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold tracking-tight">Swipr CRM</h1>
              <p className="text-gray-400 text-sm">Sign up or log in to access your leads</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none"
                style={{ background: '#0a0a0f', borderColor: '#1c1c2a' }}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none"
                style={{ background: '#0a0a0f', borderColor: '#1c1c2a' }}
              />
            </div>

            {authError ? (
              <div className="rounded-xl border px-3 py-2 text-sm text-rose-300" style={{ background: '#2a1117', borderColor: '#5a1f2b' }}>
                {authError}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleSignUp}
                disabled={authSubmitting}
                className="rounded-xl px-4 py-3 text-white font-semibold transition-colors disabled:opacity-60"
                style={{ background: '#4f46e5' }}
              >
                {authSubmitting ? 'Please wait...' : 'Sign Up'}
              </button>
              <button
                onClick={handleLogin}
                disabled={authSubmitting}
                className="rounded-xl px-4 py-3 text-white font-semibold transition-colors disabled:opacity-60"
                style={{ background: '#1f2937' }}
              >
                {authSubmitting ? 'Please wait...' : 'Log In'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ background: '#0a0a0f' }}>

      {/* ── TOP BAR ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: '#1c1c2a' }}>
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
            <img
              src={logoImage}
              alt="Swipr CRM logo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-white font-bold tracking-tight">Swipr CRM</span>
        </div>

        {/* Stats — count / total */}
        <div className="flex items-center gap-2">
          {([
            { icon: CheckCircle, count: statsCount.connected, color: 'text-emerald-400', label: 'Connected' },
            { icon: XCircle,     count: statsCount.lost,      color: 'text-rose-400',    label: 'Lost'      },
            { icon: Voicemail,   count: statsCount.voicemail, color: 'text-amber-400',   label: 'Voicemail' },
            { icon: SkipForward, count: statsCount.next,      color: 'text-sky-400',     label: 'Skipped'   },
          ] as const).map(({ icon: Icon, count, color, label }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#13131a', border: '1px solid #1c1c2a' }}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-white font-semibold text-sm">
                {count}<span className="text-gray-600 font-normal">/{total}</span>
              </span>
              <span className="text-gray-500 text-xs hidden md:block">{label}</span>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end gap-0.5">
            <span className="text-white text-sm font-semibold">{currentIndex} / {total} reviewed</span>
            <div className="w-32 h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
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
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ background: '#1f2937', border: '1px solid #374151' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* ── CENTER: Rolodex ── */}
        <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
          {isDone ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-5">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-white mb-2">All Leads Reviewed!</h2>
              <p className="text-gray-400 text-sm mb-6">
                {statsCount.connected} connected · {statsCount.voicemail} voicemails · {statsCount.lost} lost
              </p>
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  fetchLeads();
                  setStatsCount({ connected: 0, lost: 0, voicemail: 0, next: 0 });
                  setActivityLog([]);
                }}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
              >
                Completed
              </button>
            </motion.div>
          ) : (
            <>
              {/* Rolodex scroll container */}
              <div
                ref={cardAreaRef}
                className="relative overflow-hidden"
                style={{ width: CARD_WIDTH, height: CONTAINER_H }}
              >
                {leads.map((lead, i) => {
                  const offset = i - currentIndex;
                  if (Math.abs(offset) > 1) return null;
                  return (
                    <motion.div
                      key={lead.id}
                      className="absolute inset-x-0"
                      style={{
                        height: CARD_HEIGHT,
                        top: 0,
                        pointerEvents: offset === 0 ? 'auto' : 'none',
                        zIndex: offset === 0 ? 10 : 1,
                      }}
                      animate={{
                        y:       offset * CARD_STRIDE + CENTER_Y,
                        scale:   offset === 0 ? 1    : 0.87,
                        opacity: offset === 0 ? 1    : 0.38,
                      }}
                      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                    >
                      <LeadCard
                        lead={lead}
                        overlayInfo={overlayInfo}
                        cardIndex={i}
                        onEdit={(field, value) => handleLeadEdit(lead.id, field, value)}
                        isActive={offset === 0}
                      />
                    </motion.div>
                  );
                })}
              </div>

              {/* Dot progress indicator */}
              <div className="mt-3 flex items-center gap-1.5">
                {leads.slice(0, Math.min(leads.length, 12)).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i < currentIndex
                        ? 'w-1.5 h-1.5 bg-gray-600'
                        : i === currentIndex
                        ? 'w-4 h-1.5 bg-indigo-400'
                        : 'w-1.5 h-1.5 bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT SIDEBAR: Activity Log ── */}
        <aside
          className="w-72 flex-shrink-0 flex flex-col border-l overflow-hidden"
          style={{ background: '#0e0e17', borderColor: '#1c1c2a' }}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: '#1c1c2a' }}>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span className="text-white text-sm font-semibold">Activity Log</span>
            </div>
            <span className="text-gray-600 text-xs">{activityLog.length} actions</span>
          </div>

          {/* Current lead quick info */}
          {!isDone && (
            <div className="px-4 py-3 border-b mx-3 mt-3 rounded-xl" style={{ background: '#13131a', border: '1px solid #1f1f2e' }}>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5">Current Lead</p>
              <p className="text-white font-semibold text-sm truncate">{currentLead.name}</p>
              <p className="text-gray-400 text-xs truncate">{currentLead.company}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-indigo-400 text-xs font-semibold">{currentLead.industry}</span>
                <span className="text-gray-500 text-xs">Score: {currentLead.score ?? 0}</span>
              </div>
            </div>
          )}

          {/* Activity items */}
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
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${meta.bgColor}`}
                    >
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{item.leadName}</p>
                        <p className="text-gray-500 text-xs truncate">{item.company}</p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className={`text-[10px] font-semibold ${meta.color}`}>{meta.label}</span>
                        <span className="text-gray-600 text-[10px]">{timeAgo(item.timestamp)}</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>

          {/* Pipeline stats */}
          <div className="px-4 py-3 border-t" style={{ borderColor: '#1c1c2a' }}>
            <p className="text-gray-600 text-xs uppercase tracking-wider mb-2">Pipeline</p>
            <div className="space-y-1.5">
              {[
                { label: 'Hot Leads',  val: leads.filter(l => l.score >= 85).length,            dot: 'bg-rose-500'    },
                { label: 'Qualified',  val: leads.filter(l => l.status === 'qualified').length,  dot: 'bg-emerald-500' },
                { label: 'Avg Score',  val: leads.length > 0 ? Math.round(leads.reduce((a, l) => a + (Number(l.score) || 0), 0) / leads.length) : 0, dot: 'bg-indigo-500' },
              ].map(({ label, val, dot }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <span className="text-gray-400 text-xs">{label}</span>
                  </div>
                  <span className="text-white text-xs font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* ── BOTTOM KEYBOARD LEGEND ── */}
      <footer
        className="flex-shrink-0 px-6 py-3 border-t flex items-center justify-center gap-2 flex-wrap"
        style={{ borderColor: '#1c1c2a', background: '#0a0a0f' }}
      >
        {SHORTCUT_KEYS.map(({ key, label, action, color, bg }) => {
          const isPressed = pressedKey === key;
          return (
            <motion.button
              key={key}
              animate={isPressed ? { scale: 0.88, y: -2 } : { scale: 1, y: 0 }}
              transition={{ duration: 0.1 }}
              onClick={() => {
                setPressedKey(key);
                setTimeout(() => setPressedKey(null), 300);
                if (action === 'notes')    setShowNotesModal(true);
                else if (action === 'email')    setShowEmailModal(true);
                else if (action === 'call')     setShowCallPanel(true);
                else if (action === 'previous') navigatePrev();
                else if (!isDone) triggerSwipeAction(action as SwipeAction);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                isPressed ? `${bg} scale-95` : `border-gray-800 bg-transparent`
              }`}
            >
              <kbd className={`text-xs font-bold font-mono ${isPressed ? color : 'text-gray-400'} min-w-[14px]`}>
                {key}
              </kbd>
              <span className={`text-xs ${isPressed ? color : 'text-gray-600'}`}>{label}</span>
            </motion.button>
          );
        })}
      </footer>

      {/* ── MODALS ── */}
      {currentLead && (
        <>
          <NotesModal
            lead={currentLead}
            isOpen={showNotesModal}
            onClose={() => setShowNotesModal(false)}
            onSave={handleSaveNotes}
          />
          <EmailDraftModal
            lead={currentLead}
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            onSend={handleEmailSent}
          />
          <CallPanel
            lead={currentLead}
            isOpen={showCallPanel}
            onClose={() => {
              setShowCallPanel(false);
              addActivity('call', currentLead);
            }}
          />
        </>
      )}
    </div>
  );
}
