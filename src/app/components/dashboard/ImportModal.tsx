'use client';

import { AnimatePresence, motion } from 'motion/react';
import { FileSpreadsheet, X, Upload } from 'lucide-react';
import { useApp, IMPORTABLE_FIELDS, LeadImportField } from '@/app/providers';

export function ImportModal() {
  const {
    showImportModal, setShowImportModal,
    csvHeaders, csvRows, csvPreviewRows, columnMapping, setColumnMapping,
    importFileName, importError, importSuccess, importing,
    handleCsvSelected, clearCsvSelection, handleImportLeads,
  } = useApp();

  return (
    <AnimatePresence>
      {showImportModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowImportModal(false); }}>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }} className="w-full max-w-5xl rounded-3xl border overflow-hidden" style={{ background: '#11111a', borderColor: '#1f1f2e' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1f1f2e' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-indigo-300" /></div>
                <div><h3 className="text-white text-lg font-semibold">Import Leads from CSV</h3><p className="text-gray-400 text-sm">Upload a CSV, preview the rows, and choose which columns to import.</p></div>
              </div>
              <button onClick={() => setShowImportModal(false)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] min-h-[560px]">
              <div className="border-r p-5 space-y-4" style={{ borderColor: '#1f1f2e', background: '#0d0d14' }}>
                <label htmlFor="csv-upload-input" className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-8 cursor-pointer text-center transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/5" style={{ borderColor: '#2a2a3a' }}>
                  <Upload className="w-8 h-8 text-indigo-300" />
                  <div><p className="text-white font-medium">Choose CSV file</p><p className="text-gray-500 text-sm mt-1">Click to upload lead data from your computer</p></div>
                  <input id="csv-upload-input" type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void handleCsvSelected(e.target.files?.[0] ?? null)} />
                </label>
                <div className="rounded-2xl border px-4 py-3" style={{ background: '#13131a', borderColor: '#1f1f2e' }}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-gray-500 text-xs uppercase tracking-wider">Selected file</p>
                    {importFileName ? (<button type="button" onClick={clearCsvSelection} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 transition-colors"><X className="w-3.5 h-3.5" />Remove file</button>) : null}
                  </div>
                  <p className="text-white text-sm font-medium break-all">{importFileName || 'No file chosen yet'}</p>
                  <p className="text-gray-500 text-xs mt-2">{csvHeaders.length > 0 ? `${csvHeaders.length} columns detected` : 'Upload a CSV to begin mapping columns.'}</p>
                </div>
                <div className="rounded-2xl border px-4 py-3 space-y-3" style={{ background: '#13131a', borderColor: '#1f1f2e' }}>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Column mapping</p>
                  {csvHeaders.length === 0 ? (<p className="text-gray-500 text-sm">No columns to map yet.</p>) : (
                    csvHeaders.map((header) => (
                      <div key={header} className="space-y-1.5">
                        <label className="block text-xs text-gray-400 truncate">{header}</label>
                        <select value={columnMapping[header] ?? 'skip'}
                          onChange={(e) => { const value = e.target.value as LeadImportField; setColumnMapping((prev) => ({ ...prev, [header]: value })); }}
                          className="w-full rounded-xl border px-3 py-2 text-sm text-white focus:outline-none" style={{ background: '#0d0d14', borderColor: '#2a2a3a' }}>
                          {IMPORTABLE_FIELDS.map((field) => (<option key={field.value} value={field.value}>{field.label}</option>))}
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="p-5 flex flex-col min-w-0">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div><h4 className="text-white font-semibold">Preview</h4><p className="text-gray-500 text-sm">Review the first few rows before importing.</p></div>
                  <div className="text-xs text-gray-500">{csvPreviewRows.length > 0 ? `${csvPreviewRows.length} preview row${csvPreviewRows.length === 1 ? '' : 's'}` : 'No rows loaded'}</div>
                </div>
                {importError ? (<div className="mb-4 rounded-xl border px-4 py-3 text-sm text-rose-300" style={{ background: '#2a1117', borderColor: '#5a1f2b' }}>{importError}</div>) : null}
                {importSuccess ? (<div className="mb-4 rounded-xl border px-4 py-3 text-sm text-emerald-300" style={{ background: '#0f2218', borderColor: '#1d5134' }}>{importSuccess}</div>) : null}
                <div className="flex-1 min-h-0 rounded-2xl border overflow-hidden" style={{ borderColor: '#1f1f2e' }}>
                  {csvHeaders.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center px-6" style={{ background: '#0d0d14' }}>
                      <div><FileSpreadsheet className="w-10 h-10 text-gray-700 mx-auto mb-3" /><p className="text-gray-400 text-sm">Upload a CSV file to preview lead rows here.</p></div>
                    </div>
                  ) : (
                    <div className="overflow-auto h-full" style={{ background: '#0d0d14' }}>
                      <table className="min-w-full text-sm">
                        <thead><tr style={{ background: '#13131a' }}>{csvHeaders.map((header) => (<th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 border-b whitespace-nowrap" style={{ borderColor: '#1f1f2e' }}>{header}</th>))}</tr></thead>
                        <tbody>{csvPreviewRows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b last:border-b-0" style={{ borderColor: '#1f1f2e' }}>
                            {csvHeaders.map((header) => (<td key={`${rowIndex}-${header}`} className="px-4 py-3 text-gray-200 whitespace-nowrap">{row[header] || <span className="text-gray-600">—</span>}</td>))}
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">Mapped columns set to &quot;Do not import&quot; will be ignored.</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/5 transition-colors">Cancel</button>
                    <button onClick={() => void handleImportLeads()} disabled={importing} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60" style={{ background: '#4f46e5' }}>
                      {importing ? 'Importing...' : 'Import Leads'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
