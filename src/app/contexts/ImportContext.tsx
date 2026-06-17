'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { LeadImportField, CsvPreviewRow } from '../types/import';
import { parseCsv, guessImportMapping, buildLeadImportPayload } from '../lib/utils';

interface ImportContextType {
  csvHeaders: string[];
  csvRows: CsvPreviewRow[];
  csvPreviewRows: CsvPreviewRow[];
  columnMapping: Record<string, LeadImportField>;
  setColumnMapping: React.Dispatch<React.SetStateAction<Record<string, LeadImportField>>>;
  importFileName: string;
  importError: string;
  setImportError: (v: string) => void;
  importSuccess: string;
  setImportSuccess: (v: string) => void;
  importing: boolean;
  handleCsvSelected: (file: File | null) => Promise<void>;
  clearCsvSelection: () => void;
  handleImportLeads: () => Promise<void>;
}

const ImportContext = createContext<ImportContextType | null>(null);

export function useImport() {
  const ctx = useContext(ImportContext);
  if (!ctx) throw new Error('useImport must be used within ImportProvider');
  return ctx;
}

export function ImportProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { fetchLeads } = useLeads();

  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CsvPreviewRow[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<CsvPreviewRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, LeadImportField>>({});
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importing, setImporting] = useState(false);

  const handleCsvSelected = useCallback(async (file: File | null) => {
    if (!file) return;
    setImportError(''); setImportSuccess('');
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    if (headers.length === 0 || rows.length === 0) {
      setImportError('CSV must include a header row and at least one data row.');
      setCsvHeaders([]); setCsvRows([]); setCsvPreviewRows([]); setColumnMapping({});
      setImportFileName(file.name); return;
    }
    setImportFileName(file.name); setCsvHeaders(headers); setCsvRows(rows);
    setCsvPreviewRows(rows.slice(0, 8)); setColumnMapping(guessImportMapping(headers));
  }, []);

  const clearCsvSelection = useCallback(() => {
    setCsvHeaders([]); setCsvRows([]); setCsvPreviewRows([]); setColumnMapping({});
    setImportFileName(''); setImportError(''); setImportSuccess('');
    ['csv-upload-input', 'csv-upload-input-empty'].forEach((inputId) => {
      const input = document.getElementById(inputId);
      if (input instanceof HTMLInputElement) input.value = '';
    });
  }, []);

  const handleImportLeads = useCallback(async () => {
    if (!session) { setImportError('You must be logged in to import leads.'); return; }
    if (csvHeaders.length === 0) { setImportError('Upload a CSV file first.'); return; }
    setImportError(''); setImportSuccess(''); setImporting(true);
    try {
      if (csvRows.length === 0) { setImportError('Please choose a CSV file to import.'); setImporting(false); return; }
      const payload = csvRows
        .map((row) => buildLeadImportPayload(row, columnMapping, session.user.id))
        .filter((row) => String(row.name ?? '').trim() || String(row.company ?? '').trim() || String(row.email ?? '').trim());
      if (payload.length === 0) { setImportError('No valid leads were found. Map at least one identifying column such as name, company, or email.'); setImporting(false); return; }
      const { error } = await supabase.from('leads').insert(payload);
      if (error) { setImportError(error.message); setImporting(false); return; }
      setImportSuccess(`Imported ${payload.length} lead${payload.length === 1 ? '' : 's'} successfully.`);
      await fetchLeads();
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Failed to import CSV.'); }
    finally { setImporting(false); }
  }, [columnMapping, csvHeaders.length, csvRows, fetchLeads, session]);

  return (
    <ImportContext.Provider value={{
      csvHeaders, csvRows, csvPreviewRows, columnMapping, setColumnMapping,
      importFileName, importError, setImportError, importSuccess, setImportSuccess, importing,
      handleCsvSelected, clearCsvSelection, handleImportLeads
    }}>
      {children}
    </ImportContext.Provider>
  );
}
