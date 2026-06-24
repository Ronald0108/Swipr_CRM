'use client';

import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, Zap, Search } from 'lucide-react';
import { useApp, actionMeta, timeAgo } from '@/app/providers';
import type { ActivityItem } from '@/app/contexts/ActivityContext';

interface ActivitySidebarProps {
  collapsed: boolean;
}

/** Group activities by time period */
function groupActivities(items: ActivityItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: typeof items }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This Week', items: [] },
    { label: 'Earlier', items: [] },
  ];

  for (const item of items) {
    const ts = item.timestamp;
    if (ts >= today) groups[0].items.push(item);
    else if (ts >= yesterday) groups[1].items.push(item);
    else if (ts >= weekAgo) groups[2].items.push(item);
    else groups[3].items.push(item);
  }

  return groups.filter(g => g.items.length > 0);
}

export function ActivitySidebar({ collapsed }: ActivitySidebarProps) {
  const {
    activityLog,
    openLeadHistory,
    leadSearchQuery,
    setLeadSearchQuery,
    jumpToLeadSearch,
    leadSearchMatchCount,
  } = useApp();

  const groups = groupActivities(activityLog);

  return (
    <motion.aside
      animate={{ width: collapsed ? 0 : 288 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        background: 'var(--sidebar)',
        backdropFilter: 'blur(var(--glass-blur)) saturate(180%)',
        borderRight: '1px solid var(--border-subtle)',
      }}
      aria-hidden={collapsed}
    >
      <div className="w-72 flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-indigo-soft)' }}>
              <BarChart3 className="w-3.5 h-3.5 text-[var(--accent-indigo)]" />
            </div>
            <span className="text-[var(--text-primary)] text-sm font-semibold">Activity</span>
          </div>
          <span className="text-[var(--text-tertiary)] text-[10px] font-medium tabular-nums">{activityLog.length}</span>
        </div>

        {/* Inline Search Bar */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 pointer-events-none opacity-60" />
            <input
              type="text"
              value={leadSearchQuery}
              onChange={(e) => setLeadSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  jumpToLeadSearch(e.shiftKey ? -1 : 1);
                }
              }}
              placeholder="Search leads..."
              className="w-full bg-[var(--input-bg)] border border-[var(--border-default)] rounded-xl pl-9 pr-8 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-indigo)] transition-all"
            />
            {leadSearchQuery && (
              <button
                type="button"
                onClick={() => setLeadSearchQuery('')}
                className="absolute right-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-[10px] font-bold"
              >
                ✕
              </button>
            )}
          </div>
          {leadSearchQuery && (
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--text-secondary)] px-1">
              <span>{leadSearchMatchCount} match{leadSearchMatchCount !== 1 ? 'es' : ''}</span>
              <span className="opacity-60 text-[9px]">Press Enter to jump</span>
            </div>
          )}
        </div>

        {/* Grouped Activity Timeline */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
          {activityLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'var(--input-bg)' }}>
                <Zap className="w-5 h-5 text-[var(--text-tertiary)] opacity-60" />
              </div>
              <p className="text-[var(--text-secondary)] text-xs font-medium">No activity yet</p>
              <p className="text-[var(--text-tertiary)] text-[10px] mt-1">Actions will appear here</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <p className="text-[var(--text-tertiary)] text-[9px] uppercase tracking-[0.15em] font-semibold px-1 mb-1.5">
                  {group.label}
                </p>
                <div className="space-y-1">
                  <AnimatePresence initial={false}>
                    {group.items.map((item) => {
                      const typedItem = item;
                      const meta = actionMeta[typedItem.action];
                      const Icon = meta.Icon;
                      return (
                        <motion.button
                          type="button"
                          key={typedItem.id}
                          initial={{ opacity: 0, x: -12, height: 0 }}
                          animate={{ opacity: 1, x: 0, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                          onClick={() => openLeadHistory(typedItem.leadId)}
                          className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all hover:bg-[var(--input-bg)]"
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `${meta.color.includes('emerald') ? 'rgba(16,185,129,0.12)' : meta.color.includes('rose') ? 'rgba(244,63,94,0.12)' : meta.color.includes('amber') ? 'rgba(245,158,11,0.12)' : meta.color.includes('sky') ? 'rgba(56,189,248,0.12)' : meta.color.includes('purple') ? 'rgba(168,85,247,0.12)' : meta.color.includes('blue') ? 'rgba(59,130,246,0.12)' : 'rgba(234,179,8,0.12)'}` }}>
                            <Icon className={`w-3 h-3 ${meta.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--text-primary)] text-[11px] font-medium truncate">{typedItem.leadName || 'Unnamed'}</p>
                            <p className="text-[var(--text-tertiary)] text-[10px] truncate">{typedItem.company}</p>
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0">
                            <span className={`text-[9px] font-semibold ${meta.color}`}>{meta.label}</span>
                            <span className="text-[var(--text-tertiary)] text-[9px]">{timeAgo(typedItem.timestamp)}</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.aside>
  );
}
