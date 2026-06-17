'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '@/app/providers';

export function LeadSearchPanel() {
  const {
    session, creatingLead, handleCreateLead,
    showLeadSearch, setShowLeadSearch,
    currentLead, setShowDeleteConfirm,
    leadSearchQuery, setLeadSearchQuery, jumpToLeadSearchIndex, jumpToLeadSearch, leadSearchMatchCount
  } = useApp();

  return (
    <div className="relative w-12 flex-shrink-0 border-l flex flex-col items-center gap-2 pt-4" style={{ borderColor: '#1c1c2a', background: '#0a0a0f' }}>
      <button type="button" title="Add new lead" disabled={!session || creatingLead} onClick={() => void handleCreateLead()}
        className="h-9 w-9 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 flex items-center justify-center transition-colors hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-40">
        <Plus className="h-4 w-4" />
      </button>
      <button type="button" title="Search leads" onClick={() => setShowLeadSearch((value) => !value)}
        className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors ${showLeadSearch ? 'border-indigo-400 bg-indigo-500/15 text-indigo-300' : 'border-gray-800 bg-transparent text-gray-500 hover:text-gray-300'}`}>
        <Search className="h-4 w-4" />
      </button>
      <button type="button" title="Delete current lead" disabled={!currentLead} onClick={() => setShowDeleteConfirm(true)}
        className="h-9 w-9 rounded-lg border border-gray-800 bg-transparent text-gray-500 flex items-center justify-center transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30">
        <Trash2 className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {showLeadSearch && (
          <motion.div initial={{ opacity: 0, x: 10, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 10, scale: 0.96 }}
            transition={{ duration: 0.15 }} className="absolute right-12 top-4 z-30 w-72 rounded-xl border p-3 shadow-2xl" style={{ background: '#11111a', borderColor: '#252538' }}>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <input autoFocus value={leadSearchQuery}
                onChange={(event) => { const value = event.target.value; setLeadSearchQuery(value); jumpToLeadSearchIndex(value, -1, 1); }}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); jumpToLeadSearch(event.shiftKey ? -1 : 1); } if (event.key === 'Escape') setShowLeadSearch(false); }}
                placeholder="Search leads" className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">{leadSearchQuery ? `${leadSearchMatchCount} match${leadSearchMatchCount === 1 ? '' : 'es'}` : 'Type to search'}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => jumpToLeadSearch(-1)} className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-white/5">Up</button>
                <button type="button" onClick={() => jumpToLeadSearch(1)} className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-white/5">Down</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
