'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Lead } from '../data/leads';
import { CallNotice } from '../types/import';
import type { CallOutcome } from '../types/activity';
import { useActivity } from './ActivityContext';
import { useLeads } from './LeadsContext';
import { buildTelHref } from '../lib/utils';

interface ModalContextType {
  showNotesModal: boolean;
  setShowNotesModal: (v: boolean) => void;
  showEmailModal: boolean;
  setShowEmailModal: (v: boolean) => void;
  showLeadSearch: boolean;
  setShowLeadSearch: (v: boolean | ((prev: boolean) => boolean)) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (v: boolean) => void;
  showImportModal: boolean;
  setShowImportModal: (v: boolean) => void;
  showCrmModal: boolean;
  setShowCrmModal: (v: boolean) => void;

  callNotice: CallNotice | null;
  promptLeadCall: (lead: Lead | null) => void;
  promptLeadEmail: (lead: Lead | null) => void;
  showCallNoticeMessage: (notice: CallNotice) => void;

  showCallOutcomeModal: boolean;
  callOutcomeLead: Lead | null;
  handleCallOutcome: (outcome: CallOutcome, notes: string) => void;
  closeCallOutcomeModal: () => void;
  
  handleSaveNotes: (notes: string) => void;
  handleEmailSent: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModals() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModals must be used within ModalProvider');
  return ctx;
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const { addActivity } = useActivity();
  const { handleLeadEdit, currentIndex, setOverlayInfo, leads } = useLeads();

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showLeadSearch, setShowLeadSearch] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCrmModal, setShowCrmModal] = useState(false);
  const [callNotice, setCallNotice] = useState<CallNotice | null>(null);
  const [showCallOutcomeModal, setShowCallOutcomeModal] = useState(false);
  const [callOutcomeLead, setCallOutcomeLead] = useState<Lead | null>(null);

  const callNoticeTimeoutRef = useRef<number | null>(null);

  const showCallNoticeMessage = useCallback((notice: CallNotice) => {
    setCallNotice(notice);
    if (callNoticeTimeoutRef.current) window.clearTimeout(callNoticeTimeoutRef.current);
    callNoticeTimeoutRef.current = window.setTimeout(() => { setCallNotice(null); callNoticeTimeoutRef.current = null; }, 2600);
  }, []);

  const promptLeadCall = useCallback((lead: Lead | null) => {
    if (!lead) { showCallNoticeMessage({ kind: 'error', message: 'No lead selected to call.' }); return; }
    const telHref = buildTelHref(lead.phone);
    if (!telHref) { showCallNoticeMessage({ kind: 'error', message: `${lead.name} does not have a phone number.` }); return; }
    // Fire the tel: link to open the user's dialer
    const telLink = document.createElement('a');
    telLink.href = telHref; telLink.style.display = 'none'; telLink.setAttribute('aria-hidden', 'true');
    document.body.appendChild(telLink); telLink.click(); telLink.remove();
    showCallNoticeMessage({ kind: 'success', message: `Opening dialer for ${lead.name}.` });
    // Log initial call activity and increment call attempts
    void addActivity('call', lead, { status: 'initiated' });
    handleLeadEdit(lead.id, 'callAttempts', lead.callAttempts + 1);
    // Open the Call Outcome Modal
    setCallOutcomeLead(lead);
    setShowCallOutcomeModal(true);
  }, [addActivity, handleLeadEdit, showCallNoticeMessage]);

  const handleCallOutcome = useCallback((outcome: CallOutcome, notes: string) => {
    if (!callOutcomeLead) return;
    const metadata: Record<string, unknown> = { status: outcome };
    if (notes.trim()) metadata.notes = notes.trim();
    void addActivity('call', callOutcomeLead, metadata);
    setShowCallOutcomeModal(false);
    setCallOutcomeLead(null);
  }, [addActivity, callOutcomeLead]);

  const closeCallOutcomeModal = useCallback(() => {
    setShowCallOutcomeModal(false);
    setCallOutcomeLead(null);
  }, []);

  const promptLeadEmail = useCallback((lead: Lead | null) => {
    if (!lead) { showCallNoticeMessage({ kind: 'error', message: 'No lead selected to email.' }); return; }
    if (!lead.email.trim()) { showCallNoticeMessage({ kind: 'error', message: `${lead.name} does not have an email address.` }); return; }
    setShowEmailModal(true);
  }, [showCallNoticeMessage]);

  const handleSaveNotes = useCallback((notes: string) => {
    const currentLead = leads[currentIndex] ?? leads[leads.length - 1] ?? null;
    if (!currentLead) return;
    const capturedLead = currentLead;
    const capturedIndex = currentIndex;
    handleLeadEdit(currentLead.id, 'notes', notes);
    setOverlayInfo({ action: 'notes', index: capturedIndex });
    setTimeout(() => setOverlayInfo(null), 1200);
    void addActivity('notes', capturedLead);
  }, [addActivity, currentIndex, handleLeadEdit, leads, setOverlayInfo]);

  const handleEmailSent = useCallback(() => {
    const capturedIndex = currentIndex;
    const capturedLead  = leads[capturedIndex];
    if (!capturedLead) return;
    void addActivity('email', capturedLead);
    setTimeout(() => {
      setOverlayInfo({ action: 'email', index: capturedIndex });
      setTimeout(() => setOverlayInfo(null), 1400);
    }, 1700);
  }, [currentIndex, leads, addActivity, setOverlayInfo]);

  useEffect(() => {
    return () => { if (callNoticeTimeoutRef.current) window.clearTimeout(callNoticeTimeoutRef.current); };
  }, []);

  return (
    <ModalContext.Provider value={{
      showNotesModal, setShowNotesModal, showEmailModal, setShowEmailModal,
      showLeadSearch, setShowLeadSearch, showDeleteConfirm, setShowDeleteConfirm,
      showImportModal, setShowImportModal, showCrmModal, setShowCrmModal,
      callNotice, promptLeadCall, promptLeadEmail, showCallNoticeMessage,
      showCallOutcomeModal, callOutcomeLead, handleCallOutcome, closeCallOutcomeModal,
      handleSaveNotes, handleEmailSent
    }}>
      {children}
    </ModalContext.Provider>
  );
}
