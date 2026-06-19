import { motion } from 'motion/react';
import { Lead } from '../data/leads';

interface LeadQueueProps {
  leads: Lead[];
  currentIndex: number;
  onSelect: (index: number) => void;
  getStatusLabel: (lead: Lead) => string;
}

export function LeadQueue({ leads, currentIndex, onSelect, getStatusLabel }: LeadQueueProps) {
  const start = Math.max(0, currentIndex - 3);
  const visibleLeads = leads.slice(start, Math.min(leads.length, currentIndex + 5));

  return (
    <section className="swipr-panel hidden min-w-[260px] max-w-[300px] flex-1 flex-col overflow-hidden xl:flex">
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--sw-border)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--sw-muted)' }}>
          Queue
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--sw-ivory)' }}>
          {leads.length === 0 ? 'No leads' : `Lead ${Math.min(currentIndex + 1, leads.length)} of ${leads.length}`}
        </p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {visibleLeads.map((lead, index) => {
          const absoluteIndex = start + index;
          const isActive = absoluteIndex === currentIndex;
          const status = getStatusLabel(lead);

          return (
            <motion.button
              key={lead.id}
              type="button"
              onClick={() => onSelect(absoluteIndex)}
              layout
              className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                isActive ? 'shadow-[0_18px_50px_rgba(0,0,0,0.22)]' : 'hover:translate-x-0.5'
              }`}
              style={{
                background: isActive ? 'var(--sw-panel-strong)' : 'rgba(255, 252, 244, 0.035)',
                borderColor: isActive ? 'rgba(214, 182, 118, 0.34)' : 'var(--sw-border)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--sw-ivory)' }}>
                  {lead.name || 'Unnamed lead'}
                </p>
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    borderColor: status === 'None' ? 'var(--sw-border)' : 'rgba(214, 182, 118, 0.42)',
                    color: status === 'None' ? 'var(--sw-muted)' : 'var(--sw-gold)',
                  }}
                >
                  {status}
                </span>
              </div>
              <p className="mt-1 truncate text-xs" style={{ color: 'var(--sw-muted)' }}>
                {lead.title || 'No title'} · {lead.company || 'No company'}
              </p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
