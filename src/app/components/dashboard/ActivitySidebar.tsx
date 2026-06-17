'use client';

import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, Zap } from 'lucide-react';
import { useApp, actionMeta, timeAgo } from '@/app/providers';

export function ActivitySidebar() {
  const { activityLog, isDone, currentLead, openLeadHistory } = useApp();

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col border-l overflow-hidden" style={{ background: '#0e0e17', borderColor: '#1c1c2a' }}>
      <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: '#1c1c2a' }}>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span className="text-white text-sm font-semibold">Activity Log</span>
        </div>
        <span className="text-gray-600 text-xs">{activityLog.length} actions</span>
      </div>
      {!isDone && currentLead && (
        <div className="px-4 py-3 border-b mx-3 mt-3 rounded-xl" style={{ background: '#13131a', border: '1px solid #1f1f2e' }}>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5">Current Lead</p>
          <p className="text-white font-semibold text-sm truncate">{currentLead.name}</p>
          <p className="text-gray-400 text-xs truncate">{currentLead.company}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-indigo-400 text-xs font-semibold">{currentLead.industry}</span>
            <span className="text-gray-500 text-xs">Score: {currentLead.score ?? 0}</span>
          </div>
          <button onClick={() => openLeadHistory(currentLead.id)} className="mt-2 w-full rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2 py-1.5 text-xs font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/20">View History</button>
        </div>
      )}
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
                <motion.button type="button" key={item.id}
                  initial={{ opacity: 0, x: 20, height: 0 }} animate={{ opacity: 1, x: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }} onClick={() => openLeadHistory(item.leadId)}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-transform hover:scale-[1.01] ${meta.bgColor}`}>
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${meta.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{item.leadName}</p>
                    <p className="text-gray-500 text-xs truncate">{item.company}</p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className={`text-[10px] font-semibold ${meta.color}`}>{meta.label}</span>
                    <span className="text-gray-600 text-[10px]">{timeAgo(item.timestamp)}</span>
                  </div>
                </motion.button>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
