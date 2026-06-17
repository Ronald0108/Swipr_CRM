'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lead } from '../data/leads';
import { useAuth } from './AuthContext';
import {
  FetchLeadsMode,
  LeadEditValue,
} from '../types/import';
import {
  normalizeLeadRow,
  buildBlankLeadPayload,
  getLeadDatabaseColumn,
  getNextLeadIndex,
  getStoredActiveLeadId,
  setStoredActiveLeadId,
} from '../lib/utils';
import { SwipeAction, OverlayAction } from '../components/LeadCard';

interface LeadsContextType {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  leadsLoading: boolean;
  fetchLeads: (mode?: FetchLeadsMode) => Promise<void>;
  currentLead: Lead | null;
  isDone: boolean;

  handleLeadEdit: (leadId: string, field: keyof Lead, value: LeadEditValue) => void;
  autoEditLeadId: string | null;
  autoEditLeadToken: number;
  handleCreateLead: () => Promise<void>;
  creatingLead: boolean;
  handleDeleteCurrentLead: () => Promise<void>;
  deletingLead: boolean;

  leadSearchQuery: string;
  setLeadSearchQuery: (v: string) => void;
  jumpToLeadSearch: (direction: 1 | -1) => void;
  jumpToLeadSearchIndex: (query: string, startIndex: number, direction?: 1 | -1) => void;
  leadSearchMatchCount: number;

  navigatePrev: () => void;
  navigateNext: () => void;
  jumpToFirstLead: () => void;
  triggerSwipeAction: (action: SwipeAction, addActivityHook?: (action: SwipeAction, lead: Lead) => Promise<void>) => void;
  overlayInfo: { action: OverlayAction; index: number } | null;
  setOverlayInfo: React.Dispatch<React.SetStateAction<{ action: OverlayAction; index: number } | null>>;
  pressedKey: string | null;
  setPressedKey: (v: string | null) => void;
  isAnimatingRef: React.MutableRefObject<boolean>;
  cardAreaRef: React.RefObject<HTMLDivElement>;
  lastNavTime: React.MutableRefObject<number>;
  currentIndexRef: React.MutableRefObject<number>;
  currentLeadIdRef: React.MutableRefObject<string | null>;
  openLeadHistory: (leadId: string) => void;
}

