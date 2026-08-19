'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Phone } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { NotesModal } from '@/app/components/NotesModal';
import { EmailDraftModal } from '@/app/components/EmailDraftModal';
import { useApp, actionMeta, timeAgo } from '@/app/providers';
import type { ActivityFilter } from '@/app/types/activity';
import { CallNoticeToast } from '@/app/components/CallNoticeToast';
import { CallOutcomeModal } from '@/app/components/CallOutcomeModal';



export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const app = useApp();

  const {
    leads,
    showNotesModal, setShowNotesModal,
    showEmailModal, setShowEmailModal,
    detailActivityFilter, setDetailActivityFilter,
    leadActivityItems, refreshLeadActivities,
    callNotice,
    promptLeadCall, promptLeadEmail,
    handleSaveNotes, handleEmailSent,
    showCallOutcomeModal, callOutcomeLead, handleCallOutcome, closeCallOutcomeModal,
  } = app;

  const detailLeadId = decodeURIComponent(id);
  const detailLead = leads.find((lead) => lead.id === detailLeadId) ?? null;

  // Fetch activities from the database when lead or filter changes
  useEffect(() => {
    if (detailLeadId) {
      refreshLeadActivities(detailLeadId, detailActivityFilter);
    }
  }, [detailLeadId, detailActivityFilter, refreshLeadActivities]);

  if (!detailLead) {
    return (
      <div className="new-dashboard h-screen w-screen flex items-center justify-center" style={{ background: 'var(--dash-bg)' }}>
        <div className="text-center">
          <p className="text-[#342044] text-lg font-semibold">Lead not found</p>
          <p className="text-[#9583a5] text-sm mt-2">This lead may have been deleted or is unavailable.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const detailMeta = actionMeta;

  return (
    <div className="new-dashboard h-screen w-screen overflow-hidden flex flex-col text-[#342044]">
      <header className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'rgba(124,58,237,0.16)' }}>
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-xl border border-[#dfd1f4] bg-white/60 px-4 py-2 text-sm font-semibold text-[#6f5b7e] hover:bg-[#f1eafa]"
        >
          Return to Dashboard
        </button>
        <div className="text-right">
          <p className="text-[#342044] text-sm font-semibold">{detailLead.name}</p>
          <p className="text-[#9583a5] text-xs">{detailLead.company}</p>
        </div>
      </header>

      <main className="flex flex-1 min-h-0">
        <section className="flex-1 min-w-0 px-6 py-5">
          <div className="rounded-2xl border p-5 mb-4 bg-white/85" style={{ borderColor: 'rgba(124,58,237,0.16)', boxShadow: '0 18px 45px rgba(74,38,112,0.08)' }}>
            <h2 className="text-[#342044] text-xl font-bold">{detailLead.name}</h2>
            <p className="text-[#6f5b7e] text-sm mt-1">{detailLead.title} · {detailLead.company}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => promptLeadCall(detailLead)} className="rounded-lg bg-[#eee5ff] px-3 py-1.5 text-xs font-semibold text-[#6b21a8]">Call</button>
              <button onClick={() => promptLeadEmail(detailLead)} className="rounded-lg bg-[#eee5ff] px-3 py-1.5 text-xs font-semibold text-[#6b21a8]">Email</button>
              <button onClick={() => setShowNotesModal(true)} className="rounded-lg bg-[#eee5ff] px-3 py-1.5 text-xs font-semibold text-[#6b21a8]">Notes</button>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2">
            {([
              { key: 'all', label: 'All' },
              { key: 'statuses', label: 'Statuses' },
              { key: 'calls', label: 'Calls' },
              { key: 'emails', label: 'Emails' },
            ] as const).map((filter) => (
              <button
                key={filter.key}
                onClick={() => setDetailActivityFilter(filter.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  detailActivityFilter === filter.key ? 'bg-[#7c3aed] text-white' : 'bg-[#eee5ff] text-[#6f5b7e] hover:bg-[#e4d7fa]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="h-[calc(100%-160px)] overflow-y-auto space-y-2 pr-1">
            {leadActivityItems.length === 0 ? (
              <div className="h-full rounded-2xl border flex items-center justify-center text-center px-6 bg-white/70" style={{ borderColor: 'rgba(124,58,237,0.16)' }}>
                <div>
                  <BarChart3 className="w-8 h-8 text-[#c4a9e8] mx-auto mb-3" />
                  <p className="text-[#9583a5] text-sm">No activity yet for this lead.</p>
                </div>
              </div>
            ) : (
              leadActivityItems.map((item) => {
                const meta = detailMeta[item.action];
                const Icon = meta.Icon;
                return (
                  <div key={item.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${meta.bgColor}`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#342044]">{meta.label}</p>
                      <p className="text-xs text-[#6f5b7e]">{item.timestamp.toLocaleString()}</p>
                    </div>
                    <span className="text-[10px] text-[#9583a5]">{timeAgo(item.timestamp)}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <aside className="w-80 border-l p-5 bg-white/30" style={{ borderColor: 'rgba(124,58,237,0.16)' }}>
          <div className="rounded-2xl border p-4 bg-white/75" style={{ borderColor: 'rgba(124,58,237,0.16)' }}>
            <p className="text-xs uppercase tracking-wider text-[#9583a5] mb-2">Lead Summary</p>
            <p className="text-[#342044] font-semibold">{detailLead.name}</p>
            <p className="text-[#6f5b7e] text-sm mt-1">{detailLead.title}</p>
            <p className="text-[#9583a5] text-sm">{detailLead.company}</p>
            <div className="mt-3 space-y-1 text-xs text-[#6f5b7e]">
              <p data-phone-number={detailLead.phone}>Phone: <span itemProp="telephone">{detailLead.phone || 'N/A'}</span></p>
              <p>Email: {detailLead.email || 'N/A'}</p>
              <p>Score: {detailLead.score ?? 0}</p>
            </div>
          </div>
        </aside>
      </main>

      <CallNoticeToast notice={callNotice} />

      {detailLead && (
        <>
          <NotesModal
            lead={detailLead}
            isOpen={showNotesModal}
            onClose={() => setShowNotesModal(false)}
            onSave={handleSaveNotes}
          />
          <EmailDraftModal
            lead={detailLead}
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            onSend={handleEmailSent}
          />
          <CallOutcomeModal
            lead={callOutcomeLead}
            isOpen={showCallOutcomeModal}
            onClose={closeCallOutcomeModal}
            onSave={handleCallOutcome}
          />
        </>
      )}
    </div>
  );
}
