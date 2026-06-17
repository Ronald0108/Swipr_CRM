import { useEffect, useState } from 'react';
import { Lead } from '../data/leads';
import { Phone, Mail, MapPin, TrendingUp, Clock, Zap, X, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type SwipeAction = 'voicemail' | 'lost' | 'connected' | 'next';
export type OverlayAction = SwipeAction | 'email' | 'notes';

interface OverlayInfo {
  action: OverlayAction;
  index: number;
}

interface LeadCardProps {
  lead: Lead;
  overlayInfo: OverlayInfo | null;
  cardIndex: number;
  onEdit: (field: keyof Lead, value: string | string[] | number) => void;
  isActive: boolean;
  onViewHistory?: () => void;
  onCall?: () => void;
  autoEditNameToken?: number;
  statusLabel: string;
}

const COMPANY_GRADIENTS = [
  'from-indigo-600 to-violet-700',
  'from-blue-600 to-cyan-600',
  'from-emerald-500 to-teal-700',
  'from-orange-500 to-rose-600',
  'from-slate-600 to-blue-700',
  'from-purple-600 to-pink-600',
  'from-sky-600 to-indigo-700',
  'from-green-500 to-emerald-700',
  'from-red-500 to-orange-600',
  'from-violet-600 to-fuchsia-600',
];

const overlayConfig: Record<OverlayAction, { bg: string; label: string; icon: string; border: string }> = {
  connected: { bg: 'bg-emerald-500/90', label: 'CONNECTED', icon: '✓',  border: 'border-emerald-400' },
  lost:      { bg: 'bg-rose-500/90',    label: 'LOST',      icon: '✕',  border: 'border-rose-400'    },
  voicemail: { bg: 'bg-amber-500/90',   label: 'VOICEMAIL', icon: '📞', border: 'border-amber-400'   },
  next:      { bg: 'bg-sky-500/90',     label: 'SKIP',      icon: '→',  border: 'border-sky-400'     },
  email:     { bg: 'bg-purple-500/90',  label: 'EMAIL SENT',icon: '✉',  border: 'border-purple-400'  },
  notes:     { bg: 'bg-yellow-500/90',  label: 'NOTES SAVED',icon: '✎', border: 'border-yellow-300'  },
};

// ── Editable Field ─────────────────────────────────────────────────────────
function EditableField({
  value,
  onSave,
  displayClassName = '',
  inputClassName = '',
  multiline = false,
  placeholder = 'Click to edit',
  disabled = false,
  autoEditToken,
}: {
  value: string;
  onSave: (v: string) => void;
  displayClassName?: string;
  inputClassName?: string;
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
  autoEditToken?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (disabled || autoEditToken === undefined) return;
    setDraft(value);
    setEditing(true);
  }, [autoEditToken, disabled, value]);

  const commit = (val: string) => {
    if (val.trim() !== value) onSave(val.trim());
    setEditing(false);
  };

  if (disabled) {
    return (
      <span className={displayClassName}>
        {value || <span className="opacity-40 italic text-xs">{placeholder}</span>}
      </span>
    );
  }

  if (editing) {
    const keyDown = (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') { setDraft(value); setEditing(false); }
    };

    if (multiline) {
      return (
        <textarea
          autoFocus
          value={draft}
          rows={3}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={e => {
            keyDown(e);
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(draft); }
          }}
          className={`bg-transparent border-b border-current focus:outline-none w-full resize-none ${inputClassName}`}
          placeholder={placeholder}
        />
      );
    }

    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={e => {
          keyDown(e);
          if (e.key === 'Enter') { e.preventDefault(); commit(draft); }
        }}
        className={`bg-transparent border-b border-current focus:outline-none w-full ${inputClassName}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      className={`cursor-text hover:opacity-75 transition-opacity ${displayClassName}`}
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
    >
      {value || <span className="opacity-40 italic text-xs">{placeholder}</span>}
    </span>
  );
}

function StatusBadge({ label }: { label: string }) {
  const isEmpty = label === 'None';
  return (
    <div className={`flex-shrink-0 rounded-md border px-2.5 py-1.5 text-right ${isEmpty ? 'border-gray-200 bg-gray-50 dark:border-[#2a2a3a] dark:bg-[#13131a]' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Status</p>
      <p className={`text-xs font-bold ${isEmpty ? 'text-gray-500 dark:text-gray-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{label}</p>
    </div>
  );
}

// ── Lead Card ─────────────────────────────────────────────────────────────
export function LeadCard({ lead, overlayInfo, cardIndex, onEdit, isActive, onViewHistory, onCall, autoEditNameToken, statusLabel }: LeadCardProps) {
  const gradient = COMPANY_GRADIENTS[cardIndex % COMPANY_GRADIENTS.length];
  const showOverlay = overlayInfo?.index === cardIndex;
  const overlay = showOverlay && overlayInfo ? overlayConfig[overlayInfo.action] : null;
  const canCall = isActive && Boolean(onCall) && lead.phone.trim().length > 0;

  const [addingTag, setAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

  return (
    <div className="relative w-full h-full rounded-3xl bg-white dark:bg-[#11111a] shadow-2xl dark:shadow-none dark:border dark:border-[#1f1f2e] overflow-hidden select-none">

      {/* ── Company Header (no deal size) ── */}
      <div className={`bg-gradient-to-br ${gradient} px-5 py-3`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">{lead.company[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <EditableField
              value={lead.company}
              onSave={v => onEdit('company', v)}
              displayClassName="text-white font-semibold text-sm leading-tight block truncate"
              inputClassName="text-white text-sm font-semibold"
              disabled={!isActive}
            />
            <EditableField
              value={lead.industry}
              onSave={v => onEdit('industry', v)}
              displayClassName="text-white/70 text-xs block"
              inputClassName="text-white/70 text-xs"
              disabled={!isActive}
            />
          </div>
        </div>
      </div>

      {/* ── Identity (no avatar) ── */}
      <div className="flex items-start justify-between px-5 py-2 border-b border-gray-100 dark:border-[#1f1f2e] gap-3">
        <div className="flex-1 min-w-0">
          <EditableField
            value={lead.name}
            onSave={v => onEdit('name', v)}
            displayClassName="text-gray-900 dark:text-white font-bold text-xl leading-tight block"
            inputClassName="text-gray-900 dark:text-white font-bold text-xl"
            disabled={!isActive}
            autoEditToken={autoEditNameToken}
          />
          <EditableField
            value={lead.title}
            onSave={v => onEdit('title', v)}
            displayClassName="text-gray-500 dark:text-gray-400 text-sm block mt-0.5"
            inputClassName="text-gray-500 dark:text-gray-400 text-sm"
            disabled={!isActive}
          />
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <MapPin className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <EditableField
              value={lead.location}
              onSave={v => onEdit('location', v)}
              displayClassName="text-gray-400 dark:text-gray-500 text-xs"
              inputClassName="text-gray-400 dark:text-gray-500 text-xs"
              disabled={!isActive}
            />
            <span className="text-gray-300 dark:text-gray-600 text-xs">·</span>
            <EditableField
              value={lead.timezone}
              onSave={v => onEdit('timezone', v)}
              displayClassName="text-gray-400 dark:text-gray-500 text-xs"
              inputClassName="text-gray-400 dark:text-gray-500 text-xs w-16"
              disabled={!isActive}
            />
          </div>
        </div>
        <StatusBadge label={statusLabel} />
      </div>

      {/* ── Contact Info ── */}
      <div className="px-5 py-2 border-b border-gray-100 dark:border-[#1f1f2e] space-y-1.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (canCall) onCall?.();
            }}
            disabled={!canCall}
            aria-label={`Call ${lead.name}`}
            title={canCall ? `Call ${lead.phone}` : 'No phone number available'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              canCall ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 cursor-pointer' : 'bg-gray-100 dark:bg-[#1a1a24] cursor-not-allowed opacity-60'
            }`}
          >
            <Phone className="w-3.5 h-3.5 text-blue-600" />
          </button>
          <EditableField
            value={lead.phone}
            onSave={v => onEdit('phone', v)}
            displayClassName="text-gray-700 dark:text-gray-300 text-sm font-medium flex-1"
            inputClassName="text-gray-700 dark:text-gray-300 text-sm font-medium"
            disabled={!isActive}
            placeholder="+1 (555) 000-0000"
          />
          {lead.callAttempts > 0 && (
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-[#1a1a24] px-2 py-0.5 rounded-full flex-shrink-0">
              {lead.callAttempts} attempt{lead.callAttempts !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <EditableField
            value={lead.email}
            onSave={v => onEdit('email', v)}
            displayClassName="text-gray-700 dark:text-gray-300 text-sm flex-1 truncate"
            inputClassName="text-gray-700 dark:text-gray-300 text-sm"
            disabled={!isActive}
            placeholder="email@example.com"
          />
        </div>
      </div>

      {/* ── Stats Row (source + last contact only, no company size) ── */}
      <div className="px-5 py-2 border-b border-gray-100 dark:border-[#1f1f2e] flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <EditableField
            value={lead.source}
            onSave={v => onEdit('source', v)}
            displayClassName="text-xs text-gray-500 dark:text-gray-400"
            inputClassName="text-xs text-gray-500 dark:text-gray-400"
            disabled={!isActive}
            placeholder="Source"
          />
        </div>
        <div className="h-3 w-px bg-gray-200 dark:bg-[#2a2a3a]" />
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <EditableField
            value={lead.lastContact}
            onSave={v => onEdit('lastContact', v)}
            displayClassName="text-xs text-gray-500 dark:text-gray-400"
            inputClassName="text-xs text-gray-500 dark:text-gray-400"
            disabled={!isActive}
            placeholder="Last contact"
          />
        </div>
        {isActive && onViewHistory && (
          <button
            onClick={onViewHistory}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/10 px-2 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
          >
            <History className="h-3 w-3" />
            View History
          </button>
        )}
      </div>
      

      {/* ── Notes ── */}
      <div className="px-5 py-2 border-b border-gray-100 dark:border-[#1f1f2e]">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</span>
        </div>
        <EditableField
          value={lead.notes}
          onSave={v => onEdit('notes', v)}
          displayClassName="text-gray-600 dark:text-gray-300 text-sm leading-snug line-clamp-2 block"
          inputClassName="text-gray-600 dark:text-gray-300 text-sm leading-relaxed"
          multiline
          disabled={!isActive}
          placeholder="Add notes about this lead..."
        />
      </div>

      {/* ── Tags ── */}
      <div className="px-5 py-2 flex flex-wrap gap-1.5 items-center">
        {lead.tags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="group/tag flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#1a1a24]"
          >
            <span className="text-gray-600 dark:text-gray-400 text-xs font-medium">{tag}</span>
            {isActive && (
              <button
                onClick={() => onEdit('tags', lead.tags.filter((_, i) => i !== idx))}
                className="ml-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5 text-gray-400 dark:text-gray-500 hover:text-rose-400 dark:hover:text-rose-400" />
              </button>
            )}
          </span>
        ))}
        {isActive && (
          addingTag ? (
            <input
              autoFocus
              value={newTagValue}
              onChange={e => setNewTagValue(e.target.value)}
              onBlur={() => {
                if (newTagValue.trim()) onEdit('tags', [...lead.tags, newTagValue.trim()]);
                setNewTagValue(''); setAddingTag(false);
              }}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Enter' && newTagValue.trim()) {
                  onEdit('tags', [...lead.tags, newTagValue.trim()]);
                  setNewTagValue(''); setAddingTag(false);
                }
                if (e.key === 'Escape') { setNewTagValue(''); setAddingTag(false); }
              }}
              className="px-2.5 py-1 rounded-full border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/10 text-xs text-indigo-600 dark:text-indigo-300 w-24 focus:outline-none"
              placeholder="New tag…"
            />
          ) : (
            <button
              onClick={() => setAddingTag(true)}
              className="px-2.5 py-1 rounded-full border border-dashed border-gray-300 dark:border-[#2a2a3a] text-gray-400 dark:text-gray-500 text-xs hover:bg-gray-50 dark:hover:bg-[#1a1a24] transition-colors"
            >
              + tag
            </button>
          )
        )}
      </div>

      {/* ── Action Overlay ── */}
      <AnimatePresence>
        {overlay && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`absolute inset-0 ${overlay.bg} flex flex-col items-center justify-center rounded-3xl z-20 backdrop-blur-sm`}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`border-4 ${overlay.border} rounded-2xl px-8 py-5 text-center`}
            >
              <div className="text-5xl mb-2">{overlay.icon}</div>
              <p className="text-white font-black text-3xl tracking-widest">{overlay.label}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
