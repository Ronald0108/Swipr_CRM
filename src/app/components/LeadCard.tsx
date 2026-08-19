'use client';

import { useEffect, useState } from 'react';
import { Lead } from '../data/leads';
import { Phone, Mail, MapPin, TrendingUp, Clock, Zap, X, History, Webhook } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CRM_PROVIDER_INFO, type CrmProvider } from '../contexts/CrmContext';

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
  'from-indigo-600/90 to-violet-700/90',
  'from-blue-600/90 to-cyan-600/90',
  'from-emerald-500/90 to-teal-700/90',
  'from-orange-500/90 to-rose-600/90',
  'from-slate-600/90 to-blue-700/90',
  'from-purple-600/90 to-pink-600/90',
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
          className={`bg-transparent border-b border-[var(--accent-indigo)] focus:outline-none w-full resize-none ${inputClassName}`}
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
        className={`bg-transparent border-b border-[var(--accent-indigo)] focus:outline-none w-full ${inputClassName}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      className={`cursor-text hover:bg-[var(--input-bg)] px-1 -mx-1 rounded transition-colors ${displayClassName}`}
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
    <div className={`flex-shrink-0 rounded-lg border px-2.5 py-1.5 text-right ${isEmpty ? 'border-[var(--border-subtle)] bg-[var(--input-bg)]' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Status</p>
      <p className={`text-xs font-bold ${isEmpty ? 'text-[var(--text-secondary)]' : 'text-emerald-600 dark:text-emerald-400'}`}>{label}</p>
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

  // Determine CRM Source
  const crmSource = (lead as any).crmSource as CrmProvider | undefined;
  const sourceInfo = crmSource ? CRM_PROVIDER_INFO[crmSource] : null;

  return (
    <div className="relative w-full h-full rounded-[32px] overflow-hidden select-none flex flex-col transition-all duration-300"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--shadow-card)',
        backdropFilter: 'blur(var(--glass-blur))'
      }}>
      
      {/* ── Top Row: Avatar & Header ── */}
      <div className="flex items-center gap-6 px-8 py-7" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--input-bg)' }}>
        {/* Avatar Square */}
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background: 'linear-gradient(135deg, var(--accent-indigo), var(--text-secondary))' }}>
          <span className="text-white font-black text-4xl drop-shadow-sm">{lead.company?.[0] ?? '?'}</span>
        </div>
        
        {/* Header Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-1">
            <EditableField
              value={lead.company}
              onSave={v => onEdit('company', v)}
              displayClassName="text-[var(--text-primary)] font-bold text-2xl leading-tight block truncate"
              inputClassName="text-[var(--text-primary)] text-2xl font-bold"
              disabled={!isActive}
            />
            {/* CRM Source Badge */}
            {sourceInfo && (
              <div className="flex-shrink-0 flex items-center justify-center px-2.5 py-1 rounded-lg"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)' }}
                title={`Imported from ${sourceInfo.label}`}>
                <span className="font-bold text-[10px] text-[var(--text-secondary)]">
                  {sourceInfo.label.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <EditableField
            value={lead.name}
            onSave={v => onEdit('name', v)}
            displayClassName="text-[var(--text-secondary)] font-medium text-lg tracking-tight"
            inputClassName="text-[var(--text-secondary)] font-medium text-lg tracking-tight"
            disabled={!isActive}
            autoEditToken={autoEditNameToken}
          />
          <EditableField
            value={lead.title}
            onSave={v => onEdit('title', v)}
            displayClassName="text-[var(--text-tertiary)] text-sm font-medium mt-0.5"
            inputClassName="text-[var(--text-tertiary)] text-sm font-medium"
            disabled={!isActive}
          />
        </div>
      </div>

      {/* ── Bottom Body: Grid Layout ── */}
      <div className="flex-1 flex flex-row overflow-hidden">
        
        {/* Left Column: Contact & Details */}
        <div className="flex-1 flex flex-col px-8 py-6 gap-5 overflow-y-auto" style={{ borderRight: '1px solid var(--border-subtle)' }}>
          
          <div className="flex items-center justify-between">
            <StatusBadge label={statusLabel} />
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--input-bg)] border border-[var(--border-subtle)]" title="Location placeholder">
                <MapPin className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--input-bg)] border border-[var(--border-subtle)]" title="Timezone placeholder">
                <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              </span>
            </div>
          </div>

          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-3 group/row">
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); if (canCall) onCall?.(); }}
                disabled={!canCall}
                title={canCall ? `Call ${lead.phone}` : 'No phone number available'}
                className={`w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 transition-all ${
                  canCall ? 'bg-[var(--accent-indigo-soft)] hover:opacity-80 text-[var(--accent-indigo)] cursor-pointer' 
                          : 'bg-[var(--input-bg)] text-[var(--text-tertiary)] cursor-not-allowed'
                }`}
              >
                <Phone className="w-4 h-4" />
              </button>
              <span itemProp="telephone" className="flex-1 min-w-0">
                <EditableField
                  value={lead.phone}
                  onSave={v => onEdit('phone', v)}
                  displayClassName="text-[var(--text-primary)] text-[15px] font-medium tracking-wide"
                  inputClassName="text-[var(--text-primary)] text-[15px] font-medium tracking-wide"
                  disabled={!isActive}
                  placeholder="+1 (555) 000-0000"
                />
              </span>
              {lead.callAttempts > 0 && (
                <span className="ml-auto text-[10px] font-bold text-amber-600 dark:text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg flex-shrink-0">
                  {lead.callAttempts} try{lead.callAttempts !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-[var(--input-bg)] flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
              <EditableField
                value={lead.email}
                onSave={v => onEdit('email', v)}
                displayClassName="text-[var(--text-primary)] text-[15px] font-medium flex-1 min-w-0 truncate"
                inputClassName="text-[var(--text-primary)] text-[15px] font-medium"
                disabled={!isActive}
                placeholder="email@example.com"
              />
            </div>
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 items-center mt-auto pt-2">
            {lead.tags.map((tag, idx) => (
              <span
                key={`${tag}-${idx}`}
                className="group/tag flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--input-bg)] border border-[var(--border-subtle)]"
              >
                <span className="text-[var(--text-secondary)] text-[10px] font-semibold tracking-wide uppercase">{tag}</span>
                {isActive && (
                  <button
                    onClick={() => onEdit('tags', lead.tags.filter((_, i) => i !== idx))}
                    className="ml-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-[var(--text-tertiary)] hover:text-rose-500" />
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
                  className="px-2.5 py-1 rounded-lg border border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] text-[10px] font-semibold text-[var(--accent-indigo)] w-24 focus:outline-none uppercase tracking-wide"
                  placeholder="TAG…"
                />
              ) : (
                <button
                  onClick={() => setAddingTag(true)}
                  className="px-2.5 py-1 rounded-lg border border-dashed border-[var(--border-strong)] text-[var(--text-tertiary)] text-[10px] font-semibold tracking-wide uppercase hover:bg-[var(--input-bg)] transition-colors"
                >
                  + Tag
                </button>
              )
            )}
          </div>
        </div>

        {/* Right Column: Notes & History */}
        <div className="w-[300px] flex flex-col bg-[var(--surface-raised)]">
          <div className="px-6 py-5 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.15em]">Notes</span>
              </div>
              {isActive && onViewHistory && (
                <button
                  onClick={onViewHistory}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--input-bg)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--border-subtle)]"
                >
                  <History className="h-3.5 w-3.5" />
                  History
                </button>
              )}
            </div>
            <EditableField
              value={lead.notes}
              onSave={v => onEdit('notes', v)}
              displayClassName="text-[var(--text-secondary)] text-sm leading-relaxed block font-medium"
              inputClassName="text-[var(--text-primary)] text-sm leading-relaxed font-medium"
              multiline
              disabled={!isActive}
              placeholder="Add notes about this lead..."
            />
          </div>
          
          <div className="px-6 py-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
             <div className="flex items-center gap-2">
                <Webhook className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                <EditableField
                  value={lead.source}
                  onSave={v => onEdit('source', v)}
                  displayClassName="text-xs text-[var(--text-secondary)] font-medium"
                  inputClassName="text-xs text-[var(--text-secondary)] font-medium"
                  disabled={!isActive}
                  placeholder="Source"
                />
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                <EditableField
                  value={lead.lastContact}
                  onSave={v => onEdit('lastContact', v)}
                  displayClassName="text-xs text-[var(--text-secondary)] font-medium"
                  inputClassName="text-xs text-[var(--text-secondary)] font-medium"
                  disabled={!isActive}
                  placeholder="Last contact"
                />
              </div>
          </div>
        </div>
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
            className={`absolute inset-0 ${overlay.bg} flex flex-col items-center justify-center z-20 backdrop-blur-md`}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`border-4 ${overlay.border} rounded-3xl px-8 py-5 text-center shadow-2xl`}
              style={{ background: 'rgba(0,0,0,0.1)' }}
            >
              <div className="text-5xl mb-2 drop-shadow-md">{overlay.icon}</div>
              <p className="text-white font-black text-3xl tracking-widest drop-shadow-md">{overlay.label}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
