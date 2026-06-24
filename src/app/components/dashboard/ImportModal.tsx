'use client';

import { useState, useCallback, DragEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FileSpreadsheet, X, Upload, AlertCircle, CheckCircle2, Loader2, FileJson, FileText, FileSpreadsheet as FileExcel, Contact, FileCode } from 'lucide-react';
import { useApp, IMPORTABLE_FIELDS, LeadImportField } from '@/app/providers';
import { FILE_FORMAT_INFO, type FileFormat } from '@/app/lib/file-parsers';

/** Format badge with color */
function FormatBadge({ format }: { format: FileFormat }) {
  const info = FILE_FORMAT_INFO[format];
  return (
    <span className="format-badge" style={{ background: `${info.color}15`, color: info.color, border: `1px solid ${info.color}25` }}>
      <span>{info.icon}</span>
      <span>{info.label}</span>
    </span>
  );
}

/** Format icon */
function FormatIcon({ format, className = '' }: { format: FileFormat | null; className?: string }) {
  if (!format) return <Upload className={className} />;
  switch (format) {
    case 'json': return <FileJson className={className} />;
    case 'excel': return <FileExcel className={className} />;
    case 'vcard': return <Contact className={className} />;
    case 'xml': return <FileCode className={className} />;
    default: return <FileSpreadsheet className={className} />;
  }
}

