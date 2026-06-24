'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { LeadImportField, CsvPreviewRow } from '../types/import';
import { guessImportMapping, buildLeadImportPayload } from '../lib/utils';
import { parseFile, FileFormat, FILE_FORMAT_INFO } from '../lib/file-parsers';

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
  importProgress: number; // 0-100
  fileFormat: FileFormat | null;
  parseWarnings: string[];
  handleFileSelected: (file: File | null) => Promise<void>;
  handleCsvSelected: (file: File | null) => Promise<void>; // backward compat
  clearCsvSelection: () => void;
  handleImportLeads: () => Promise<void>;
  showImportModal: boolean;
  setShowImportModal: (v: boolean) => void;
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
  const [importProgress, setImportProgress] = useState(0);
  const [fileFormat, setFileFormat] = useState<FileFormat | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleFileSelected = useCallback(async (file: File | null) => {
    if (!file) return;
    setImportError('');
    setImportSuccess('');
    setParseWarnings([]);
    setImportProgress(0);

    try {
      const result = await parseFile(file);

      if (result.warnings.length > 0 && result.headers.length === 0) {
        // Fatal warnings (parse failures)
        setImportError(result.warnings.join(' '));
        setCsvHeaders([]);
        setCsvRows([]);
        setCsvPreviewRows([]);
        setColumnMapping({});
        setFileFormat(null);
        setImportFileName(file.name);
        return;
      }

      if (result.headers.length === 0 || result.rows.length === 0) {
        setImportError('File must contain headers and at least one data row.');
        setCsvHeaders([]);
        setCsvRows([]);
        setCsvPreviewRows([]);
        setColumnMapping({});
        setFileFormat(null);
        setImportFileName(file.name);
        return;
      }

      setImportFileName(file.name);
      setCsvHeaders(result.headers);
      setCsvRows(result.rows);
      setCsvPreviewRows(result.rows.slice(0, 8));
      setColumnMapping(guessImportMapping(result.headers));
      setFileFormat(result.format);
      setParseWarnings(result.warnings);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to parse file.');
      setCsvHeaders([]);
      setCsvRows([]);
      setCsvPreviewRows([]);
      setColumnMapping({});
      setFileFormat(null);
      setImportFileName(file.name);
    }
  }, []);

  // Backward compatibility alias
  const handleCsvSelected = handleFileSelected;

  const clearCsvSelection = useCallback(() => {
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvPreviewRows([]);
    setColumnMapping({});
    setImportFileName('');
    setImportError('');
    setImportSuccess('');
    setFileFormat(null);
    setParseWarnings([]);
    setImportProgress(0);
    // Clear file inputs
    ['csv-upload-input', 'csv-upload-input-empty', 'file-upload-input'].forEach((inputId) => {
      const input = document.getElementById(inputId);
      if (input instanceof HTMLInputElement) input.value = '';
    });
  }, []);

  const handleImportLeads = useCallback(async () => {
    if (!session) { setImportError('You must be logged in to import leads.'); return; }
    if (csvHeaders.length === 0) { setImportError('Upload a file first.'); return; }
    setImportError('');
    setImportSuccess('');
    setImporting(true);
    setImportProgress(0);

    try {
      if (csvRows.length === 0) {
        setImportError('Please choose a file to import.');
        setImporting(false);
        return;
      }

      const payload = csvRows
        .map((row) => buildLeadImportPayload(row, columnMapping, session.user.id))
        .filter((row) => String(row.name ?? '').trim() || String(row.company ?? '').trim() || String(row.email ?? '').trim());

      if (payload.length === 0) {
        setImportError('No valid leads were found. Map at least one identifying column such as name, company, or email.');
        setImporting(false);
        return;
      }

      // Batch insert with progress
      const BATCH_SIZE = 50;
      let imported = 0;

      for (let i = 0; i < payload.length; i += BATCH_SIZE) {
        const batch = payload.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('leads').insert(batch);
        if (error) {
          setImportError(error.message);
          setImporting(false);
          return;
        }
        imported += batch.length;
        setImportProgress(Math.round((imported / payload.length) * 100));
      }

      setImportSuccess(`Imported ${payload.length} lead${payload.length === 1 ? '' : 's'} successfully.`);
      setImportProgress(100);
      await fetchLeads();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import leads.');
    } finally {
      setImporting(false);
    }
  }, [columnMapping, csvHeaders.length, csvRows, fetchLeads, session]);

  return (
    <ImportContext.Provider value={{
      csvHeaders, csvRows, csvPreviewRows, columnMapping, setColumnMapping,
      importFileName, importError, setImportError, importSuccess, setImportSuccess,
      importing, importProgress, fileFormat, parseWarnings,
      handleFileSelected, handleCsvSelected, clearCsvSelection, handleImportLeads,
      showImportModal, setShowImportModal,
    }}>
      {children}
    </ImportContext.Provider>
  );
}
