'use client';

import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { ActivityFilter, ActivityType, LeadActivity } from './types/activity';
import { Lead } from './data/leads';
import {
  fetchLeadActivities,
  fetchRecentActivities,
  insertLeadActivity,
} from './services/activityService';
import type { SwipeAction, OverlayAction } from './components/LeadCard';
import {
  CheckCircle,
  XCircle,
  Voicemail,
  SkipForward,
  Mail,
  Phone,
  FileText,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────
export interface ActivityItem {
  id: string;
  leadId: string;
  action: ActivityType;
  leadName: string;
  company: string;
  timestamp: Date;
}

export interface CsvPreviewRow {
  [key: string]: string;
}

export interface CrmConnection {
  id: string;
  provider: 'hubspot';
  portal_id: string | null;
  account_name: string | null;
  status: 'active' | 'error' | 'disconnected';
  connected_at: string;
  last_synced_at: string | null;
}

export interface CrmSyncRun {
  id: string;
  operation: 'import' | 'export' | 'sync';
  status: 'running' | 'success' | 'error';
  created_count: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  errors: string[];
  started_at: string;
  finished_at: string | null;
}

export interface CrmSyncResult {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export type LeadImportField =
  | 'name'
  | 'title'
  | 'company'
  | 'industry'
  | 'phone'
  | 'email'
  | 'score'
  | 'status'
  | 'notes'
  | 'source'
  | 'location'
  | 'timezone'
  | 'tags'
  | 'last_contact'
  | 'skip';

export type FetchLeadsMode = 'preserve' | 'reset';
export type CallNotice = { kind: 'success' | 'error'; message: string };
export type LeadEditValue = string | string[] | number;

// ── Constants ─────────────────────────────────────────────────────────────
export const CARD_WIDTH    = 420;
export const CARD_HEIGHT   = 390;
export const CARD_STRIDE   = 450;
export const CONTAINER_H   = 630;
export const CENTER_Y      = (CONTAINER_H - CARD_HEIGHT) / 2;

export const actionMeta: Record<ActivityType, {
  label: string;
  color: string;
  bgColor: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {} as any; // Populated below after imports

export const IMPORTABLE_FIELDS: { value: LeadImportField; label: string }[] = [
  { value: 'name', label: 'Full Name' },
  { value: 'title', label: 'Title' },
  { value: 'company', label: 'Company' },
  { value: 'industry', label: 'Industry' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'score', label: 'Score' },
  { value: 'status', label: 'Status' },
  { value: 'notes', label: 'Notes' },
  { value: 'source', label: 'Source' },
  { value: 'location', label: 'Location' },
  { value: 'timezone', label: 'Timezone' },
  { value: 'tags', label: 'Tags' },
  { value: 'last_contact', label: 'Last Contact' },
  { value: 'skip', label: 'Do not import' },
];

const DEFAULT_IMPORT_MAPPING: Record<string, LeadImportField> = {
  name: 'name', fullname: 'name', full_name: 'name',
  first_name: 'skip', lastname: 'skip', last_name: 'skip',
  title: 'title', jobtitle: 'title', job_title: 'title',
  company: 'company', companyname: 'company', company_name: 'company',
  industry: 'industry',
  phone: 'phone', mobile: 'phone', telephone: 'phone',
  email: 'email', score: 'score', status: 'status',
  notes: 'notes', note: 'notes', source: 'source',
  location: 'location', timezone: 'timezone',
  tags: 'tags', tag: 'tags',
  lastcontact: 'last_contact', last_contact: 'last_contact',
};

const ACTIVE_LEAD_STORAGE_PREFIX = 'swiprcrm.activeLead.';

// ── Utility Functions ─────────────────────────────────────────────────────
function getActiveLeadStorageKey(userId: string) {
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

function normalizeCsvHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function splitCsvLine(line: string) {
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

function parseCsv(csvText: string) {
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

function buildBlankLeadPayload(userId: string) {
  return {
    user_id: userId, name: '', title: '', company: '', industry: '', phone: '', email: '',
    score: 0, status: 'new', notes: '', source: 'Manual Entry', location: '', timezone: '', tags: [], last_contact: '',
  };
}

const LEAD_FIELD_COLUMN_MAP: Partial<Record<keyof Lead, string>> = {
  dealSize: 'deal_size', dealSizeNum: 'deal_size_num',
  lastContact: 'last_contact', callAttempts: 'call_attempts', companySize: 'company_size',
};

function getLeadDatabaseColumn(field: keyof Lead) {
  return LEAD_FIELD_COLUMN_MAP[field] ?? field;
}

function getStringField(row: Record<string, unknown>, field: string, fallbackField?: string) {
  const value = row[field] ?? (fallbackField ? row[fallbackField] : undefined);
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

function getNumberField(row: Record<string, unknown>, field: string, fallbackField?: string) {
  const value = row[field] ?? (fallbackField ? row[fallbackField] : undefined);
  return Number(value) || 0;
}

function getLeadStatus(value: unknown): Lead['status'] {
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

function getNextLeadIndex(nextLeads: Lead[], preferredLeadId: string | null, fallbackIndex: number) {
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

// ── Context ───────────────────────────────────────────────────────────────
interface AppContextType {
  // Auth
  session: Session | null;
  authLoading: boolean;
  authSubmitting: boolean;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  authError: string;
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;

  // Leads
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  leadsLoading: boolean;
  fetchLeads: (mode?: FetchLeadsMode) => Promise<void>;
  currentLead: Lead | null;
  isDone: boolean;

  // Activity
  activityLog: ActivityItem[];
  setActivityLog: React.Dispatch<React.SetStateAction<ActivityItem[]>>;
  leadActivityItems: ActivityItem[];
  setLeadActivityItems: React.Dispatch<React.SetStateAction<ActivityItem[]>>;
  detailActivityFilter: ActivityFilter;
  setDetailActivityFilter: React.Dispatch<React.SetStateAction<ActivityFilter>>;
  addActivity: (action: ActivityType, lead: Lead) => Promise<void>;
  refreshLeadActivities: (leadId: string, filter: ActivityFilter) => Promise<void>;
  getLocalLeadActivityItems: (leadId: string) => ActivityItem[];
  statsCount: { connected: number; lost: number; voicemail: number; next: number };
  setStatsCount: React.Dispatch<React.SetStateAction<{ connected: number; lost: number; voicemail: number; next: number }>>;

  // Modals
  showNotesModal: boolean;
  setShowNotesModal: (v: boolean) => void;
  showEmailModal: boolean;
  setShowEmailModal: (v: boolean) => void;
  showLeadSearch: boolean;
  setShowLeadSearch: (v: boolean | ((prev: boolean) => boolean)) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (v: boolean) => void;
  showImportModal: boolean;
  setShowImportModal: (v: boolean) => void;
  showCrmModal: boolean;
  setShowCrmModal: (v: boolean) => void;

  // Lead edit
  handleLeadEdit: (leadId: string, field: keyof Lead, value: LeadEditValue) => void;
  autoEditLeadId: string | null;
  autoEditLeadToken: number;
  handleCreateLead: () => Promise<void>;
  creatingLead: boolean;
  handleDeleteCurrentLead: () => Promise<void>;
  deletingLead: boolean;

  // Call / Email
  callNotice: CallNotice | null;
  promptLeadCall: (lead: Lead | null) => void;
  promptLeadEmail: (lead: Lead | null) => void;
  showCallNoticeMessage: (notice: CallNotice) => void;
  handleSaveNotes: (notes: string) => void;
  handleEmailSent: () => void;

  // Lead search
  leadSearchQuery: string;
  setLeadSearchQuery: (v: string) => void;
  jumpToLeadSearch: (direction: 1 | -1) => void;
  jumpToLeadSearchIndex: (query: string, startIndex: number, direction?: 1 | -1) => void;
  leadSearchMatchCount: number;

  // Navigation
  navigatePrev: () => void;
  navigateNext: () => void;
  jumpToFirstLead: () => void;
  triggerSwipeAction: (action: SwipeAction) => void;
  overlayInfo: { action: OverlayAction; index: number } | null;
  pressedKey: string | null;
  setPressedKey: (v: string | null) => void;
  isAnimatingRef: React.MutableRefObject<boolean>;
  cardAreaRef: React.RefObject<HTMLDivElement>;
  lastNavTime: React.MutableRefObject<number>;
  currentIndexRef: React.MutableRefObject<number>;
  currentLeadIdRef: React.MutableRefObject<string | null>;

  // CSV Import
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

  // CRM
  crmConnection: CrmConnection | null;
  crmLastRun: CrmSyncRun | null;
  crmLoading: boolean;
  crmAction: 'connect' | 'import' | 'export' | 'sync' | 'disconnect' | null;
  crmError: string;
  setCrmError: (v: string) => void;
  crmResult: CrmSyncResult | null;
  crmBusy: boolean;
  loadCrmStatus: () => Promise<void>;
  startHubSpotOAuth: () => Promise<void>;
  runHubSpotAction: (action: 'import' | 'export' | 'sync' | 'disconnect') => Promise<void>;

  // Helpers
  getLeadStatusLabel: (lead: Lead) => string;
  openLeadHistory: (leadId: string) => void;
}

// Populate actionMeta
(actionMeta as any).connected = { label: 'Connected',  color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', Icon: CheckCircle };
(actionMeta as any).lost      = { label: 'Lost',       color: 'text-rose-400',    bgColor: 'bg-rose-500/15',    Icon: XCircle    };
(actionMeta as any).voicemail = { label: 'Voicemail',  color: 'text-amber-400',   bgColor: 'bg-amber-500/15',   Icon: Voicemail  };
(actionMeta as any).next      = { label: 'Skipped',    color: 'text-sky-400',     bgColor: 'bg-sky-500/15',     Icon: SkipForward};
(actionMeta as any).email     = { label: 'Email sent', color: 'text-purple-400',  bgColor: 'bg-purple-500/15',  Icon: Mail       };
(actionMeta as any).call      = { label: 'Called',     color: 'text-blue-400',    bgColor: 'bg-blue-500/15',    Icon: Phone      };
(actionMeta as any).notes     = { label: 'Notes saved', color: 'text-yellow-300', bgColor: 'bg-yellow-500/15',  Icon: FileText   };

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  // We use next/navigation here
  const { useRouter, usePathname, useSearchParams } = require('next/navigation');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [leads, setLeads]               = useState<Lead[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [overlayInfo, setOverlayInfo]   = useState<{ action: OverlayAction; index: number } | null>(null);
  const [activityLog, setActivityLog]   = useState<ActivityItem[]>([]);
  const [leadActivityItems, setLeadActivityItems] = useState<ActivityItem[]>([]);
  const [detailActivityFilter, setDetailActivityFilter] = useState<ActivityFilter>('all');
  const [showNotesModal, setShowNotesModal]   = useState(false);
  const [showEmailModal, setShowEmailModal]   = useState(false);
  const [showLeadSearch, setShowLeadSearch] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingLead, setDeletingLead] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [autoEditLeadId, setAutoEditLeadId] = useState<string | null>(null);
  const [autoEditLeadToken, setAutoEditLeadToken] = useState(0);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [callNotice, setCallNotice] = useState<CallNotice | null>(null);
  const [pressedKey, setPressedKey]           = useState<string | null>(null);
  const [statsCount, setStatsCount]     = useState({ connected: 0, lost: 0, voicemail: 0, next: 0 });
  const [session, setSession]           = useState<Session | null>(null);
  const [authLoading, setAuthLoading]   = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [authError, setAuthError]       = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCrmModal, setShowCrmModal] = useState(false);
  const [crmConnection, setCrmConnection] = useState<CrmConnection | null>(null);
  const [crmLastRun, setCrmLastRun] = useState<CrmSyncRun | null>(null);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmAction, setCrmAction] = useState<'connect' | 'import' | 'export' | 'sync' | 'disconnect' | null>(null);
  const [crmError, setCrmError] = useState('');
  const [crmResult, setCrmResult] = useState<CrmSyncResult | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CsvPreviewRow[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<CsvPreviewRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, LeadImportField>>({});
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importing, setImporting] = useState(false);
  const currentIndexRef = useRef(0);
  const currentLeadIdRef = useRef<string | null>(null);
  const callNoticeTimeoutRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const lastNavTime    = useRef(0);
  const cardAreaRef    = useRef<HTMLDivElement>(null!);

  const detailLeadId = pathname.startsWith('/leads/') ? decodeURIComponent(pathname.replace('/leads/', '')) : null;
  const isDetailRoute = Boolean(detailLeadId);

  const currentLead = leads[currentIndex] ?? leads[leads.length - 1] ?? null;
  const isDone      = !leadsLoading && leads.length > 0 && currentIndex >= leads.length;
  const statusActions: ActivityType[] = ['connected', 'lost', 'voicemail', 'next'];
  const crmBusy = crmAction !== null || crmLoading;

  // ── Mapped helpers ──
  const mapActivitiesToItems = useCallback((activities: LeadActivity[], availableLeads: Lead[]) => {
    return activities.map((activity) => {
      const lead = availableLeads.find((item) => item.id === activity.leadId);
      return {
        id: activity.id,
        leadId: activity.leadId,
        action: activity.activityType,
        leadName: lead?.name ?? 'Unknown Lead',
        company: lead?.company ?? 'Unknown Company',
        timestamp: new Date(activity.createdAt),
      };
    });
  }, []);

  const getLocalLeadActivityItems = useCallback((leadId: string) => {
    return activityLog.filter((item) => item.leadId === leadId);
  }, [activityLog]);

  // ── Auth ──
  const handleLogin = useCallback(async () => {
    setAuthError('');
    setAuthSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setAuthError(error.message); setAuthSubmitting(false); return; }
    setAuthSubmitting(false);
  }, [email, password]);

  const handleLogout = useCallback(async () => {
    if (session) setStoredActiveLeadId(session.user.id, null);
    await supabase.auth.signOut();
    setLeads([]); setCurrentIndex(0); setActivityLog([]);
    setStatsCount({ connected: 0, lost: 0, voicemail: 0, next: 0 });
  }, [session]);

  // ── Fetch leads ──
  const fetchLeads = useCallback(async (mode: FetchLeadsMode = 'preserve') => {
    if (!session) { setLeads([]); setCurrentIndex(0); setLeadsLoading(false); return; }
    setLeadsLoading(true);
    try {
      const { data, error } = await supabase.from('leads').select('*').eq('user_id', session.user.id);
      if (error) { console.error('Error fetching leads:', error); return; }
      const normalizedLeads = (data || []).map((lead) => normalizeLeadRow(lead));
      const nextLeads = normalizedLeads as Lead[];
      const preferredLeadId = mode === 'reset' ? nextLeads[0]?.id ?? null : currentLeadIdRef.current ?? getStoredActiveLeadId(session.user.id);
      const nextIndex = getNextLeadIndex(nextLeads, preferredLeadId, currentIndexRef.current);
      setLeads(nextLeads);
      setCurrentIndex(nextIndex);
      try {
        const recentActivities = await fetchRecentActivities(session.user.id, 80);
        setActivityLog(mapActivitiesToItems(recentActivities, nextLeads));
      } catch (activityError: any) {
        console.error('Error fetching recent activities:', activityError?.message || activityError);
        console.dir(activityError);
      }
    } finally { setLeadsLoading(false); }
  }, [mapActivitiesToItems, session]);

  // ── CSV handling ──
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

  // ── CRM ──
  const loadCrmStatus = useCallback(async () => {
    if (!session) { setCrmConnection(null); setCrmLastRun(null); return; }
    setCrmLoading(true);
    try {
      const { data: connection, error: connectionError } = await supabase
        .from('crm_connections').select('id, provider, portal_id, account_name, status, connected_at, last_synced_at')
        .eq('user_id', session.user.id).eq('provider', 'hubspot').neq('status', 'disconnected').maybeSingle();
      if (connectionError) throw connectionError;
      setCrmConnection((connection as CrmConnection | null) ?? null);
      const { data: syncRun, error: syncRunError } = await supabase
        .from('crm_sync_runs').select('id, operation, status, created_count, updated_count, skipped_count, failed_count, errors, started_at, finished_at')
        .eq('user_id', session.user.id).eq('provider', 'hubspot').order('started_at', { ascending: false }).limit(1).maybeSingle();
      if (syncRunError) throw syncRunError;
      setCrmLastRun((syncRun as CrmSyncRun | null) ?? null);
    } catch (error) { setCrmError(error instanceof Error ? error.message : 'Failed to load CRM status.'); }
    finally { setCrmLoading(false); }
  }, [session]);

  const startHubSpotOAuth = useCallback(async () => {
    if (!session) return;
    setCrmAction('connect'); setCrmError('');
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-oauth-start', { body: { redirectTo: window.location.origin } });
      if (error) throw error;
      if (!data?.authUrl) throw new Error('HubSpot OAuth URL was not returned.');
      window.location.href = data.authUrl;
    } catch (error) { setCrmError(error instanceof Error ? error.message : 'Failed to connect HubSpot.'); }
    finally { setCrmAction(null); }
  }, [session]);

  const runHubSpotAction = useCallback(async (action: 'import' | 'export' | 'sync' | 'disconnect') => {
    const functionName = { import: 'hubspot-import-contacts', export: 'hubspot-export-contacts', sync: 'hubspot-sync-contacts', disconnect: 'hubspot-disconnect' }[action];
    setCrmAction(action); setCrmError(''); setCrmResult(null);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body: {} });
      if (error) throw error;
      setCrmResult((data?.result as CrmSyncResult | undefined) ?? null);
      await loadCrmStatus();
      if (action !== 'disconnect') { await fetchLeads(); } else { setCrmConnection(null); }
    } catch (error) { setCrmError(error instanceof Error ? error.message : `HubSpot ${action} failed.`); }
    finally { setCrmAction(null); }
  }, [fetchLeads, loadCrmStatus]);

  // ── Activity ──
  const refreshLeadActivities = useCallback(async (leadId: string, filter: ActivityFilter) => {
    if (!session) { setLeadActivityItems(getLocalLeadActivityItems(leadId)); return; }
    try {
      const activities = await fetchLeadActivities(session.user.id, leadId, filter, 200);
      if (activities.length === 0) { setLeadActivityItems(getLocalLeadActivityItems(leadId)); return; }
      setLeadActivityItems(mapActivitiesToItems(activities, leads));
    } catch (error) { console.error('Error fetching lead activities:', error); setLeadActivityItems(getLocalLeadActivityItems(leadId)); }
  }, [getLocalLeadActivityItems, leads, mapActivitiesToItems, session]);

  const addActivity = useCallback(async (action: ActivityType, lead: Lead) => {
    const nextItem: ActivityItem = {
      id: `${Date.now()}-${Math.random()}`, leadId: lead.id, action,
      leadName: lead.name, company: lead.company, timestamp: new Date(),
    };
    setActivityLog((prev) => [nextItem, ...prev].slice(0, 80));
    if (!session) return;
    try {
      await insertLeadActivity(session.user.id, lead.id, action);
      if (detailLeadId === lead.id) await refreshLeadActivities(lead.id, detailActivityFilter);
    } catch (error) { console.error('Error adding activity:', error); }
  }, [detailActivityFilter, detailLeadId, refreshLeadActivities, session]);

  // ── Call/Email ──
  const showCallNoticeMessage = useCallback((notice: CallNotice) => {
    setCallNotice(notice);
    if (callNoticeTimeoutRef.current) window.clearTimeout(callNoticeTimeoutRef.current);
    callNoticeTimeoutRef.current = window.setTimeout(() => { setCallNotice(null); callNoticeTimeoutRef.current = null; }, 2600);
  }, []);

  const promptLeadCall = useCallback((lead: Lead | null) => {
    if (!lead) { showCallNoticeMessage({ kind: 'error', message: 'No lead selected to call.' }); return; }
    const telHref = buildTelHref(lead.phone);
    if (!telHref) { showCallNoticeMessage({ kind: 'error', message: `${lead.name} does not have a phone number.` }); return; }
    const telLink = document.createElement('a');
    telLink.href = telHref; telLink.style.display = 'none'; telLink.setAttribute('aria-hidden', 'true');
    document.body.appendChild(telLink); telLink.click(); telLink.remove();
    showCallNoticeMessage({ kind: 'success', message: `Opening dialer for ${lead.name}.` });
    void addActivity('call', lead);
  }, [addActivity, showCallNoticeMessage]);

  const promptLeadEmail = useCallback((lead: Lead | null) => {
    if (!lead) { showCallNoticeMessage({ kind: 'error', message: 'No lead selected to email.' }); return; }
    if (!lead.email.trim()) { showCallNoticeMessage({ kind: 'error', message: `${lead.name} does not have an email address.` }); return; }
    setShowEmailModal(true);
  }, [showCallNoticeMessage]);

  // ── Lead edit ──
  const persistLeadEdit = useCallback(async (leadId: string, field: keyof Lead, value: LeadEditValue) => {
    if (!session) return;
    if (field === 'id') { console.error('Refusing to edit immutable lead id.'); return; }
    const { error } = await supabase.from('leads').update({ [getLeadDatabaseColumn(field)]: value }).eq('id', leadId).eq('user_id', session.user.id);
    if (error) { console.error('Error saving lead edit:', error); await fetchLeads(); }
  }, [fetchLeads, session]);

  const handleLeadEdit = useCallback((leadId: string, field: keyof Lead, value: LeadEditValue) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, [field]: value } : l));
    void persistLeadEdit(leadId, field, value);
  }, [persistLeadEdit]);

  const handleSaveNotes = useCallback((notes: string) => {
    if (!currentLead) return;
    const capturedLead = currentLead;
    const capturedIndex = currentIndex;
    handleLeadEdit(currentLead.id, 'notes', notes);
    setOverlayInfo({ action: 'notes', index: capturedIndex });
    setTimeout(() => setOverlayInfo(null), 1200);
    void addActivity('notes', capturedLead);
  }, [addActivity, currentIndex, currentLead, handleLeadEdit]);

  const handleEmailSent = useCallback(() => {
    const capturedIndex = currentIndex;
    const capturedLead  = leads[capturedIndex];
    if (!capturedLead) return;
    void addActivity('email', capturedLead);
    setTimeout(() => {
      setOverlayInfo({ action: 'email', index: capturedIndex });
      setTimeout(() => setOverlayInfo(null), 1400);
    }, 1700);
  }, [currentIndex, leads, addActivity]);

  // ── Create / Delete lead ──
  const handleCreateLead = useCallback(async () => {
    if (!session || creatingLead) return;
    setCreatingLead(true);
    try {
      const { data, error } = await supabase.from('leads').insert(buildBlankLeadPayload(session.user.id)).select('*').single();
      if (error) { console.error('Error creating lead:', error); return; }
      const newLead = normalizeLeadRow(data as Record<string, unknown>);
      setLeads((prev) => [...prev, newLead]);
      setCurrentIndex(leads.length);
      currentLeadIdRef.current = newLead.id;
      setStoredActiveLeadId(session.user.id, newLead.id);
      setAutoEditLeadId(newLead.id);
      setAutoEditLeadToken((token) => token + 1);
      setShowLeadSearch(false);
    } finally { setCreatingLead(false); }
  }, [creatingLead, leads.length, session]);

  const handleDeleteCurrentLead = useCallback(async () => {
    if (!session || !currentLead) return;
    const leadToDelete = currentLead;
    setDeletingLead(true);
    try {
      const { error } = await supabase.from('leads').delete().eq('id', leadToDelete.id).eq('user_id', session.user.id);
      if (error) { console.error('Error deleting lead:', error); return; }
      setLeads((prev) => {
        const nextLeads = prev.filter((lead) => lead.id !== leadToDelete.id);
        const nextIdx = Math.min(currentIndex, Math.max(nextLeads.length - 1, 0));
        const nextLead = nextLeads[nextIdx] ?? null;
        currentLeadIdRef.current = nextLead?.id ?? null;
        setCurrentIndex(nextIdx);
        setStoredActiveLeadId(session.user.id, nextLead?.id ?? null);
        return nextLeads;
      });
      setActivityLog((prev) => prev.filter((item) => item.leadId !== leadToDelete.id));
      setLeadActivityItems([]);
      setShowDeleteConfirm(false);
    } finally { setDeletingLead(false); }
  }, [currentIndex, currentLead, session]);

  // ── Navigation ──
  const openLeadHistory = useCallback((leadId: string) => {
    if (!session) return;
    setStoredActiveLeadId(session.user.id, leadId);
    router.push(`/leads/${encodeURIComponent(leadId)}`);
  }, [router, session]);

  const getLeadStatusLabel = useCallback((lead: Lead) => {
    const latestStatus = activityLog.find((item) => item.leadId === lead.id && statusActions.includes(item.action));
    return latestStatus ? actionMeta[latestStatus.action].label : 'None';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityLog]);

  const findLeadSearchIndex = useCallback((query: string, startIndex: number, direction: 1 | -1) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || leads.length === 0) return -1;
    for (let step = 1; step <= leads.length; step += 1) {
      const index = (startIndex + (step * direction) + leads.length) % leads.length;
      const lead = leads[index];
      const haystack = `${lead.name} ${lead.company} ${lead.title} ${lead.email} ${lead.phone}`.toLowerCase();
      if (haystack.includes(normalizedQuery)) return index;
    }
    return -1;
  }, [leads]);

  const jumpToLeadSearch = useCallback((direction: 1 | -1 = 1) => {
    const nextIndex = findLeadSearchIndex(leadSearchQuery, currentIndex, direction);
    if (nextIndex < 0) return;
    setCurrentIndex(nextIndex);
    const lead = leads[nextIndex];
    currentLeadIdRef.current = lead?.id ?? null;
    if (session && lead) setStoredActiveLeadId(session.user.id, lead.id);
  }, [currentIndex, findLeadSearchIndex, leadSearchQuery, leads, session]);

  const jumpToLeadSearchIndex = useCallback((query: string, startIndex: number, direction: 1 | -1 = 1) => {
    const nextIndex = findLeadSearchIndex(query, startIndex, direction);
    if (nextIndex < 0) return;
    setCurrentIndex(nextIndex);
    const lead = leads[nextIndex];
    currentLeadIdRef.current = lead?.id ?? null;
    if (session && lead) setStoredActiveLeadId(session.user.id, lead.id);
  }, [findLeadSearchIndex, leads, session]);

  const triggerSwipeAction = useCallback((action: SwipeAction) => {
    if (isAnimatingRef.current || isDone) return;
    isAnimatingRef.current = true;
    setOverlayInfo({ action, index: currentIndex });
    setStatsCount(prev => ({ ...prev, [action]: (prev[action as keyof typeof prev] ?? 0) + 1 }));
    void addActivity(action, leads[currentIndex]);
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => { setOverlayInfo(null); isAnimatingRef.current = false; }, 480);
    }, 300);
  }, [isDone, currentIndex, leads, addActivity]);

  const jumpToFirstLead = useCallback(() => {
    if (leads.length === 0 || isAnimatingRef.current) return;
    setCurrentIndex(0);
    currentLeadIdRef.current = leads[0]?.id ?? null;
    if (session && leads[0]) setStoredActiveLeadId(session.user.id, leads[0].id);
  }, [leads, session]);

  const navigatePrev = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTime.current < 400) return;
    if (isAnimatingRef.current) return;
    lastNavTime.current = now;
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const navigateNext = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTime.current < 400) return;
    if (isAnimatingRef.current) return;
    if (leads.length === 0) return;
    lastNavTime.current = now;
    setCurrentIndex(prev => Math.min(prev + 1, leads.length - 1));
  }, [leads.length]);

  // ── Effects ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); setAuthLoading(false); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) { fetchLeads(); void loadCrmStatus(); }
    else { setLeads([]); setCurrentIndex(0); setLeadsLoading(false); currentLeadIdRef.current = null; setCrmConnection(null); setCrmLastRun(null); }
  }, [fetchLeads, loadCrmStatus, session]);

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  useEffect(() => { currentLeadIdRef.current = currentLead?.id ?? null; }, [currentLead]);

  useEffect(() => {
    if (!session) return;
    setStoredActiveLeadId(session.user.id, currentLead?.id ?? null);
  }, [currentLead?.id, session]);

  useEffect(() => {
    if (leads.length === 0) { if (currentIndex !== 0) setCurrentIndex(0); return; }
    const boundedIndex = Math.min(Math.max(currentIndex, 0), leads.length);
    if (boundedIndex !== currentIndex) setCurrentIndex(boundedIndex);
  }, [currentIndex, leads.length]);

  useEffect(() => {
    if (!detailLeadId) return;
    const detailIndex = leads.findIndex((lead) => lead.id === detailLeadId);
    if (detailIndex >= 0) {
      setCurrentIndex(detailIndex);
      currentLeadIdRef.current = detailLeadId;
      if (session) setStoredActiveLeadId(session.user.id, detailLeadId);
    }
  }, [detailLeadId, leads, session]);

  useEffect(() => {
    if (!session) { setActivityLog([]); setLeadActivityItems([]); }
  }, [session]);

  useEffect(() => {
    if (!detailLeadId) { setLeadActivityItems([]); return; }
    if (!session) return;
    void refreshLeadActivities(detailLeadId, detailActivityFilter);
  }, [detailActivityFilter, detailLeadId, refreshLeadActivities, session]);

  useEffect(() => {
    if (!detailLeadId) return;
    if (leadActivityItems.length > 0) return;
    setLeadActivityItems(getLocalLeadActivityItems(detailLeadId));
  }, [detailLeadId, getLocalLeadActivityItems, leadActivityItems.length]);

  // HubSpot callback
  useEffect(() => {
    const hubspotStatus = searchParams.get('hubspot');
    if (!hubspotStatus) return;
    if (hubspotStatus === 'connected') { showCallNoticeMessage({ kind: 'success', message: 'HubSpot connected.' }); void loadCrmStatus(); }
    else if (hubspotStatus === 'error') { showCallNoticeMessage({ kind: 'error', message: searchParams.get('message') ?? 'HubSpot connection failed.' }); }
    router.replace(pathname);
  }, [loadCrmStatus, pathname, searchParams, router, showCallNoticeMessage]);

  useEffect(() => {
    return () => { if (callNoticeTimeoutRef.current) window.clearTimeout(callNoticeTimeoutRef.current); };
  }, []);

  // Computed
  const normalizedLeadSearchQuery = leadSearchQuery.trim().toLowerCase();
  const leadSearchMatchCount = normalizedLeadSearchQuery
    ? leads.filter((lead) => `${lead.name} ${lead.company} ${lead.title} ${lead.email} ${lead.phone}`.toLowerCase().includes(normalizedLeadSearchQuery)).length
    : 0;

  const value: AppContextType = {
    session, authLoading, authSubmitting, email, setEmail, password, setPassword, authError,
    handleLogin, handleLogout,
    leads, setLeads, currentIndex, setCurrentIndex, leadsLoading, fetchLeads, currentLead, isDone,
    activityLog, setActivityLog, leadActivityItems, setLeadActivityItems,
    detailActivityFilter, setDetailActivityFilter,
    addActivity, refreshLeadActivities, getLocalLeadActivityItems,
    statsCount, setStatsCount,
    showNotesModal, setShowNotesModal, showEmailModal, setShowEmailModal,
    showLeadSearch, setShowLeadSearch, showDeleteConfirm, setShowDeleteConfirm,
    showImportModal, setShowImportModal, showCrmModal, setShowCrmModal,
    handleLeadEdit, autoEditLeadId, autoEditLeadToken,
    handleCreateLead, creatingLead, handleDeleteCurrentLead, deletingLead,
    callNotice, promptLeadCall, promptLeadEmail, showCallNoticeMessage,
    handleSaveNotes, handleEmailSent,
    leadSearchQuery, setLeadSearchQuery, jumpToLeadSearch, jumpToLeadSearchIndex, leadSearchMatchCount,
    navigatePrev, navigateNext, jumpToFirstLead, triggerSwipeAction,
    overlayInfo, pressedKey, setPressedKey,
    isAnimatingRef, cardAreaRef, lastNavTime, currentIndexRef, currentLeadIdRef,
    csvHeaders, csvRows, csvPreviewRows, columnMapping, setColumnMapping,
    importFileName, importError, setImportError, importSuccess, setImportSuccess, importing,
    handleCsvSelected, clearCsvSelection, handleImportLeads,
    crmConnection, crmLastRun, crmLoading, crmAction, crmError, setCrmError, crmResult, crmBusy,
    loadCrmStatus, startHubSpotOAuth, runHubSpotAction,
    getLeadStatusLabel, openLeadHistory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
