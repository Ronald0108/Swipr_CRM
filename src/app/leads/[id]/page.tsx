'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Phone } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { NotesModal } from '@/app/components/NotesModal';
import { EmailDraftModal } from '@/app/components/EmailDraftModal';
import { useApp, actionMeta, timeAgo } from '@/app/providers';
import type { ActivityFilter } from '@/app/types/activity';

function CallNoticeToast({ notice }: { notice: { kind: 'success' | 'error'; message: string } | null }) {
  if (!notice) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed right-5 top-5 z-[70] rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl ${
        notice.kind === 'success'
          ? 'border-blue-400/30 bg-blue-500/20 text-blue-100'
          : 'border-rose-400/30 bg-rose-500/20 text-rose-100'
      }`}
      style={{ backdropFilter: 'blur(16px)' }}
    >
      {notice.message}
    </div>
  );
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const app = useApp();

  const {
    leads,
    showNotesModal, setShowNotesModal,
    showEmailModal, setShowEmailModal,
    detailActivityFilter, setDetailActivityFilter,
    leadActivityItems,
    callNotice,
    promptLeadCall, promptLeadEmail,
    handleSaveNotes, handleEmailSent,
  } = app;

  const detailLeadId = decodeURIComponent(id);
  const detailLead = leads.find((lead) => lead.id === detailLeadId) ?? null;

  if (!detailLead) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <p className="text-white text-lg font-semibold">Lead not found</p>
          <p className="text-gray-500 text-sm mt-2">This lead may have been deleted or is unavailable.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Return to Scroll Page
          </button>
        </div>
      </div>
    );
  }

  const detailMeta = actionMeta;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ background: '#0a0a0f' }}>
      <header className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#1c1c2a' }}>
        <button
          onClick={() => router.push('/')}
          className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/5"
        >
          Return to Scroll Page
        </button>
        <div className="text-right">
          <p className="text-white text-sm font-semibold">{detailLead.name}</p>
          <p className="text-gray-500 text-xs">{detailLead.company}</p>
        </div>
      </header>

      <main className="flex flex-1 min-h-0">
        <section className="flex-1 min-w-0 px-6 py-5">
          <div className="rounded-2xl border p-5 mb-4" style={{ background: '#13131a', borderColor: '#1f1f2e' }}>
            <h2 className="text-white text-xl font-bold">{detailLead.name}</h2>
            <p className="text-gray-400 text-sm mt-1">{detailLead.title} · {detailLead.company}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => promptLeadCall(detailLead)} className="rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-300">Call</button>
              <button onClick={() => promptLeadEmail(detailLead)} className="rounded-lg bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-300">Email</button>
              <button onClick={() => setShowNotesModal(true)} className="rounded-lg bg-yellow-500/20 px-3 py-1.5 text-xs font-semibold text-yellow-300">Notes</button>
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
                  detailActivityFilter === filter.key ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="h-[calc(100%-160px)] overflow-y-auto space-y-2 pr-1">
            {leadActivityItems.length === 0 ? (
              <div className="h-full rounded-2xl border flex items-center justify-center text-center px-6" style={{ borderColor: '#1f1f2e', background: '#101018' }}>
                <div>
                  <BarChart3 className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No activity yet for this lead.</p>
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
                      <p className="text-sm font-semibold text-white">{meta.label}</p>
                      <p className="text-xs text-gray-400">{item.timestamp.toLocaleString()}</p>
                    </div>
                    <span className="text-[10px] text-gray-500">{timeAgo(item.timestamp)}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <aside className="w-80 border-l p-5" style={{ borderColor: '#1c1c2a', background: '#0e0e17' }}>
          <div className="rounded-2xl border p-4" style={{ borderColor: '#1f1f2e', background: '#13131a' }}>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Lead Summary</p>
            <p className="text-white font-semibold">{detailLead.name}</p>
            <p className="text-gray-400 text-sm mt-1">{detailLead.title}</p>
            <p className="text-gray-500 text-sm">{detailLead.company}</p>
            <div className="mt-3 space-y-1 text-xs text-gray-400">
              <p>Phone: {detailLead.phone || 'N/A'}</p>
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
        </>
      )}
    </div>
  );
}
