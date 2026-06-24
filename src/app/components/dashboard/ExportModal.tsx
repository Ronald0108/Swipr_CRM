'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from '@/app/providers';
import { exportLeads, ExportFormat, EXPORT_FORMAT_INFO, EXPORTABLE_FIELDS } from '@/app/lib/export-engine';
import type { Lead } from '@/app/data/leads';

export function ExportModal() {
  const { leads } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedFields, setSelectedFields] = useState<Set<keyof Lead>>(
    new Set(EXPORTABLE_FIELDS.map(f => f.key))
  );
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  // Listen for custom event to open export modal
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('openExportModal', handler);
    return () => window.removeEventListener('openExportModal', handler);
  }, []);

  const toggleField = useCallback((field: keyof Lead) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (leads.length === 0 || selectedFields.size === 0) return;
    setExporting(true);
    setExportDone(false);
    try {
      await exportLeads(leads, format, { fields: Array.from(selectedFields) });
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  }, [leads, format, selectedFields]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-lg rounded-3xl overflow-hidden"
            style={{
              background: 'var(--surface-overlay)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-modal)',
              backdropFilter: 'blur(var(--glass-blur))',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <Download className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] text-lg font-semibold tracking-tight">Export Leads</h3>
                  <p className="text-[var(--text-secondary)] text-xs">{leads.length} lead{leads.length !== 1 ? 's' : ''} available to export.</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--input-bg)]">
                <X className="w-4 h-4 text-[var(--text-tertiary)]" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Format Selection */}
              <div>
                <p className="text-[var(--text-tertiary)] text-[9px] uppercase tracking-[0.15em] font-semibold mb-2.5">Format</p>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(EXPORT_FORMAT_INFO) as [ExportFormat, typeof EXPORT_FORMAT_INFO[ExportFormat]][]).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setFormat(key)}
                      className="btn-premium rounded-xl p-3 text-center border transition-all"
                      style={{
                        background: format === key 
                          ? `${info.icon === '📗' ? 'rgba(16,185,129,0.12)' : 'var(--accent-indigo-soft)'}` 
                          : 'var(--input-bg)',
                        borderColor: format === key 
                          ? `${info.icon === '📗' ? 'rgba(16,185,129,0.3)' : 'var(--accent-indigo)'}` 
                          : 'var(--border-subtle)',
                      }}
                    >
                      <span className="text-lg block mb-1">{info.icon}</span>
                      <span className="text-[11px] font-bold text-[var(--text-primary)] block">{info.label}</span>
                      <span className="text-[9px] text-[var(--text-tertiary)] block mt-0.5">{info.extension}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[var(--text-secondary)] opacity-70 text-[10px] mt-2">
                  {EXPORT_FORMAT_INFO[format].description}
                </p>
              </div>

              {/* Field Selection */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[var(--text-tertiary)] text-[9px] uppercase tracking-[0.15em] font-semibold">Columns</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedFields(new Set(EXPORTABLE_FIELDS.map(f => f.key)))}
                      className="text-[10px] text-[var(--accent-indigo)] hover:opacity-80 transition-colors font-medium"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedFields(new Set())}
                      className="text-[10px] text-[var(--text-secondary)] opacity-60 hover:opacity-100 transition-colors font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {EXPORTABLE_FIELDS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => toggleField(key)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left border transition-colors"
                      style={{
                        background: selectedFields.has(key) ? 'var(--accent-indigo-soft)' : 'transparent',
                        borderColor: selectedFields.has(key) ? 'var(--accent-indigo)/30' : 'var(--border-subtle)',
                      }}
                    >
                      <div className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border"
                        style={{
                          background: selectedFields.has(key) ? 'var(--accent-indigo)' : 'var(--input-bg)',
                          borderColor: selectedFields.has(key) ? 'var(--accent-indigo)' : 'var(--border-subtle)',
                        }}>
                        {selectedFields.has(key) && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-[11px] font-medium ${selectedFields.has(key) ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-50'}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-[var(--text-tertiary)] text-[10px]">
                  {selectedFields.size} of {EXPORTABLE_FIELDS.length} columns selected
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--input-bg)] transition-colors">
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => void handleExport()}
                    disabled={exporting || leads.length === 0 || selectedFields.size === 0}
                    className="btn-premium px-5 py-2.5 rounded-xl text-xs font-semibold text-white/90 disabled:opacity-40 flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #F59E0B, #F97316)', border: '1px solid rgba(245,158,11,0.3)' }}
                  >
                    {exporting ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Exporting…</>
                    ) : exportDone ? (
                      <><CheckCircle2 className="w-3 h-3" /> Downloaded!</>
                    ) : (
                      <><Download className="w-3 h-3" /> Export {EXPORT_FORMAT_INFO[format].label}</>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
