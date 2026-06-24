'use client';

import { useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  PanelLeftOpen,
  PanelLeftClose,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useApp } from '@/app/providers';

interface LeadSearchPanelProps {
  activityCollapsed: boolean;
  onToggleActivity: () => void;
}

export function LeadSearchPanel({ activityCollapsed, onToggleActivity }: LeadSearchPanelProps) {
  const {
    leads, currentLead, currentIndex,
    showLeadSearch, setShowLeadSearch,
    leadSearchQuery, setLeadSearchQuery, jumpToLeadSearch, leadSearchMatchCount,
    handleCreateLead, creatingLead,
    setShowDeleteConfirm,
  } = useApp();

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd/Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowLeadSearch(true);
      }
      if (e.key === 'Escape' && showLeadSearch) {
        setShowLeadSearch(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowLeadSearch, showLeadSearch]);

  // Focus search input when opened
  useEffect(() => {
    if (showLeadSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showLeadSearch]);

  return (
    <>
      {/* Sidebar Control Strip */}
      <div className="flex flex-col items-center gap-1.5 py-3 px-1.5"
        style={{ borderRight: '1px solid var(--border-subtle)' }}>

        {/* Toggle Activity Sidebar */}
        <button
          onClick={onToggleActivity}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--input-bg)]"
          title={activityCollapsed ? 'Show activity log' : 'Hide activity log'}
        >
          {activityCollapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          )}
        </button>

        <div className="w-5 h-px my-1" style={{ background: 'var(--border-subtle)' }} />

        {/* Add Lead */}
        <button
          onClick={() => void handleCreateLead()}
          disabled={creatingLead}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--input-bg)] disabled:opacity-40"
          title="Add new lead"
        >
          <Plus className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        </button>

        {/* Delete Current Lead */}
        {currentLead && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-rose-500/15"
            title="Delete current lead"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500/60 dark:text-rose-400/40" />
          </button>
        )}
      </div>

      {/* Search Modal (Command Palette style) */}
      <AnimatePresence>
        {showLeadSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowLeadSearch(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{
                background: 'var(--surface-overlay)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--shadow-modal)',
                backdropFilter: 'blur(var(--glass-blur))',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <Search className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={leadSearchQuery}
                  onChange={(e) => setLeadSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      jumpToLeadSearch(e.shiftKey ? -1 : 1);
                    }
                    if (e.key === 'Escape') {
                      setShowLeadSearch(false);
                    }
                  }}
                  placeholder="Search leads by name, company, email…"
                  className="flex-1 bg-transparent text-[var(--text-primary)] text-sm placeholder:text-[var(--text-tertiary)] placeholder:opacity-50 focus:outline-none"
                />
                {leadSearchQuery && (
                  <span className="text-[10px] text-[var(--text-secondary)] tabular-nums flex-shrink-0 font-medium">
                    {leadSearchMatchCount} match{leadSearchMatchCount !== 1 ? 'es' : ''}
                  </span>
                )}
                <kbd className="text-[9px] px-1.5 py-0.5 rounded text-[var(--text-secondary)]"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border-subtle)' }}>
                  ESC
                </kbd>
              </div>

              {/* Search Navigation */}
              {leadSearchQuery && leadSearchMatchCount > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <p className="text-[var(--text-secondary)] text-[10px] opacity-80">
                    Press <kbd className="text-[var(--text-primary)] font-bold mx-0.5">Enter</kbd> to jump to next match,{' '}
                    <kbd className="text-[var(--text-primary)] font-bold mx-0.5">Shift+Enter</kbd> for previous
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => jumpToLeadSearch(-1)}
                      className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--input-bg)]"
                    >
                      <ChevronLeft className="w-3 h-3 text-[var(--text-secondary)]" />
                    </button>
                    <button
                      onClick={() => jumpToLeadSearch(1)}
                      className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--input-bg)]"
                    >
                      <ChevronRight className="w-3 h-3 text-[var(--text-secondary)]" />
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Info */}
              <div className="px-4 py-3">
                <p className="text-[var(--text-tertiary)] text-[10px]">
                  {leads.length} total leads · Currently viewing #{currentIndex + 1}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
