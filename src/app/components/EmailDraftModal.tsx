'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Mail, ChevronDown } from 'lucide-react';
import { Lead } from '../data/leads';

interface EmailDraftModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSend?: () => void;
}

const TEMPLATES = [
  { id: 'follow_up', label: 'Follow Up' },
  { id: 'intro', label: 'Introduction' },
  { id: 'demo', label: 'Demo Request' },
];

function buildEmailBody(lead: Lead, templateId: string): string {
  switch (templateId) {
    case 'follow_up':
      return `Hi ${lead.name.split(' ')[0]},

I wanted to follow up on our previous conversation. I believe our solution could be a strong fit for ${lead.company}, particularly given your focus on ${lead.industry}.

I'd love to schedule a 20-minute call to walk you through a quick demo tailored to your team's needs.

Would any of the following times work for you?
• Monday, 10am–12pm ${lead.timezone}
• Tuesday, 2pm–4pm ${lead.timezone}
• Thursday, 9am–11am ${lead.timezone}

Looking forward to hearing from you.

Best,
[Your Name]`;

    case 'intro':
      return `Hi ${lead.name.split(' ')[0]},

My name is [Your Name] and I reach out because I've been following ${lead.company}'s growth in the ${lead.industry} space — impressive work.

We help companies like yours [brief value proposition]. I think there's a real opportunity to create value for your team.

Would you be open to a quick 15-minute call this week to explore?

Best,
[Your Name]`;

    case 'demo':
      return `Hi ${lead.name.split(' ')[0]},

Thank you for your interest in learning more about what we offer.

I'd love to set up a personalized demo for you and your team at ${lead.company}. I'll tailor it specifically for ${lead.industry} use cases and show you exactly how we can fit into your workflow.

The demo takes about 25 minutes. Are you available this week or early next week?

Best,
[Your Name]`;

    default:
      return '';
  }
}

export function EmailDraftModal({ lead, isOpen, onClose, onSend }: EmailDraftModalProps) {
  const [template, setTemplate] = useState('follow_up');
  const [subject, setSubject] = useState(`Re: ${lead.company} — Quick Follow Up`);
  const [body, setBody] = useState(buildEmailBody(lead, 'follow_up'));
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [sent, setSent] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const draftStorageKey = `swiprcrm.emailDraft.${lead.id}`;

  useEffect(() => {
    if (isOpen) {
      const savedDraftRaw = window.localStorage.getItem(draftStorageKey);
      let savedDraft: { template: string; subject: string; body: string } | null = null;
      if (savedDraftRaw) {
        try {
          savedDraft = JSON.parse(savedDraftRaw) as { template: string; subject: string; body: string };
        } catch {
          savedDraft = null;
        }
      }
      setSent(false);
      setDraftSaved(false);
      setTemplate(savedDraft?.template ?? 'follow_up');
      setSubject(savedDraft?.subject ?? `Re: ${lead.company} — Quick Follow Up`);
      setBody(savedDraft?.body ?? buildEmailBody(lead, 'follow_up'));
    }
  }, [draftStorageKey, lead, isOpen]);

  const selectTemplate = (id: string) => {
    setTemplate(id);
    setShowTemplateMenu(false);
    setBody(buildEmailBody(lead, id));
    const label = TEMPLATES.find(t => t.id === id)?.label ?? '';
    setSubject(`${lead.company} — ${label}`);
  };

  const handleSend = () => {
    window.localStorage.removeItem(draftStorageKey);
    setSent(true);
    onSend?.();
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleSaveDraft = () => {
    window.localStorage.setItem(draftStorageKey, JSON.stringify({ template, subject, body }));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!sent) handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="email-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            key="email-panel"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-2xl rounded-3xl overflow-hidden"
            style={{
              background: 'var(--surface-overlay)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-modal)',
              backdropFilter: 'blur(var(--glass-blur))',
            }}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                  <Mail className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] text-lg font-semibold tracking-tight">Draft Email</h3>
                  <p className="text-[var(--text-secondary)] text-xs">To: {lead.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Template Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--input-bg)] transition-colors"
                    style={{ border: '1px solid var(--border-subtle)' }}
                  >
                    Template
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <AnimatePresence>
                    {showTemplateMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-1.5 rounded-xl shadow-xl overflow-hidden z-10 w-40"
                        style={{
                          background: 'var(--surface-overlay)',
                          border: '1px solid var(--glass-border)',
                          backdropFilter: 'blur(20px)',
                        }}
                      >
                        {TEMPLATES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => selectTemplate(t.id)}
                            className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                              template === t.id ? 'text-purple-500 font-semibold bg-purple-500/10' : 'text-[var(--text-secondary)] hover:bg-[var(--input-bg)]'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--input-bg)]"
                >
                  <X className="w-4 h-4 text-[var(--text-tertiary)]" />
                </button>
              </div>
            </div>

            {/* Subject */}
            <div className="px-6 pt-4 pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.15em] w-14">Subject</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1 text-sm text-[var(--text-primary)] bg-transparent focus:outline-none placeholder:text-[var(--text-tertiary)] placeholder:opacity-50 font-medium"
                  placeholder="Email subject..."
                />
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full h-64 resize-none rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none transition-all placeholder:text-[var(--text-tertiary)] placeholder:opacity-50 font-mono leading-relaxed"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                }}
                placeholder="Write your email..."
              />
              <p className="text-[10px] text-[var(--text-tertiary)] mt-2 flex items-center gap-2">
                <span>Press <kbd className="font-sans px-1.5 py-0.5 rounded text-[var(--text-secondary)] bg-[var(--input-bg)] border border-[var(--border-subtle)] mx-0.5">⌘</kbd> + <kbd className="font-sans px-1.5 py-0.5 rounded text-[var(--text-secondary)] bg-[var(--input-bg)] border border-[var(--border-subtle)] mx-0.5">Enter</kbd> to send</span>
                <span className="w-1 h-1 rounded-full bg-[var(--border-subtle)]" />
                <span>Press <kbd className="font-sans px-1.5 py-0.5 rounded text-[var(--text-secondary)] bg-[var(--input-bg)] border border-[var(--border-subtle)] mx-0.5">Esc</kbd> to close</span>
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex items-center justify-between">
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Emails are currently simulated and saved to draft.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveDraft}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors border ${
                    draftSaved
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--input-bg)] border-transparent'
                  }`}
                >
                  {draftSaved ? 'Draft Saved' : 'Save Draft'}
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSend}
                  disabled={sent}
                  className="btn-premium flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: sent ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #A855F7, #7E22CE)',
                    border: sent ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(168,85,247,0.3)',
                  }}
                >
                  {sent ? (
                    <>✓ Sent!</>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Email
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