const LeadsContext = createContext<LeadsContextType | null>(null);

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error('useLeads must be used within LeadsProvider');
  return ctx;
}

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const router = useRouter();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [creatingLead, setCreatingLead] = useState(false);
  const [deletingLead, setDeletingLead] = useState(false);
  const [autoEditLeadId, setAutoEditLeadId] = useState<string | null>(null);
  const [autoEditLeadToken, setAutoEditLeadToken] = useState(0);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [overlayInfo, setOverlayInfo] = useState<{ action: OverlayAction; index: number } | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const currentIndexRef = useRef(0);
  const currentLeadIdRef = useRef<string | null>(null);
  const isAnimatingRef = useRef(false);
  const lastNavTime = useRef(0);
  const cardAreaRef = useRef<HTMLDivElement>(null!);

  const currentLead = leads[currentIndex] ?? leads[leads.length - 1] ?? null;
  const isDone = !leadsLoading && leads.length > 0 && currentIndex >= leads.length;

  const fetchLeads = useCallback(async (mode: FetchLeadsMode = 'preserve') => {
    if (!session) { setLeads([]); setCurrentIndex(0); setLeadsLoading(false); return; }
    setLeadsLoading(true);
    try {
      const { data, error } = await supabase.from('leads').select('*').eq('user_id', session.user.id);
      if (error) { console.error('Error fetching leads:', error); return; }
      const normalizedLeads = (data || []).map((lead) => normalizeLeadRow(lead));
      const nextLeads = normalizedLeads as Lead[];
      const preferredLeadId = mode === 'reset' ? nextLeads[0]?.id ?? null : currentLeadIdRef.current ?? getStoredActiveLeadId(session.user.id);
      const nextIndex = getNextLeadIndex(nextLeads, preferredLeadId, currentIndexRef.current);
      setLeads(nextLeads);
      setCurrentIndex(nextIndex);
    } finally { setLeadsLoading(false); }
  }, [session]);

  const persistLeadEdit = useCallback(async (leadId: string, field: keyof Lead, value: LeadEditValue) => {
    if (!session) return;
    if (field === 'id') { console.error('Refusing to edit immutable lead id.'); return; }
    const { error } = await supabase.from('leads').update({ [getLeadDatabaseColumn(field)]: value }).eq('id', leadId).eq('user_id', session.user.id);
    if (error) { console.error('Error saving lead edit:', error); await fetchLeads(); }
  }, [fetchLeads, session]);

  const handleLeadEdit = useCallback((leadId: string, field: keyof Lead, value: LeadEditValue) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, [field]: value } : l));
    void persistLeadEdit(leadId, field, value);
  }, [persistLeadEdit]);

  const handleCreateLead = useCallback(async () => {
    if (!session || creatingLead) return;
    setCreatingLead(true);
    try {
      const { data, error } = await supabase.from('leads').insert(buildBlankLeadPayload(session.user.id)).select('*').single();
      if (error) { console.error('Error creating lead:', error); return; }
      const newLead = normalizeLeadRow(data as Record<string, unknown>);
      setLeads((prev) => [...prev, newLead]);
      setCurrentIndex(leads.length);
      currentLeadIdRef.current = newLead.id;
      setStoredActiveLeadId(session.user.id, newLead.id);
      setAutoEditLeadId(newLead.id);
      setAutoEditLeadToken((token) => token + 1);
    } finally { setCreatingLead(false); }
  }, [creatingLead, leads.length, session]);

  const handleDeleteCurrentLead = useCallback(async () => {
    if (!session || !currentLead) return;
    const leadToDelete = currentLead;
    setDeletingLead(true);
    try {
      const { error } = await supabase.from('leads').delete().eq('id', leadToDelete.id).eq('user_id', session.user.id);
      if (error) { console.error('Error deleting lead:', error); return; }
      setLeads((prev) => {
        const nextLeads = prev.filter((lead) => lead.id !== leadToDelete.id);
        const nextIdx = Math.min(currentIndex, Math.max(nextLeads.length - 1, 0));
        const nextLead = nextLeads[nextIdx] ?? null;
        currentLeadIdRef.current = nextLead?.id ?? null;
        setCurrentIndex(nextIdx);
        setStoredActiveLeadId(session.user.id, nextLead?.id ?? null);
        return nextLeads;
      });
    } finally { setDeletingLead(false); }
  }, [currentIndex, currentLead, session]);

  const findLeadSearchIndex = useCallback((query: string, startIndex: number, direction: 1 | -1) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || leads.length === 0) return -1;
    for (let step = 1; step <= leads.length; step += 1) {
      const index = (startIndex + (step * direction) + leads.length) % leads.length;
      const lead = leads[index];
      const haystack = `${lead.name} ${lead.company} ${lead.title} ${lead.email} ${lead.phone}`.toLowerCase();
      if (haystack.includes(normalizedQuery)) return index;
    }
    return -1;
  }, [leads]);

  const jumpToLeadSearch = useCallback((direction: 1 | -1 = 1) => {
    const nextIndex = findLeadSearchIndex(leadSearchQuery, currentIndex, direction);
    if (nextIndex < 0) return;
    setCurrentIndex(nextIndex);
    const lead = leads[nextIndex];
    currentLeadIdRef.current = lead?.id ?? null;
    if (session && lead) setStoredActiveLeadId(session.user.id, lead.id);
  }, [currentIndex, findLeadSearchIndex, leadSearchQuery, leads, session]);

  const jumpToLeadSearchIndex = useCallback((query: string, startIndex: number, direction: 1 | -1 = 1) => {
    const nextIndex = findLeadSearchIndex(query, startIndex, direction);
    if (nextIndex < 0) return;
    setCurrentIndex(nextIndex);
    const lead = leads[nextIndex];
    currentLeadIdRef.current = lead?.id ?? null;
    if (session && lead) setStoredActiveLeadId(session.user.id, lead.id);
  }, [findLeadSearchIndex, leads, session]);

  const triggerSwipeAction = useCallback((action: SwipeAction, addActivityHook?: (action: SwipeAction, lead: Lead) => Promise<void>) => {
    if (isAnimatingRef.current || isDone) return;
    isAnimatingRef.current = true;
    setOverlayInfo({ action, index: currentIndex });
    
    if (addActivityHook) {
      void addActivityHook(action, leads[currentIndex]);
    }

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => { setOverlayInfo(null); isAnimatingRef.current = false; }, 480);
    }, 300);
  }, [isDone, currentIndex, leads]);

  const jumpToFirstLead = useCallback(() => {
    if (leads.length === 0 || isAnimatingRef.current) return;
    setCurrentIndex(0);
    currentLeadIdRef.current = leads[0]?.id ?? null;
    if (session && leads[0]) setStoredActiveLeadId(session.user.id, leads[0].id);
  }, [leads, session]);

  const navigatePrev = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTime.current < 400) return;
    if (isAnimatingRef.current) return;
    lastNavTime.current = now;
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const navigateNext = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTime.current < 400) return;
    if (isAnimatingRef.current) return;
    if (leads.length === 0) return;
    lastNavTime.current = now;
    setCurrentIndex(prev => Math.min(prev + 1, leads.length - 1));
  }, [leads.length]);

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { currentLeadIdRef.current = currentLead?.id ?? null; }, [currentLead]);

  useEffect(() => {
    if (!session) return;
    setStoredActiveLeadId(session.user.id, currentLead?.id ?? null);
  }, [currentLead?.id, session]);

  useEffect(() => {
    if (leads.length === 0) { if (currentIndex !== 0) setCurrentIndex(0); return; }
    const boundedIndex = Math.min(Math.max(currentIndex, 0), leads.length);
    if (boundedIndex !== currentIndex) setCurrentIndex(boundedIndex);
  }, [currentIndex, leads.length]);

  useEffect(() => {
    if (session) { fetchLeads(); }
    else { setLeads([]); setCurrentIndex(0); setLeadsLoading(false); currentLeadIdRef.current = null; }
  }, [fetchLeads, session]);

  const openLeadHistory = useCallback((leadId: string) => {
    if (!session) return;
    setStoredActiveLeadId(session.user.id, leadId);
    router.push(`/leads/${encodeURIComponent(leadId)}`);
  }, [router, session]);

  const normalizedLeadSearchQuery = leadSearchQuery.trim().toLowerCase();
  const leadSearchMatchCount = normalizedLeadSearchQuery
    ? leads.filter((lead) => `${lead.name} ${lead.company} ${lead.title} ${lead.email} ${lead.phone}`.toLowerCase().includes(normalizedLeadSearchQuery)).length
    : 0;

  return (
    <LeadsContext.Provider value={{
      leads, setLeads, currentIndex, setCurrentIndex, leadsLoading, fetchLeads, currentLead, isDone,
      handleLeadEdit, autoEditLeadId, autoEditLeadToken, handleCreateLead, creatingLead, handleDeleteCurrentLead, deletingLead,
      leadSearchQuery, setLeadSearchQuery, jumpToLeadSearch, jumpToLeadSearchIndex, leadSearchMatchCount,
      navigatePrev, navigateNext, jumpToFirstLead, triggerSwipeAction,
      overlayInfo, setOverlayInfo, pressedKey, setPressedKey,
      isAnimatingRef, cardAreaRef, lastNavTime, currentIndexRef, currentLeadIdRef,
      openLeadHistory
    }}>
      {children}
    </LeadsContext.Provider>
  );
}