export function ImportModal() {
  const {
    showImportModal, setShowImportModal,
    csvHeaders, csvRows, csvPreviewRows, columnMapping, setColumnMapping,
    importFileName, importError, importSuccess, importing, importProgress,
    fileFormat, parseWarnings,
    handleFileSelected, clearCsvSelection, handleImportLeads,
  } = useApp();

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragOut = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) void handleFileSelected(file);
  }, [handleFileSelected]);

  return (
    <AnimatePresence>
      {showImportModal && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowImportModal(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-5xl rounded-3xl overflow-hidden"
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
                  style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <FormatIcon format={fileFormat} className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[var(--text-primary)] text-lg font-semibold tracking-tight">Import Leads</h3>
                    {fileFormat && <FormatBadge format={fileFormat} />}
                  </div>
                  <p className="text-[var(--text-secondary)] text-xs">
                    Drop any file — CSV, JSON, Excel, vCard, or XML.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--input-bg)]">
                <X className="w-4 h-4 text-[var(--text-tertiary)]" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] min-h-[560px]">
              {/* Left Panel: Upload + Mapping */}
              <div className="p-5 space-y-4" style={{ borderRight: '1px solid var(--border-subtle)', background: 'var(--input-bg)' }}>

                {/* Drag & Drop Zone */}
                <label
                  htmlFor="file-upload-input"
                  className={`drop-zone flex flex-col items-center justify-center gap-3 px-4 py-8 cursor-pointer text-center ${isDragOver ? 'drop-active' : ''}`}
                  onDragEnter={handleDragIn}
                  onDragLeave={handleDragOut}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <motion.div
                    animate={{ scale: isDragOver ? 1.1 : 1, rotate: isDragOver ? 5 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(99, 102, 241, 0.12)' }}
                  >
                    <Upload className="w-5 h-5 text-indigo-400" />
                  </motion.div>
                  <div>
                    <p className="text-[var(--text-primary)] font-medium text-sm">
                      {isDragOver ? 'Drop file here' : 'Choose or drop a file'}
                    </p>
                    <p className="text-[var(--text-tertiary)] text-[10px] mt-1">
                      CSV · JSON · Excel · vCard · XML
                    </p>
                  </div>
                  <input
                    id="file-upload-input"
                    type="file"
                    accept=".csv,.tsv,.json,.ndjson,.jsonl,.xlsx,.xls,.vcf,.vcard,.xml"
                    className="hidden"
                    onChange={(e) => void handleFileSelected(e.target.files?.[0] ?? null)}
                  />
                </label>

                {/* File Info */}
                <div className="rounded-2xl px-4 py-3"
                  style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-[var(--text-tertiary)] text-[9px] uppercase tracking-[0.15em] font-semibold">File</p>
                    {importFileName && (
                      <button type="button" onClick={clearCsvSelection}
                        className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400/70 hover:bg-rose-500/15 transition-colors">
                        <X className="w-2.5 h-2.5" /> Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[var(--text-primary)] text-xs font-semibold break-all">{importFileName || 'No file chosen'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-[var(--text-tertiary)] text-[10px]">
                      {csvHeaders.length > 0 ? `${csvHeaders.length} columns · ${csvRows.length} rows` : 'Upload a file to begin'}
                    </p>
                  </div>
                </div>

                {/* Parse Warnings */}
                {parseWarnings.length > 0 && (
                  <div className="rounded-xl px-3 py-2 space-y-1"
                    style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                    {parseWarnings.map((warning, i) => (
                      <p key={i} className="text-amber-400/70 text-[10px] flex items-start gap-1.5">
                        <AlertCircle className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" />
                        {warning}
                      </p>
                    ))}
                  </div>
                )}

                {/* Column Mapping */}
                <div className="rounded-2xl px-4 py-3 space-y-2.5"
                  style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-[var(--text-tertiary)] text-[9px] uppercase tracking-[0.15em] font-semibold">Column Mapping</p>
                  {csvHeaders.length === 0 ? (
                    <p className="text-[var(--text-secondary)] opacity-50 text-[11px]">No columns to map yet.</p>
                  ) : (
                    <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1">
                      {csvHeaders.map((header) => (
                        <div key={header} className="space-y-1">
                          <label className="block text-[10px] text-[var(--text-secondary)] truncate" title={header}>{header}</label>
                          <select
                            value={columnMapping[header] ?? 'skip'}
                            onChange={(e) => {
                              const value = e.target.value as LeadImportField;
                              setColumnMapping((prev) => ({ ...prev, [header]: value }));
                            }}
                            className="w-full rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] bg-[var(--surface-base)] border border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-indigo)]/50"
                          >
                            {IMPORTABLE_FIELDS.map((field) => (
                              <option key={field.value} value={field.value} className="bg-[var(--surface-overlay)] text-[var(--text-primary)]">{field.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Preview + Actions */}
              <div className="p-5 flex flex-col min-w-0">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h4 className="text-[var(--text-primary)] font-semibold text-sm">Preview</h4>
                    <p className="text-[var(--text-tertiary)] text-[10px] mt-0.5">Review data before importing.</p>
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)] tabular-nums">
                    {csvPreviewRows.length > 0 ? `${csvPreviewRows.length} of ${csvRows.length} rows` : ''}
                  </div>
                </div>

                {/* Status Messages */}
                {importError && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-3 rounded-xl px-4 py-2.5 text-xs flex items-start gap-2"
                    style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span className="text-rose-300/90">{importError}</span>
                  </motion.div>
                )}
                {importSuccess && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-3 rounded-xl px-4 py-2.5 text-xs flex items-start gap-2"
                    style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-emerald-300/90">{importSuccess}</span>
                  </motion.div>
                )}

                {/* Data Table */}
                <div className="flex-1 min-h-0 rounded-2xl overflow-hidden"
                  style={{ border: '1px solid var(--border-subtle)' }}>
                  {csvHeaders.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center px-6"
                      style={{ background: 'var(--input-bg)' }}>
                      <div>
                        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                          style={{ background: 'var(--surface-raised)' }}>
                          <FileSpreadsheet className="w-6 h-6 text-[var(--text-tertiary)] opacity-30" />
                        </div>
                        <p className="text-[var(--text-secondary)] text-xs font-semibold">Upload a file to preview data here.</p>
                        <p className="text-[var(--text-tertiary)] text-[10px] mt-1">Supports CSV, JSON, Excel, vCard, XML</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-auto h-full" style={{ background: 'var(--surface-raised)' }}>
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="bg-[var(--input-bg)]">
                            {csvHeaders.map((header) => {
                              const mapped = columnMapping[header] !== 'skip';
                              return (
                                <th key={header}
                                  className={`px-3 py-2.5 text-left text-[10px] font-bold whitespace-nowrap ${mapped ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-50'}`}
                                  style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                  {header}
                                  {mapped && (
                                    <span className="ml-1 text-[var(--accent-indigo)]">→</span>
                                  )}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreviewRows.map((row, rowIndex) => (
                            <tr key={rowIndex} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              {csvHeaders.map((header) => {
                                const mapped = columnMapping[header] !== 'skip';
                                return (
                                  <td key={`${rowIndex}-${header}`}
                                    className={`px-3 py-2 whitespace-nowrap font-medium ${mapped ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-50'}`}>
                                    {row[header] || <span className="opacity-20">—</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Progress Bar (during import) */}
                {importing && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[var(--text-secondary)] text-[10px]">Importing leads…</span>
                      <span className="text-[var(--text-secondary)] text-[10px] tabular-nums">{importProgress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #6366F1, #A855F7)' }}
                        animate={{ width: `${importProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    Columns set to &quot;Do not import&quot; will be ignored.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--input-bg)] transition-colors"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => void handleImportLeads()}
                      disabled={importing || csvHeaders.length === 0}
                      className="btn-premium px-5 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-40 flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: '1px solid rgba(99,102,241,0.3)' }}
                    >
                      {importing ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Importing…
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" />
                          Import {csvRows.length > 0 ? `${csvRows.length} Leads` : 'Leads'}
                        </>
                      )}
                    </motion.button>
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
