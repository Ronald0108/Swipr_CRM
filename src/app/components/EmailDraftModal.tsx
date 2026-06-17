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
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            key="email-panel"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="w-full max-w-2xl bg-white dark:bg-[#11111a] rounded-2xl shadow-2xl dark:shadow-none dark:border dark:border-[#1f1f2e] overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#1f1f2e]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white font-semibold">Draft Email</h3>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">To: {lead.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Template Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#1a1a24] hover:bg-gray-200 dark:hover:bg-[#2a2a3a] transition-colors text-xs text-gray-600 dark:text-gray-400 font-medium"
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
                        className="absolute right-0 top-full mt-1 bg-white dark:bg-[#13131a] rounded-xl shadow-xl border border-gray-100 dark:border-[#1f1f2e] overflow-hidden z-10 w-36"
                      >
                        {TEMPLATES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => selectTemplate(t.id)}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors ${
                              template === t.id ? 'text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-500/10' : 'text-gray-700 dark:text-gray-300'
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
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1a24] flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </button>
              </div>
            </div>

            {/* Subject */}
            <div className="px-6 pt-4 pb-2 border-b border-gray-100 dark:border-[#1f1f2e]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-14">Subject</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1 text-sm text-gray-800 dark:text-gray-200 bg-transparent focus:outline-none placeholder-gray-300 dark:placeholder-gray-600"
                  placeholder="Email subject..."
                />
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full h-64 resize-none rounded-xl border border-gray-200 dark:border-[#2a2a3a] bg-gray-50 dark:bg-[#0a0a0f] px-4 py-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all font-mono leading-relaxed"
                placeholder="Write your email..."
              />
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">Esc to close · Cmd/Ctrl + Enter to send</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDraft}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    draftSaved ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-[#1a1a24] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a3a]'
                  }`}
                >
                  {draftSaved ? 'Draft Saved' : 'Save Draft'}
                </button>
                <button
                  onClick={handleSend}
                  disabled={sent}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all ${
                    sent
                      ? 'bg-emerald-500 scale-95'
                      : 'bg-purple-600 hover:bg-purple-700 hover:scale-105'
                  }`}
                >
                  {sent ? (
                    <>✓ Sent!</>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
