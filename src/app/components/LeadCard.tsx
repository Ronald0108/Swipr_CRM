import { useState } from 'react';
import { Lead } from '../data/leads';
import { Phone, Mail, MapPin, TrendingUp, Clock, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type SwipeAction = 'voicemail' | 'lost' | 'connected' | 'next';
export type OverlayAction = SwipeAction | 'email';

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
}: {
  value: string;
  onSave: (v: string) => void;
  displayClassName?: string;
  inputClassName?: string;
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

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

// ── Score Ring ────────────────────────────────────────────────────────────
function ScoreRing({ score, onEdit, isActive }: { score: number; onEdit: (v: number) => void; isActive: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#f43f5e';

  if (editing) {
    return (
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
        <input
          autoFocus
          type="number"
          min={0}
          max={100}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { onEdit(Math.min(100, Math.max(0, parseInt(draft) || 0))); setEditing(false); }}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Enter') { onEdit(Math.min(100, Math.max(0, parseInt(draft) || 0))); setEditing(false); }
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-12 h-12 rounded-full text-center text-xs border-2 border-indigo-400 focus:outline-none font-bold"
          style={{ color }}
        />
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Score</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-0.5 flex-shrink-0 ${isActive ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
      onClick={() => isActive && (setDraft(String(score)), setEditing(true))}
      title={isActive ? 'Click to edit score' : undefined}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #1f2937 0deg)` }}
      >
        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
          <span style={{ color, fontSize: '10px', fontWeight: 700 }}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">Score</span>
    </div>
  );
}

// ── Lead Card ─────────────────────────────────────────────────────────────
export function LeadCard({ lead, overlayInfo, cardIndex, onEdit, isActive }: LeadCardProps) {
  const gradient = COMPANY_GRADIENTS[cardIndex % COMPANY_GRADIENTS.length];
  const showOverlay = overlayInfo?.index === cardIndex;
  const overlay = showOverlay && overlayInfo ? overlayConfig[overlayInfo.action] : null;

  const [addingTag, setAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

  return (
    <div className="relative w-full h-full rounded-3xl bg-white shadow-2xl overflow-hidden select-none">

      {/* ── Company Header (no deal size) ── */}
      <div className={`bg-gradient-to-br ${gradient} px-5 py-4`}>
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
      <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100 gap-3">
        <div className="flex-1 min-w-0">
          <EditableField
            value={lead.name}
            onSave={v => onEdit('name', v)}
            displayClassName="text-gray-900 font-bold text-xl leading-tight block"
            inputClassName="text-gray-900 font-bold text-xl"
            disabled={!isActive}
          />
          <EditableField
            value={lead.title}
            onSave={v => onEdit('title', v)}
            displayClassName="text-gray-500 text-sm block mt-0.5"
            inputClassName="text-gray-500 text-sm"
            disabled={!isActive}
          />
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <EditableField
              value={lead.location}
              onSave={v => onEdit('location', v)}
              displayClassName="text-gray-400 text-xs"
              inputClassName="text-gray-400 text-xs"
              disabled={!isActive}
            />
            <span className="text-gray-300 text-xs">·</span>
            <EditableField
              value={lead.timezone}
              onSave={v => onEdit('timezone', v)}
              displayClassName="text-gray-400 text-xs"
              inputClassName="text-gray-400 text-xs w-16"
              disabled={!isActive}
            />
          </div>
        </div>
        <ScoreRing score={lead.score} onEdit={v => onEdit('score', v)} isActive={isActive} />
      </div>

      {/* ── Contact Info ── */}
      <div className="px-5 py-3 border-b border-gray-100 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Phone className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <EditableField
            value={lead.phone}
            onSave={v => onEdit('phone', v)}
            displayClassName="text-gray-700 text-sm font-medium flex-1"
            inputClassName="text-gray-700 text-sm font-medium"
            disabled={!isActive}
            placeholder="+1 (555) 000-0000"
          />
          {lead.callAttempts > 0 && (
            <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
              {lead.callAttempts} attempt{lead.callAttempts !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Mail className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <EditableField
            value={lead.email}
            onSave={v => onEdit('email', v)}
            displayClassName="text-gray-700 text-sm flex-1 truncate"
            inputClassName="text-gray-700 text-sm"
            disabled={!isActive}
            placeholder="email@example.com"
          />
        </div>
      </div>

      {/* ── Stats Row (source + last contact only, no company size) ── */}
      <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <EditableField
            value={lead.source}
            onSave={v => onEdit('source', v)}
            displayClassName="text-xs text-gray-500"
            inputClassName="text-xs text-gray-500"
            disabled={!isActive}
            placeholder="Source"
          />
        </div>
        <div className="h-3 w-px bg-gray-200" />
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <EditableField
            value={lead.lastContact}
            onSave={v => onEdit('lastContact', v)}
            displayClassName="text-xs text-gray-500"
            inputClassName="text-xs text-gray-500"
            disabled={!isActive}
            placeholder="Last contact"
          />
        </div>
      </div>

      {/* ── Notes ── */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</span>
        </div>
        <EditableField
          value={lead.notes}
          onSave={v => onEdit('notes', v)}
          displayClassName="text-gray-600 text-sm leading-relaxed line-clamp-2 block"
          inputClassName="text-gray-600 text-sm leading-relaxed"
          multiline
          disabled={!isActive}
          placeholder="Add notes about this lead..."
        />
      </div>

      {/* ── Tags ── */}
      <div className="px-5 py-2.5 flex flex-wrap gap-1.5 items-center">
        {lead.tags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="group/tag flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-gray-100"
          >
            <span className="text-gray-600 text-xs font-medium">{tag}</span>
            {isActive && (
              <button
                onClick={() => onEdit('tags', lead.tags.filter((_, i) => i !== idx))}
                className="ml-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5 text-gray-400 hover:text-rose-400" />
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
              className="px-2.5 py-1 rounded-full border border-indigo-300 bg-indigo-50 text-xs text-indigo-600 w-24 focus:outline-none"
              placeholder="New tag…"
            />
          ) : (
            <button
              onClick={() => setAddingTag(true)}
              className="px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-gray-400 text-xs hover:bg-gray-50 transition-colors"
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
