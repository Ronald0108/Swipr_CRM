import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, CheckCircle, SkipForward, Voicemail, XCircle, Zap } from 'lucide-react';
import type { ComponentType } from 'react';
import { Lead } from '../data/leads';
import { ActivityType } from '../types/activity';

interface ActivityItem {
  id: string;
  leadId: string;
  action: ActivityType;
  leadName: string;
  company: string;
  timestamp: Date;
}

interface ActionDisplay {
  label: string;
  color: string;
  bgColor: string;
  Icon: ComponentType<{ className?: string }>;
}

interface ActivityRailProps {
  collapsed: boolean;
  activityLog: ActivityItem[];
  currentLead: Lead | null;
  isDone: boolean;
  statsCount: { connected: number; lost: number; voicemail: number; next: number };
  actionMeta: Record<ActivityType, ActionDisplay>;
  timeAgo: (date: Date) => string;
  onOpenLeadHistory: (leadId: string) => void;
}

export function ActivityRail({
  collapsed,
  activityLog,
  currentLead,
  isDone,
  statsCount,
  actionMeta,
  timeAgo,
  onOpenLeadHistory,
}: ActivityRailProps) {
  return (
    <motion.aside
      className="order-1 flex-shrink-0 overflow-hidden border-r"
      initial={false}
      animate={{ width: collapsed ? 0 : 304 }}
      transition={{ type: 'spring', stiffness: 250, damping: 30 }}
      style={{ background: 'var(--sw-rail)', borderColor: 'var(--sw-border)' }}
      aria-hidden={collapsed}
    >
      <div className="flex h-full w-[304px] flex-col">
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--sw-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--sw-muted)' }}>
                Timeline
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--sw-ivory)' }}>
                Recent activity
              </p>
            </div>
            <span className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: 'var(--sw-border)', color: 'var(--sw-muted)' }}>
              {activityLog.length}
            </span>
          </div>
        </div>

        {!isDone && currentLead ? (
          <div className="m-3 rounded-3xl border p-4" style={{ background: 'var(--sw-panel)', borderColor: 'var(--sw-border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--sw-muted)' }}>
              In focus
            </p>
            <p className="mt-2 truncate text-sm font-semibold" style={{ color: 'var(--sw-ivory)' }}>
              {currentLead.name}
            </p>
            <p className="truncate text-xs" style={{ color: 'var(--sw-muted)' }}>
              {currentLead.company}
            </p>
            <button
              type="button"
              onClick={() => onOpenLeadHistory(currentLead.id)}
              className="mt-3 w-full rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/5"
              style={{ borderColor: 'rgba(214, 182, 118, 0.32)', color: 'var(--sw-gold)' }}
            >
              View history
            </button>
          </div>
        ) : null}

        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
          <AnimatePresence initial={false}>
            {activityLog.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <Zap className="mb-3 h-8 w-8" style={{ color: 'var(--sw-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--sw-ivory)' }}>No activity yet</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--sw-muted)' }}>Actions will appear as a quiet timeline.</p>
              </div>
            ) : (
              activityLog.map((item) => {
                const meta = actionMeta[item.action];
                const Icon = meta.Icon;
                return (
                  <motion.button
                    type="button"
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => onOpenLeadHistory(item.leadId)}
                    className="w-full rounded-2xl border px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:bg-white/5"
                    style={{ background: 'rgba(255, 252, 244, 0.035)', borderColor: 'var(--sw-border)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${meta.bgColor}`}>
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold" style={{ color: 'var(--sw-ivory)' }}>{item.leadName}</p>
                        <p className="truncate text-[11px]" style={{ color: 'var(--sw-muted)' }}>{item.company}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[10px] font-semibold ${meta.color}`}>{meta.label}</p>
                        <p className="text-[10px]" style={{ color: 'var(--sw-muted)' }}>{timeAgo(item.timestamp)}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </AnimatePresence>
        </div>

        <div className="border-t p-3" style={{ borderColor: 'var(--sw-border)' }}>
          <div className="grid grid-cols-2 gap-2">
            {([
              { icon: CheckCircle, count: statsCount.connected, color: 'text-emerald-300', label: 'Connected' },
              { icon: XCircle, count: statsCount.lost, color: 'text-rose-300', label: 'Lost' },
              { icon: Voicemail, count: statsCount.voicemail, color: 'text-amber-300', label: 'Voicemail' },
              { icon: SkipForward, count: statsCount.next, color: 'text-sky-300', label: 'Skipped' },
            ] as const).map(({ icon: Icon, count, color, label }) => (
              <div key={label} className="rounded-2xl border px-3 py-2" style={{ background: 'var(--sw-panel)', borderColor: 'var(--sw-border)' }}>
                <div className="flex items-center justify-between">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--sw-ivory)' }}>{count}</span>
                </div>
                <p className="mt-1 truncate text-[10px]" style={{ color: 'var(--sw-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
