import { Lead } from '../data/leads';
import { LeadImportField, CsvPreviewRow } from '../types/import';
import { DEFAULT_IMPORT_MAPPING } from './constants';

const ACTIVE_LEAD_STORAGE_PREFIX = 'swiprcrm.activeLead.';

export function getActiveLeadStorageKey(userId: string) {
  return `${ACTIVE_LEAD_STORAGE_PREFIX}${userId}`;
}

export function getStoredActiveLeadId(userId: string) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(getActiveLeadStorageKey(userId));
}

export function setStoredActiveLeadId(userId: string, leadId: string | null) {
  if (typeof window === 'undefined') return;
  const storageKey = getActiveLeadStorageKey(userId);
  if (leadId) {
    window.localStorage.setItem(storageKey, leadId);
    return;
  }
  window.localStorage.removeItem(storageKey);
}

export function normalizeCsvHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') { current += '"'; i += 1; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim()); current = '';
    } else { current += char; }
  }
  result.push(current.trim());
  return result.map((value) => value.replace(/^"|"$/g, ''));
}

export function parseCsv(csvText: string) {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) return { headers: [] as string[], rows: [] as CsvPreviewRow[] };
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((acc, header, index) => { acc[header] = values[index] ?? ''; return acc; }, {} as CsvPreviewRow);
  });
  return { headers, rows };
}

export function guessImportMapping(headers: string[]) {
  return headers.reduce((acc, header) => {
    const normalized = normalizeCsvHeader(header);
    acc[header] = DEFAULT_IMPORT_MAPPING[normalized] ?? 'skip';
    return acc;
  }, {} as Record<string, LeadImportField>);
}

export function buildLeadImportPayload(row: CsvPreviewRow, mapping: Record<string, LeadImportField>, userId: string) {
  const payload: Record<string, unknown> = {
    user_id: userId, name: '', title: '', company: '', industry: '', phone: '', email: '',
    score: 0, status: 'new', notes: '', source: 'CSV Import', location: '', timezone: '', tags: [], last_contact: '',
  };
  let firstName = '';
  let lastName = '';
  Object.entries(mapping).forEach(([header, targetField]) => {
    const value = (row[header] ?? '').trim();
    if (!value || targetField === 'skip') return;
    if (targetField === 'score') { payload.score = Number(value) || 0; return; }
    if (targetField === 'tags') { payload.tags = value.split(/[;,|]/).map((tag) => tag.trim()).filter(Boolean); return; }
    if (targetField === 'status') { payload.status = value.toLowerCase(); return; }
    payload[targetField] = value;
  });
  Object.keys(row).forEach((header) => {
    const normalized = normalizeCsvHeader(header);
    const value = (row[header] ?? '').trim();
    if (!value) return;
    if (normalized === 'first_name') firstName = value;
    if (normalized === 'last_name') lastName = value;
  });
  if (!payload.name && (firstName || lastName)) payload.name = `${firstName} ${lastName}`.trim();
  return payload;
}

export function buildBlankLeadPayload(userId: string) {
  return {
    user_id: userId, name: '', title: '', company: '', industry: '', phone: '', email: '',
    score: 0, status: 'new', notes: '', source: 'Manual Entry', location: '', timezone: '', tags: [], last_contact: '',
  };
}

const LEAD_FIELD_COLUMN_MAP: Partial<Record<keyof Lead, string>> = {
  dealSize: 'deal_size', dealSizeNum: 'deal_size_num',
  lastContact: 'last_contact', callAttempts: 'call_attempts', companySize: 'company_size',
};

export function getLeadDatabaseColumn(field: keyof Lead) {
  return LEAD_FIELD_COLUMN_MAP[field] ?? field;
}

export function getStringField(row: Record<string, unknown>, field: string, fallbackField?: string) {
  const value = row[field] ?? (fallbackField ? row[fallbackField] : undefined);
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

export function getNumberField(row: Record<string, unknown>, field: string, fallbackField?: string) {
  const value = row[field] ?? (fallbackField ? row[fallbackField] : undefined);
  return Number(value) || 0;
}

export function getLeadStatus(value: unknown): Lead['status'] {
  if (value === 'new' || value === 'connected' || value === 'voicemail' || value === 'lost' || value === 'qualified') return value;
  return 'new';
}

export function normalizeLeadRow(lead: Record<string, unknown>): Lead {
  return {
    id: getStringField(lead, 'id'),
    name: getStringField(lead, 'name'),
    title: getStringField(lead, 'title'),
    company: getStringField(lead, 'company'),
    industry: getStringField(lead, 'industry'),
    phone: getStringField(lead, 'phone'),
    email: getStringField(lead, 'email'),
    dealSize: getStringField(lead, 'dealSize', 'deal_size'),
    dealSizeNum: getNumberField(lead, 'dealSizeNum', 'deal_size_num'),
    score: getNumberField(lead, 'score'),
    lastContact: getStringField(lead, 'lastContact', 'last_contact'),
    notes: getStringField(lead, 'notes'),
    status: getLeadStatus(lead.status),
    avatar: getStringField(lead, 'avatar'),
    location: getStringField(lead, 'location'),
    source: getStringField(lead, 'source'),
    callAttempts: getNumberField(lead, 'callAttempts', 'call_attempts'),
    timezone: getStringField(lead, 'timezone'),
    tags: Array.isArray(lead.tags) ? lead.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    companySize: getStringField(lead, 'companySize', 'company_size'),
  };
}

export function getNextLeadIndex(nextLeads: Lead[], preferredLeadId: string | null, fallbackIndex: number) {
  if (nextLeads.length === 0) return 0;
  if (preferredLeadId) {
    const preferredIndex = nextLeads.findIndex((lead) => lead.id === preferredLeadId);
    if (preferredIndex >= 0) return preferredIndex;
  }
  return Math.min(Math.max(fallbackIndex, 0), nextLeads.length - 1);
}

export function buildTelHref(phone: string) {
  const trimmedPhone = phone.trim();
  if (!trimmedPhone) return null;
  const hasLeadingPlus = trimmedPhone.startsWith('+');
  const digits = trimmedPhone.replace(/\D/g, '');
  if (!digits) return null;
  return `tel:${hasLeadingPlus ? '+' : ''}${digits}`;
}

export function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
