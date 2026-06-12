import type { Session } from '@supabase/supabase-js';
import {
  Award,
  BarChart3,
  CheckCircle,
  ArrowUpToLine,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  SkipForward,
  Trash2,
  Unplug,
  Upload,
  Users,
  Voicemail,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';
import { EmailDraftModal } from './components/EmailDraftModal';
import { LeadCard, OverlayAction, SwipeAction } from './components/LeadCard';
import { NotesModal } from './components/NotesModal';
import logoImage from './components/logo_transparent.png';
import { Lead } from './data/leads';
import { fetchLeadActivities, fetchRecentActivities, insertLeadActivity } from './services/activityService';
import type { ActivityFilter, ActivityType, LeadActivity } from './types/activity';

// ── Rolodex constants ──────────────────────────────────────────────────────
const CARD_WIDTH    = 420;
const CARD_HEIGHT   = 390;
const CARD_STRIDE   = 450;  // distance between card centres
const CONTAINER_H   = 630;
const CENTER_Y      = (CONTAINER_H - CARD_HEIGHT) / 2; // = 120

// ── Types ─────────────────────────────────────────────────────────────────
interface ActivityItem {
  id: string;
  leadId: string;
  action: ActivityType;
  leadName: string;
  company: string;
  timestamp: Date;
}

interface CsvPreviewRow {
  [key: string]: string;
}

interface CrmConnection {
  id: string;
  provider: 'hubspot';
  portal_id: string | null;
  account_name: string | null;
  status: 'active' | 'error' | 'disconnected';
  connected_at: string;
  last_synced_at: string | null;
}

interface CrmSyncRun {
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

interface CrmSyncResult {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

type LeadImportField =
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

const actionMeta: Record<ActivityType, {
  label: string;
  color: string;
  bgColor: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  connected: { label: 'Connected',  color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', Icon: CheckCircle },
  lost:      { label: 'Lost',       color: 'text-rose-400',    bgColor: 'bg-rose-500/15',    Icon: XCircle    },
  voicemail: { label: 'Voicemail',  color: 'text-amber-400',   bgColor: 'bg-amber-500/15',   Icon: Voicemail  },
  next:      { label: 'Skipped',    color: 'text-sky-400',     bgColor: 'bg-sky-500/15',     Icon: SkipForward},
  email:     { label: 'Email sent', color: 'text-purple-400',  bgColor: 'bg-purple-500/15',  Icon: Mail       },
  call:      { label: 'Called',     color: 'text-blue-400',    bgColor: 'bg-blue-500/15',    Icon: Phone      },
  notes:     { label: 'Notes saved', color: 'text-yellow-300', bgColor: 'bg-yellow-500/15',  Icon: FileText   },
};

type AnyAction = SwipeAction | 'notes' | 'email' | 'call' | 'previous';

const KEY_ACTIONS: Record<string, AnyAction> = {
  q: 'voicemail',
  e: 'notes',
  a: 'lost',
  d: 'connected',
  c: 'call',
  x: 'email',
  r: 'next',
  t: 'previous',
};

const SHORTCUT_KEYS: {
  key: string; label: string; action: AnyAction;
  color: string; bg: string;
}[] = [
  { key: 'Q', label: 'Voicemail', action: 'voicemail', color: 'text-amber-400',   bg: 'border-amber-500/40 bg-amber-500/10'   },
  { key: 'A', label: 'Lost',      action: 'lost',      color: 'text-rose-400',    bg: 'border-rose-500/40 bg-rose-500/10'     },
  { key: 'D', label: 'Connected', action: 'connected', color: 'text-emerald-400', bg: 'border-emerald-500/40 bg-emerald-500/10'},
  { key: 'R', label: 'Next',      action: 'next',      color: 'text-sky-400',     bg: 'border-sky-500/40 bg-sky-500/10'       },
  { key: 'T', label: 'Previous',  action: 'previous',  color: 'text-gray-300',    bg: 'border-gray-500/40 bg-gray-500/10'     },
  { key: 'C', label: 'Call',      action: 'call',      color: 'text-blue-400',    bg: 'border-blue-500/40 bg-blue-500/10'     },
  { key: 'E', label: 'Notes',     action: 'notes',     color: 'text-yellow-300',  bg: 'border-yellow-500/40 bg-yellow-500/10' },
  { key: 'X', label: 'Email',     action: 'email',     color: 'text-purple-400',  bg: 'border-purple-500/40 bg-purple-500/10' },
];

const IMPORTABLE_FIELDS: { value: LeadImportField; label: string }[] = [
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
  name: 'name',
  fullname: 'name',
  full_name: 'name',
  first_name: 'skip',
  lastname: 'skip',
  last_name: 'skip',
  title: 'title',
  jobtitle: 'title',
  job_title: 'title',
  company: 'company',
  companyname: 'company',
  company_name: 'company',
  industry: 'industry',
  phone: 'phone',
  mobile: 'phone',
  telephone: 'phone',
  email: 'email',
  score: 'score',
  status: 'status',
  notes: 'notes',
  note: 'notes',
  source: 'source',
  location: 'location',
  timezone: 'timezone',
  tags: 'tags',
  tag: 'tags',
  lastcontact: 'last_contact',
  last_contact: 'last_contact',
};

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
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map((value) => value.replace(/^"|"$/g, ''));
}

function parseCsv(csvText: string) {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return { headers: [] as string[], rows: [] as CsvPreviewRow[] };
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {} as CsvPreviewRow);
  });

  return { headers, rows };
}

function guessImportMapping(headers: string[]) {
  return headers.reduce((acc, header) => {
    const normalized = normalizeCsvHeader(header);
    acc[header] = DEFAULT_IMPORT_MAPPING[normalized] ?? 'skip';
    return acc;
  }, {} as Record<string, LeadImportField>);
}

function buildLeadImportPayload(
  row: CsvPreviewRow,
  mapping: Record<string, LeadImportField>,
  userId: string,
) {
  const payload: Record<string, unknown> = {
    user_id: userId,
    name: '',
    title: '',
    company: '',
    industry: '',
    phone: '',
    email: '',
    score: 0,
    status: 'new',
    notes: '',
    source: 'CSV Import',
    location: '',
    timezone: '',
    tags: [],
    last_contact: '',
  };

  let firstName = '';
  let lastName = '';

  Object.entries(mapping).forEach(([header, targetField]) => {
    const value = (row[header] ?? '').trim();
    if (!value || targetField === 'skip') return;

    if (targetField === 'score') {
      payload.score = Number(value) || 0;
      return;
    }

    if (targetField === 'tags') {
      payload.tags = value
        .split(/[;,|]/)
        .map((tag) => tag.trim())
        .filter(Boolean);
      return;
    }

    if (targetField === 'status') {
      payload.status = value.toLowerCase();
      return;
    }

    payload[targetField] = value;
  });

  Object.keys(row).forEach((header) => {
    const normalized = normalizeCsvHeader(header);
    const value = (row[header] ?? '').trim();
    if (!value) return;
    if (normalized === 'first_name') firstName = value;
    if (normalized === 'last_name') lastName = value;
  });

  if (!payload.name && (firstName || lastName)) {
    payload.name = `${firstName} ${lastName}`.trim();
  }

  return payload;
}

function buildBlankLeadPayload(userId: string) {
  return {
    user_id: userId,
    name: '',
    title: '',
    company: '',
    industry: '',
    phone: '',
    email: '',
    score: 0,
    status: 'new',
    notes: '',
    source: 'Manual Entry',
    location: '',
    timezone: '',
    tags: [],
    last_contact: '',
  };
}

const ACTIVE_LEAD_STORAGE_PREFIX = 'swiprcrm.activeLead.';

function getActiveLeadStorageKey(userId: string) {
  return `${ACTIVE_LEAD_STORAGE_PREFIX}${userId}`;
}

function getStoredActiveLeadId(userId: string) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(getActiveLeadStorageKey(userId));
}

function setStoredActiveLeadId(userId: string, leadId: string | null) {
  if (typeof window === 'undefined') return;

  const storageKey = getActiveLeadStorageKey(userId);
  if (leadId) {
    window.localStorage.setItem(storageKey, leadId);
    return;
  }

  window.localStorage.removeItem(storageKey);
}

function getNextLeadIndex(nextLeads: Lead[], preferredLeadId: string | null, fallbackIndex: number) {
  if (nextLeads.length === 0) return 0;

  if (preferredLeadId) {
    const preferredIndex = nextLeads.findIndex((lead) => lead.id === preferredLeadId);
    if (preferredIndex >= 0) return preferredIndex;
  }

  return Math.min(Math.max(fallbackIndex, 0), nextLeads.length - 1);
}

type FetchLeadsMode = 'preserve' | 'reset';
type CallNotice = { kind: 'success' | 'error'; message: string };
type LeadEditValue = string | string[] | number;

const LEAD_FIELD_COLUMN_MAP: Partial<Record<keyof Lead, string>> = {
  dealSize: 'deal_size',
  dealSizeNum: 'deal_size_num',
  lastContact: 'last_contact',
  callAttempts: 'call_attempts',
  companySize: 'company_size',
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
  if (
    value === 'new' ||
    value === 'connected' ||
    value === 'voicemail' ||
    value === 'lost' ||
    value === 'qualified'
  ) {
    return value;
  }

  return 'new';
}

function normalizeLeadRow(lead: Record<string, unknown>): Lead {
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

function buildTelHref(phone: string) {
  const trimmedPhone = phone.trim();
  if (!trimmedPhone) return null;

  const hasLeadingPlus = trimmedPhone.startsWith('+');
  const digits = trimmedPhone.replace(/\D/g, '');
  if (!digits) return null;

  return `tel:${hasLeadingPlus ? '+' : ''}${digits}`;
}

function CallNoticeToast({ notice }: { notice: CallNotice | null }) {
  return (
    <AnimatePresence>
      {notice ? (
        <motion.div
          key="call-notice"
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.16 }}
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
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
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
  const detailLeadId = location.pathname.startsWith('/leads/') ? decodeURIComponent(location.pathname.replace('/leads/', '')) : null;
  const isDetailRoute = Boolean(detailLeadId);

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
  // ── Auth handlers ─────────────────────────────────────────────
  const handleLogin = useCallback(async () => {
    setAuthError('');
    setAuthSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
      setAuthSubmitting(false);
      return;
    }

    setAuthSubmitting(false);
  }, [email, password]);

  const handleCsvSelected = useCallback(async (file: File | null) => {
    if (!file) return;

    setImportError('');
    setImportSuccess('');

    const text = await file.text();
    const { headers, rows } = parseCsv(text);

    if (headers.length === 0 || rows.length === 0) {
      setImportError('CSV must include a header row and at least one data row.');
      setCsvHeaders([]);
      setCsvRows([]);
      setCsvPreviewRows([]);
      setColumnMapping({});
      setImportFileName(file.name);
      return;
    }

    setImportFileName(file.name);
    setCsvHeaders(headers);
    setCsvRows(rows);
    setCsvPreviewRows(rows.slice(0, 8));
    setColumnMapping(guessImportMapping(headers));
  }, []);

  const clearCsvSelection = useCallback(() => {
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvPreviewRows([]);
    setColumnMapping({});
    setImportFileName('');
    setImportError('');
    setImportSuccess('');

    ['csv-upload-input', 'csv-upload-input-empty'].forEach((inputId) => {
      const input = document.getElementById(inputId);
      if (input instanceof HTMLInputElement) {
        input.value = '';
      }
    });
  }, []);

  const fetchLeads = useCallback(async (mode: FetchLeadsMode = 'preserve') => {
    if (!session) {
      setLeads([]);
      setCurrentIndex(0);
      setLeadsLoading(false);
      return;
    }

    setLeadsLoading(true);

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error fetching leads:', error);
        return;
      }

      const normalizedLeads = (data || []).map((lead) => normalizeLeadRow(lead));

      const nextLeads = normalizedLeads as Lead[];
      const preferredLeadId = mode === 'reset'
        ? nextLeads[0]?.id ?? null
        : currentLeadIdRef.current ?? getStoredActiveLeadId(session.user.id);
      const nextIndex = getNextLeadIndex(nextLeads, preferredLeadId, currentIndexRef.current);

      setLeads(nextLeads);
      setCurrentIndex(nextIndex);

      try {
        const recentActivities = await fetchRecentActivities(session.user.id, 80);
        setActivityLog(mapActivitiesToItems(recentActivities, nextLeads));
      } catch (activityError) {
        console.error('Error fetching recent activities:', activityError);
      }
    } finally {
      setLeadsLoading(false);
    }
  }, [mapActivitiesToItems, session]);
  const handleImportLeads = useCallback(async () => {
    if (!session) {
      setImportError('You must be logged in to import leads.');
      return;
    }

    if (csvHeaders.length === 0) {
      setImportError('Upload a CSV file first.');
      return;
    }

    setImportError('');
    setImportSuccess('');
    setImporting(true);

    try {
      if (csvRows.length === 0) {
        setImportError('Please choose a CSV file to import.');
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

      const { error } = await supabase.from('leads').insert(payload);

      if (error) {
        setImportError(error.message);
        setImporting(false);
        return;
      }

      setImportSuccess(`Imported ${payload.length} lead${payload.length === 1 ? '' : 's'} successfully.`);
      await fetchLeads();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import CSV.');
    } finally {
      setImporting(false);
    }
  }, [columnMapping, csvHeaders.length, csvRows, fetchLeads, session]);

  const loadCrmStatus = useCallback(async () => {
    if (!session) {
      setCrmConnection(null);
      setCrmLastRun(null);
      return;
    }

    setCrmLoading(true);
    try {
      const { data: connection, error: connectionError } = await supabase
        .from('crm_connections')
        .select('id, provider, portal_id, account_name, status, connected_at, last_synced_at')
        .eq('user_id', session.user.id)
        .eq('provider', 'hubspot')
        .neq('status', 'disconnected')
        .maybeSingle();

      if (connectionError) throw connectionError;
      setCrmConnection((connection as CrmConnection | null) ?? null);

      const { data: syncRun, error: syncRunError } = await supabase
        .from('crm_sync_runs')
        .select('id, operation, status, created_count, updated_count, skipped_count, failed_count, errors, started_at, finished_at')
        .eq('user_id', session.user.id)
        .eq('provider', 'hubspot')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (syncRunError) throw syncRunError;
      setCrmLastRun((syncRun as CrmSyncRun | null) ?? null);
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Failed to load CRM status.');
    } finally {
      setCrmLoading(false);
    }
  }, [session]);

  const startHubSpotOAuth = useCallback(async () => {
    if (!session) return;

    setCrmAction('connect');
    setCrmError('');
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-oauth-start', {
        body: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      if (!data?.authUrl) throw new Error('HubSpot OAuth URL was not returned.');
      window.location.href = data.authUrl;
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Failed to connect HubSpot.');
    } finally {
      setCrmAction(null);
    }
  }, [session]);

  const runHubSpotAction = useCallback(async (action: 'import' | 'export' | 'sync' | 'disconnect') => {
    const functionName = {
      import: 'hubspot-import-contacts',
      export: 'hubspot-export-contacts',
      sync: 'hubspot-sync-contacts',
      disconnect: 'hubspot-disconnect',
    }[action];

    setCrmAction(action);
    setCrmError('');
    setCrmResult(null);

    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body: {} });
      if (error) throw error;
      setCrmResult((data?.result as CrmSyncResult | undefined) ?? null);
      await loadCrmStatus();
      if (action !== 'disconnect') {
        await fetchLeads();
      } else {
        setCrmConnection(null);
      }
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : `HubSpot ${action} failed.`);
    } finally {
      setCrmAction(null);
    }
  }, [fetchLeads, loadCrmStatus]);

  const handleLogout = useCallback(async () => {
    if (session) {
      setStoredActiveLeadId(session.user.id, null);
    }

    await supabase.auth.signOut();
    setLeads([]);
    setCurrentIndex(0);
    setActivityLog([]);
    setStatsCount({ connected: 0, lost: 0, voicemail: 0, next: 0 });
  }, [session]);
  // ── Fetch leads from Supabase ───────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchLeads();
      void loadCrmStatus();
    } else {
      setLeads([]);
      setCurrentIndex(0);
      setLeadsLoading(false);
      currentLeadIdRef.current = null;
      setCrmConnection(null);
      setCrmLastRun(null);
    }
  }, [fetchLeads, loadCrmStatus, session]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const isAnimatingRef = useRef(false);
  const lastNavTime    = useRef(0);
  const cardAreaRef    = useRef<HTMLDivElement>(null);

  const isDone      = !leadsLoading && leads.length > 0 && currentIndex >= leads.length;
  const currentLead = leads[currentIndex] ?? leads[leads.length - 1] ?? null;
  const detailLead = detailLeadId ? leads.find((lead) => lead.id === detailLeadId) ?? null : null;
  const statusActions: ActivityType[] = ['connected', 'lost', 'voicemail', 'next'];

  const openLeadHistory = useCallback((leadId: string) => {
    if (!session) return;
    setStoredActiveLeadId(session.user.id, leadId);
    navigate(`/leads/${encodeURIComponent(leadId)}`);
  }, [navigate, session]);

  const getLeadStatusLabel = useCallback((lead: Lead) => {
    const latestStatus = activityLog.find((item) => item.leadId === lead.id && statusActions.includes(item.action));
    return latestStatus ? actionMeta[latestStatus.action].label : 'None';
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
    if (session && lead) {
      setStoredActiveLeadId(session.user.id, lead.id);
    }
  }, [currentIndex, findLeadSearchIndex, leadSearchQuery, leads, session]);

  const jumpToLeadSearchIndex = useCallback((query: string, startIndex: number, direction: 1 | -1 = 1) => {
    const nextIndex = findLeadSearchIndex(query, startIndex, direction);
    if (nextIndex < 0) return;

    setCurrentIndex(nextIndex);
    const lead = leads[nextIndex];
    currentLeadIdRef.current = lead?.id ?? null;
    if (session && lead) {
      setStoredActiveLeadId(session.user.id, lead.id);
    }
  }, [findLeadSearchIndex, leads, session]);

  const handleCreateLead = useCallback(async () => {
    if (!session || creatingLead) return;

    setCreatingLead(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert(buildBlankLeadPayload(session.user.id))
        .select('*')
        .single();

      if (error) {
        console.error('Error creating lead:', error);
        return;
      }

      const newLead = normalizeLeadRow(data as Record<string, unknown>);
      setLeads((prev) => [...prev, newLead]);
      setCurrentIndex(leads.length);
      currentLeadIdRef.current = newLead.id;
      setStoredActiveLeadId(session.user.id, newLead.id);
      setAutoEditLeadId(newLead.id);
      setAutoEditLeadToken((token) => token + 1);
      setShowLeadSearch(false);
    } finally {
      setCreatingLead(false);
    }
  }, [creatingLead, leads.length, session]);

  const handleDeleteCurrentLead = useCallback(async () => {
    if (!session || !currentLead) return;

    const leadToDelete = currentLead;
    setDeletingLead(true);

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadToDelete.id)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error deleting lead:', error);
        return;
      }

      setLeads((prev) => {
        const nextLeads = prev.filter((lead) => lead.id !== leadToDelete.id);
        const nextIndex = Math.min(currentIndex, Math.max(nextLeads.length - 1, 0));
        const nextLead = nextLeads[nextIndex] ?? null;

        currentLeadIdRef.current = nextLead?.id ?? null;
        setCurrentIndex(nextIndex);
        setStoredActiveLeadId(session.user.id, nextLead?.id ?? null);

        return nextLeads;
      });
      setActivityLog((prev) => prev.filter((item) => item.leadId !== leadToDelete.id));
      setLeadActivityItems([]);
      setShowDeleteConfirm(false);
    } finally {
      setDeletingLead(false);
    }
  }, [currentIndex, currentLead, session]);

  const refreshLeadActivities = useCallback(async (leadId: string, filter: ActivityFilter) => {
    if (!session) {
      setLeadActivityItems(getLocalLeadActivityItems(leadId));
      return;
    }

    try {
      const activities = await fetchLeadActivities(session.user.id, leadId, filter, 200);
      if (activities.length === 0) {
        setLeadActivityItems(getLocalLeadActivityItems(leadId));
        return;
      }

      setLeadActivityItems(mapActivitiesToItems(activities, leads));
    } catch (error) {
      console.error('Error fetching lead activities:', error);
      setLeadActivityItems(getLocalLeadActivityItems(leadId));
    }
  }, [getLocalLeadActivityItems, leads, mapActivitiesToItems, session]);

  const addActivity = useCallback(async (action: ActivityType, lead: Lead) => {
    const nextItem: ActivityItem = {
      id: `${Date.now()}-${Math.random()}`,
      leadId: lead.id,
      action,
      leadName: lead.name,
      company: lead.company,
      timestamp: new Date(),
    };

    setActivityLog((prev) => [nextItem, ...prev].slice(0, 80));

    if (!session) return;

    try {
      await insertLeadActivity(session.user.id, lead.id, action);
      if (detailLeadId === lead.id) {
        await refreshLeadActivities(lead.id, detailActivityFilter);
      }
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  }, [detailActivityFilter, detailLeadId, refreshLeadActivities, session]);

  const showCallNoticeMessage = useCallback((notice: CallNotice) => {
    setCallNotice(notice);
    if (callNoticeTimeoutRef.current) {
      window.clearTimeout(callNoticeTimeoutRef.current);
    }
    callNoticeTimeoutRef.current = window.setTimeout(() => {
      setCallNotice(null);
      callNoticeTimeoutRef.current = null;
    }, 2600);
  }, []);

  const promptLeadCall = useCallback((lead: Lead | null) => {
    if (!lead) {
      showCallNoticeMessage({ kind: 'error', message: 'No lead selected to call.' });
      return;
    }

    const telHref = buildTelHref(lead.phone);
    if (!telHref) {
      showCallNoticeMessage({ kind: 'error', message: `${lead.name} does not have a phone number.` });
      return;
    }

    const telLink = document.createElement('a');
    telLink.href = telHref;
    telLink.style.display = 'none';
    telLink.setAttribute('aria-hidden', 'true');
    document.body.appendChild(telLink);
    telLink.click();
    telLink.remove();

    showCallNoticeMessage({ kind: 'success', message: `Opening dialer for ${lead.name}.` });
    void addActivity('call', lead);
  }, [addActivity, showCallNoticeMessage]);

  const promptLeadEmail = useCallback((lead: Lead | null) => {
    if (!lead) {
      showCallNoticeMessage({ kind: 'error', message: 'No lead selected to email.' });
      return;
    }

    if (!lead.email.trim()) {
      showCallNoticeMessage({ kind: 'error', message: `${lead.name} does not have an email address.` });
      return;
    }

    setShowEmailModal(true);
  }, [showCallNoticeMessage]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hubspotStatus = params.get('hubspot');
    if (!hubspotStatus) return;

    if (hubspotStatus === 'connected') {
      showCallNoticeMessage({ kind: 'success', message: 'HubSpot connected.' });
      void loadCrmStatus();
    } else if (hubspotStatus === 'error') {
      showCallNoticeMessage({ kind: 'error', message: params.get('message') ?? 'HubSpot connection failed.' });
    }

    navigate(location.pathname, { replace: true });
  }, [loadCrmStatus, location.pathname, location.search, navigate, showCallNoticeMessage]);

  useEffect(() => {
    return () => {
      if (callNoticeTimeoutRef.current) {
        window.clearTimeout(callNoticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    currentLeadIdRef.current = currentLead?.id ?? null;
  }, [currentLead]);

  useEffect(() => {
    if (!session) return;
    setStoredActiveLeadId(session.user.id, currentLead?.id ?? null);
  }, [currentLead?.id, session]);

  useEffect(() => {
    if (leads.length === 0) {
      if (currentIndex !== 0) setCurrentIndex(0);
      return;
    }

    const boundedIndex = Math.min(Math.max(currentIndex, 0), leads.length);
    if (boundedIndex !== currentIndex) {
      setCurrentIndex(boundedIndex);
    }
  }, [currentIndex, leads.length]);

  useEffect(() => {
    if (!detailLeadId) return;
    const detailIndex = leads.findIndex((lead) => lead.id === detailLeadId);
    if (detailIndex >= 0) {
      setCurrentIndex(detailIndex);
      currentLeadIdRef.current = detailLeadId;
      if (session) {
        setStoredActiveLeadId(session.user.id, detailLeadId);
      }
    }
  }, [detailLeadId, leads, session]);

  useEffect(() => {
    if (!session) {
      setActivityLog([]);
      setLeadActivityItems([]);
      return;
    }
  }, [session]);

  useEffect(() => {
    if (!detailLeadId) {
      setLeadActivityItems([]);
      return;
    }

    if (!session) return;
    void refreshLeadActivities(detailLeadId, detailActivityFilter);
  }, [detailActivityFilter, detailLeadId, refreshLeadActivities, session]);

  useEffect(() => {
    if (!detailLeadId) return;
    if (leadActivityItems.length > 0) return;
    setLeadActivityItems(getLocalLeadActivityItems(detailLeadId));
  }, [detailLeadId, getLocalLeadActivityItems, leadActivityItems.length]);

  // ── Swipe actions (Q/A/D/R) ──────────────────────────────────────────
  const triggerSwipeAction = useCallback((action: SwipeAction) => {
    if (isAnimatingRef.current || isDone) return;
    isAnimatingRef.current = true;

    setOverlayInfo({ action, index: currentIndex });
    setStatsCount(prev => ({ ...prev, [action]: (prev[action as keyof typeof prev] ?? 0) + 1 }));
    void addActivity(action, leads[currentIndex]);

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => {
        setOverlayInfo(null);
        isAnimatingRef.current = false;
      }, 480);
    }, 300);
  }, [isDone, currentIndex, leads, addActivity]);

  const jumpToFirstLead = useCallback(() => {
    if (leads.length === 0 || isAnimatingRef.current) return;

    setCurrentIndex(0);
    currentLeadIdRef.current = leads[0]?.id ?? null;
    if (session && leads[0]) {
      setStoredActiveLeadId(session.user.id, leads[0].id);
    }
  }, [leads, session]);

  // ── Navigate previous (T key / scroll up) ───────────────────────────
  const navigatePrev = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTime.current < 400) return;
    if (isAnimatingRef.current) return;
    lastNavTime.current = now;
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  // ── Navigate next via scroll (no action logged) ──────────────────────
  const navigateNext = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTime.current < 400) return;
    if (isAnimatingRef.current) return;
    if (leads.length === 0) return;
    lastNavTime.current = now;
    setCurrentIndex(prev => Math.min(prev + 1, leads.length - 1));
  }, [leads.length]);

  // ── Wheel event for rolodex scroll ───────────────────────────────────
  useEffect(() => {
    if (isDetailRoute) return;
    const el = cardAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 20)       navigateNext();
      else if (e.deltaY < -20) navigatePrev();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isDetailRoute, navigateNext, navigatePrev]);

  // ── Keyboard handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const noModal = !showNotesModal && !showEmailModal;

      if (!isDetailRoute && noModal && e.key === 'ArrowDown') {
        e.preventDefault();
        navigateNext();
        return;
      }

      if (!isDetailRoute && noModal && e.key === 'ArrowUp') {
        e.preventDefault();
        navigatePrev();
        return;
      }

      if (e.key === 'Enter' && !isDetailRoute && noModal && currentLead) {
        e.preventDefault();
        openLeadHistory(currentLead.id);
        return;
      }

      const key    = e.key.toLowerCase();
      const action = KEY_ACTIONS[key];
      if (!action) return;

      setPressedKey(key.toUpperCase());
      setTimeout(() => setPressedKey(null), 300);

      if (action === 'notes')    { if (noModal) setShowNotesModal(true); }
      else if (action === 'email')    { if (noModal) promptLeadEmail(currentLead); }
      else if (action === 'call')     { if (noModal) promptLeadCall(currentLead); }
      else if (action === 'previous') { if (noModal) navigatePrev(); }
      else { if (noModal) triggerSwipeAction(action as SwipeAction); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSwipeAction, navigatePrev, navigateNext, showNotesModal, showEmailModal, isDetailRoute, currentLead, openLeadHistory, promptLeadCall, promptLeadEmail]);

  // ── Edit lead field ──────────────────────────────────────────────────
  const persistLeadEdit = useCallback(async (leadId: string, field: keyof Lead, value: LeadEditValue) => {
    if (!session) return;
    if (field === 'id') {
      console.error('Refusing to edit immutable lead id.');
      return;
    }

    const { error } = await supabase
      .from('leads')
      .update({ [getLeadDatabaseColumn(field)]: value })
      .eq('id', leadId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error saving lead edit:', error);
      await fetchLeads();
    }
  }, [fetchLeads, session]);

  const handleLeadEdit = useCallback((leadId: string, field: keyof Lead, value: LeadEditValue) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, [field]: value } : l));
    void persistLeadEdit(leadId, field, value);
  }, [persistLeadEdit]);

  // ── Save notes ───────────────────────────────────────────────────────
  const handleSaveNotes = (notes: string) => {
    if (!currentLead) return;
    const capturedLead = currentLead;
    const capturedIndex = currentIndex;
    handleLeadEdit(currentLead.id, 'notes', notes);
    setOverlayInfo({ action: 'notes', index: capturedIndex });
    setTimeout(() => setOverlayInfo(null), 1200);
    void addActivity('notes', capturedLead);
  };

  // ── Email sent callback ───────────────────────────────────────────────
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

  // ── Helpers ───────────────────────────────────────────────────────────
  const timeAgo = (date: Date) => {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  };

  const progress  = leads.length > 0 ? (currentIndex / leads.length) * 100 : 0;
  const remaining = Math.max(0, leads.length - currentIndex);
  const total     = leads.length;
  const currentLeadPosition = total > 0 ? Math.min(currentIndex + 1, total) : 0;
  const normalizedLeadSearchQuery = leadSearchQuery.trim().toLowerCase();
  const leadSearchMatchCount = normalizedLeadSearchQuery
    ? leads.filter((lead) => `${lead.name} ${lead.company} ${lead.title} ${lead.email} ${lead.phone}`.toLowerCase().includes(normalizedLeadSearchQuery)).length
    : 0;
  const crmBusy = crmAction !== null || crmLoading;
  const crmModal = (
    <AnimatePresence>
      {showCrmModal ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowCrmModal(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-3xl rounded-3xl border overflow-hidden"
            style={{ background: '#11111a', borderColor: '#1f1f2e' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1f1f2e' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <h3 className="text-white text-lg font-semibold">HubSpot CRM Integration</h3>
                  <p className="text-gray-400 text-sm">Import, export, and manually sync HubSpot contacts.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCrmModal(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-2xl border p-4" style={{ background: '#0d0d14', borderColor: '#1f1f2e' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500">Connection</p>
                    <p className="mt-1 text-white font-semibold">
                      {crmConnection ? crmConnection.account_name ?? 'HubSpot connected' : 'HubSpot not connected'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {crmConnection
                        ? `Status: ${crmConnection.status}${crmConnection.portal_id ? ` · Portal ${crmConnection.portal_id}` : ''}`
                        : 'Connect your HubSpot account to start syncing contacts.'}
                    </p>
                    {crmConnection?.last_synced_at ? (
                      <p className="mt-1 text-xs text-gray-600">Last synced: {new Date(crmConnection.last_synced_at).toLocaleString()}</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => void startHubSpotOAuth()}
                    disabled={crmBusy}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: '#4f46e5' }}
                  >
                    {crmAction === 'connect' ? 'Connecting...' : crmConnection ? 'Reconnect HubSpot' : 'Connect HubSpot'}
                  </button>
                </div>
              </div>

              {crmError ? (
                <div className="rounded-xl border px-4 py-3 text-sm text-rose-300" style={{ background: '#2a1117', borderColor: '#5a1f2b' }}>
                  {crmError}
                </div>
              ) : null}

              {crmResult ? (
                <div className="grid grid-cols-4 gap-2">
                  {([
                    ['Created', crmResult.created],
                    ['Updated', crmResult.updated],
                    ['Skipped', crmResult.skipped],
                    ['Failed', crmResult.failed],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="rounded-xl border px-3 py-2 text-center" style={{ background: '#0d0d14', borderColor: '#1f1f2e' }}>
                      <p className="text-white text-lg font-bold">{value}</p>
                      <p className="text-gray-500 text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { action: 'import', label: 'Import from HubSpot', description: 'Pull HubSpot contacts into Swipr.' },
                  { action: 'export', label: 'Export to HubSpot', description: 'Push Swipr leads and activity notes.' },
                  { action: 'sync', label: 'Sync HubSpot', description: 'Run import then export.' },
                ] as const).map((item) => (
                  <button
                    key={item.action}
                    onClick={() => void runHubSpotAction(item.action)}
                    disabled={!crmConnection || crmBusy}
                    className="rounded-2xl border p-4 text-left transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: '#0d0d14', borderColor: '#1f1f2e' }}
                  >
                    <p className="text-white text-sm font-semibold">{crmAction === item.action ? 'Working...' : item.label}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.description}</p>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border p-4" style={{ background: '#0d0d14', borderColor: '#1f1f2e' }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white text-sm font-semibold">Last sync run</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {crmLastRun
                        ? `${crmLastRun.operation} · ${crmLastRun.status} · ${new Date(crmLastRun.started_at).toLocaleString()}`
                        : 'No HubSpot sync has run yet.'}
                    </p>
                  </div>
                  <button
                    onClick={() => void runHubSpotAction('disconnect')}
                    disabled={!crmConnection || crmBusy}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Unplug className="h-4 w-4" />
                    {crmAction === 'disconnect' ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <p className="text-white text-lg font-semibold">Loading Swipr CRM...</p>
          <p className="text-gray-500 text-sm mt-2">Checking your session</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="login-gradient-bg h-screen w-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border p-8" style={{ background: '#13131a', borderColor: '#1c1c2a' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
              <img
              src ={logoImage}
              alt="Swipr CRM Logo"
              className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold tracking-tight">SwiprCRM</h1>
              <p className="text-gray-400 text-sm"></p>
            </div>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleLogin();
            }}
          >
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none"
                style={{ background: '#0a0a0f', borderColor: '#1c1c2a' }}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none"
                style={{ background: '#0a0a0f', borderColor: '#1c1c2a' }}
              />
            </div>

            {authError ? (
              <div className="rounded-xl border px-3 py-2 text-sm text-rose-300" style={{ background: '#2a1117', borderColor: '#5a1f2b' }}>
                {authError}
              </div>
            ) : null}

            <div className="pt-2">
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full rounded-xl px-4 py-3 text-white font-semibold transition-colors disabled:opacity-60"
                style={{ background: '#4f46e5' }}
              >
                {authSubmitting ? 'Loading...' : 'Log In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (leadsLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <p className="text-white text-lg font-semibold">Loading SwiprCRM...</p>
        </div>
      </div>
    );
  }

  if (!isDetailRoute && leads.length === 0) {
    return (
      <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ background: '#0a0a0f' }}>
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: '#1c1c2a' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
              <img src={logoImage} alt="Swipr CRM logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-bold tracking-tight">Swipr CRM</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleCreateLead()}
              disabled={creatingLead}
              className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-60"
              style={{ background: '#4f46e5', border: '1px solid #6366f1' }}
            >
              <Plus className="w-4 h-4" />
              {creatingLead ? 'Adding...' : 'Add Lead'}
            </button>
            <button
              onClick={() => {
                setShowCrmModal(true);
                setCrmError('');
                void loadCrmStatus();
              }}
              className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
              style={{ background: '#164e63', border: '1px solid #0e7490' }}
            >
              <RefreshCw className="w-4 h-4" />
              CRM Integration
            </button>
            <button
              onClick={() => {
                setShowImportModal(true);
                setImportError('');
                setImportSuccess('');
              }}
              className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
              style={{ background: '#312e81', border: '1px solid #4338ca' }}
            >
              <Download className="w-4 h-4" />
              Import Leads
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ background: '#1f2937', border: '1px solid #374151' }}
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 text-center">
          <div>
            <Users className="w-10 h-10 text-gray-700 mx-auto mb-4" />
            <p className="text-white text-lg font-semibold">No leads loaded</p>
            <p className="text-gray-500 text-sm mt-2">Add a lead manually or import a CSV to start reviewing leads.</p>
          <button
            onClick={() => void handleCreateLead()}
              disabled={creatingLead}
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: '#4f46e5' }}
            >
            <Plus className="w-4 h-4" />
            {creatingLead ? 'Adding...' : 'Add Lead'}
          </button>
          <button
            onClick={() => {
              setShowCrmModal(true);
              setCrmError('');
              void loadCrmStatus();
            }}
            className="ml-3 mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            style={{ background: '#164e63' }}
          >
            <RefreshCw className="w-4 h-4" />
            CRM Integration
          </button>
          </div>
        </main>
        <AnimatePresence>
          {showImportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowImportModal(false);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 18 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="w-full max-w-5xl rounded-3xl border overflow-hidden"
                style={{ background: '#11111a', borderColor: '#1f1f2e' }}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1f1f2e' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <h3 className="text-white text-lg font-semibold">Import Leads from CSV</h3>
                      <p className="text-gray-400 text-sm">Upload a CSV, preview the rows, and choose which columns to import.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <div className="p-6">
                  <label
                    htmlFor="csv-upload-input-empty"
                    className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-8 cursor-pointer text-center transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/5"
                    style={{ borderColor: '#2a2a3a' }}
                  >
                    <Upload className="w-8 h-8 text-indigo-300" />
                    <div>
                      <p className="text-white font-medium">Choose CSV file</p>
                      <p className="text-gray-500 text-sm mt-1">Click to upload lead data from your computer</p>
                    </div>
                    <input
                      id="csv-upload-input-empty"
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => void handleCsvSelected(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <div className="mt-4 rounded-2xl border px-4 py-3 text-left" style={{ background: '#13131a', borderColor: '#1f1f2e' }}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-gray-500 text-xs uppercase tracking-wider">Selected file</p>
                      {importFileName ? (
                        <button
                          type="button"
                          onClick={clearCsvSelection}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Remove file
                        </button>
                      ) : null}
                    </div>
                    <p className="text-white text-sm font-medium break-all">{importFileName || 'No file chosen yet'}</p>
                    <p className="text-gray-500 text-xs mt-2">{csvHeaders.length > 0 ? `${csvHeaders.length} columns detected · ${csvRows.length} row${csvRows.length === 1 ? '' : 's'} ready` : 'Choose a CSV to load it into the importer.'}</p>
                  </div>
                  {importError ? (
                    <div className="mt-4 rounded-xl border px-4 py-3 text-left text-sm text-rose-300" style={{ background: '#2a1117', borderColor: '#5a1f2b' }}>
                      {importError}
                    </div>
                  ) : null}
                  {importSuccess ? (
                    <div className="mt-4 rounded-xl border px-4 py-3 text-left text-sm text-emerald-300" style={{ background: '#0f2218', borderColor: '#1d5134' }}>
                      {importSuccess}
                    </div>
                  ) : null}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => void handleImportLeads()}
                      disabled={importing}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
                      style={{ background: '#4f46e5' }}
                    >
                      {importing ? 'Importing...' : 'Import Leads'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {crmModal}
      </div>
    );
  }

  if (isDetailRoute) {
    if (!detailLead) {
      return (
        <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
          <div className="text-center">
            <p className="text-white text-lg font-semibold">Lead not found</p>
            <p className="text-gray-500 text-sm mt-2">This lead may have been deleted or is unavailable.</p>
            <button
              onClick={() => navigate('/')}
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
            onClick={() => navigate('/')}
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

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ background: '#0a0a0f' }}>

      {/* ── TOP BAR ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: '#1c1c2a' }}>
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
            <img
              src={logoImage}
              alt="Swipr CRM logo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-white font-bold tracking-tight">Swipr CRM</span>
        </div>

        {/* Stats — count / total */}
        <div className="flex items-center gap-2">
          {([
            { icon: CheckCircle, count: statsCount.connected, color: 'text-emerald-400', label: 'Connected' },
            { icon: XCircle,     count: statsCount.lost,      color: 'text-rose-400',    label: 'Lost'      },
            { icon: Voicemail,   count: statsCount.voicemail, color: 'text-amber-400',   label: 'Voicemail' },
            { icon: SkipForward, count: statsCount.next,      color: 'text-sky-400',     label: 'Skipped'   },
          ] as const).map(({ icon: Icon, count, color, label }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#13131a', border: '1px solid #1c1c2a' }}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-white font-semibold text-sm">
                {count}<span className="text-gray-600 font-normal">/{total}</span>
              </span>
              <span className="text-gray-500 text-xs hidden md:block">{label}</span>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end gap-0.5">
            <span className="text-white text-sm font-semibold">Lead {currentLeadPosition} of {total}</span>
            <div className="w-32 h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#13131a', border: '1px solid #1c1c2a' }}>
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-white font-semibold text-sm">{remaining}</span>
            <span className="text-gray-500 text-xs">left</span>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#13131a', border: '1px solid #1c1c2a' }}>
            <span className="text-gray-500 text-xs">{session.user.email}</span>
          </div>
          <button
            onClick={() => {
              setShowCrmModal(true);
              setCrmError('');
              void loadCrmStatus();
            }}
            className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
            style={{ background: '#164e63', border: '1px solid #0e7490' }}
          >
            <RefreshCw className="w-4 h-4" />
            CRM Integration
          </button>
          <button
            onClick={() => {
              setShowImportModal(true);
              setImportError('');
              setImportSuccess('');
            }}
            className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
            style={{ background: '#312e81', border: '1px solid #4338ca' }}
          >
            <Download className="w-4 h-4" />
            Import Leads
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ background: '#1f2937', border: '1px solid #374151' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* ── CENTER: Rolodex ── */}
        <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
          {isDone ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-5">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-white mb-2">All Leads Reviewed!</h2>
              <p className="text-gray-400 text-sm mb-6">
                {statsCount.connected} connected · {statsCount.voicemail} voicemails · {statsCount.lost} lost
              </p>
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  currentLeadIdRef.current = leads[0]?.id ?? null;
                  void fetchLeads('reset');
                  setStatsCount({ connected: 0, lost: 0, voicemail: 0, next: 0 });
                  setActivityLog([]);
                }}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
              >
                Back to First Lead
              </button>
            </motion.div>
          ) : (
            <>
              {/* Rolodex scroll container */}
              <div
                ref={cardAreaRef}
                className="relative overflow-hidden"
                style={{ width: CARD_WIDTH, height: CONTAINER_H }}
              >
                {leads.map((lead, i) => {
                  const offset = i - currentIndex;
                  if (Math.abs(offset) > 1) return null;
                  return (
                    <motion.div
                      key={lead.id}
                      className="absolute inset-x-0"
                      style={{
                        height: CARD_HEIGHT,
                        top: 0,
                        pointerEvents: offset === 0 ? 'auto' : 'none',
                        zIndex: offset === 0 ? 10 : 1,
                      }}
                      animate={{
                        y:       offset * CARD_STRIDE + CENTER_Y,
                        scale:   offset === 0 ? 1    : 0.87,
                        opacity: offset === 0 ? 1    : 0.38,
                      }}
                      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                    >
                      <LeadCard
                        lead={lead}
                        overlayInfo={overlayInfo}
                        cardIndex={i}
                        onEdit={(field, value) => handleLeadEdit(lead.id, field, value)}
                        isActive={offset === 0}
                        onViewHistory={offset === 0 ? () => openLeadHistory(lead.id) : undefined}
                        onCall={offset === 0 ? () => promptLeadCall(lead) : undefined}
                        autoEditNameToken={autoEditLeadId === lead.id ? autoEditLeadToken : undefined}
                        statusLabel={getLeadStatusLabel(lead)}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div
          className="relative w-12 flex-shrink-0 border-l flex flex-col items-center gap-2 pt-4"
          style={{ borderColor: '#1c1c2a', background: '#0a0a0f' }}
        >
          <button
            type="button"
            title="Add new lead"
            disabled={!session || creatingLead}
            onClick={() => void handleCreateLead()}
            className="h-9 w-9 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 flex items-center justify-center transition-colors hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Search leads"
            onClick={() => setShowLeadSearch((value) => !value)}
            className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors ${
              showLeadSearch ? 'border-indigo-400 bg-indigo-500/15 text-indigo-300' : 'border-gray-800 bg-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Delete current lead"
            disabled={!currentLead}
            onClick={() => setShowDeleteConfirm(true)}
            className="h-9 w-9 rounded-lg border border-gray-800 bg-transparent text-gray-500 flex items-center justify-center transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <AnimatePresence>
            {showLeadSearch && (
              <motion.div
                initial={{ opacity: 0, x: 10, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-12 top-4 z-30 w-72 rounded-xl border p-3 shadow-2xl"
                style={{ background: '#11111a', borderColor: '#252538' }}
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <input
                    autoFocus
                    value={leadSearchQuery}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLeadSearchQuery(value);
                      jumpToLeadSearchIndex(value, -1, 1);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        jumpToLeadSearch(event.shiftKey ? -1 : 1);
                      }
                      if (event.key === 'Escape') setShowLeadSearch(false);
                    }}
                    placeholder="Search leads"
                    className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{leadSearchQuery ? `${leadSearchMatchCount} match${leadSearchMatchCount === 1 ? '' : 'es'}` : 'Type to search'}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => jumpToLeadSearch(-1)}
                      className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-white/5"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => jumpToLeadSearch(1)}
                      className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-white/5"
                    >
                      Down
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── RIGHT SIDEBAR: Activity Log ── */}
        <aside
          className="w-72 flex-shrink-0 flex flex-col border-l overflow-hidden"
          style={{ background: '#0e0e17', borderColor: '#1c1c2a' }}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: '#1c1c2a' }}>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span className="text-white text-sm font-semibold">Activity Log</span>
            </div>
            <span className="text-gray-600 text-xs">{activityLog.length} actions</span>
          </div>

          {/* Current lead quick info */}
          {!isDone && (
            <div className="px-4 py-3 border-b mx-3 mt-3 rounded-xl" style={{ background: '#13131a', border: '1px solid #1f1f2e' }}>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5">Current Lead</p>
              <p className="text-white font-semibold text-sm truncate">{currentLead.name}</p>
              <p className="text-gray-400 text-xs truncate">{currentLead.company}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-indigo-400 text-xs font-semibold">{currentLead.industry}</span>
                <span className="text-gray-500 text-xs">Score: {currentLead.score ?? 0}</span>
              </div>
              <button
                onClick={() => openLeadHistory(currentLead.id)}
                className="mt-2 w-full rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2 py-1.5 text-xs font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/20"
              >
                View History
              </button>
            </div>
          )}

          {/* Activity items */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
            <AnimatePresence initial={false}>
              {activityLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <Zap className="w-8 h-8 text-gray-700 mb-3" />
                  <p className="text-gray-600 text-xs">Actions will appear here</p>
                  <p className="text-gray-700 text-xs mt-1">Press a key to get started</p>
                </div>
              ) : (
                activityLog.map((item) => {
                  const meta = actionMeta[item.action];
                  const Icon = meta.Icon;
                  return (
                    <motion.button
                      type="button"
                      key={item.id}
                      initial={{ opacity: 0, x: 20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => openLeadHistory(item.leadId)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-transform hover:scale-[1.01] ${meta.bgColor}`}
                    >
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{item.leadName}</p>
                        <p className="text-gray-500 text-xs truncate">{item.company}</p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className={`text-[10px] font-semibold ${meta.color}`}>{meta.label}</span>
                        <span className="text-gray-600 text-[10px]">{timeAgo(item.timestamp)}</span>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </aside>
      </main>

      <CallNoticeToast notice={callNotice} />

      {leads.length > 0 && currentIndex > 0 ? (
        <motion.button
          type="button"
          onClick={jumpToFirstLead}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="group fixed bottom-20 left-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 text-indigo-100 shadow-2xl transition-all duration-200 hover:w-36 hover:bg-indigo-500/25"
          title="Back to the top"
          aria-label="Back to the top"
          style={{ backdropFilter: 'blur(14px)' }}
        >
          <ArrowUpToLine className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:-translate-x-10" />
          <span className="absolute left-10 whitespace-nowrap text-xs font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Back to the top
          </span>
        </motion.button>
      ) : null}

      {/* ── BOTTOM KEYBOARD LEGEND ── */}
      <footer
        className="flex-shrink-0 px-6 py-3 border-t flex items-center justify-center gap-2 flex-wrap"
        style={{ borderColor: '#1c1c2a', background: '#0a0a0f' }}
      >
        {SHORTCUT_KEYS.map(({ key, label, action, color, bg }) => {
          const isPressed = pressedKey === key;
          return (
            <motion.button
              key={key}
              animate={isPressed ? { scale: 0.88, y: -2 } : { scale: 1, y: 0 }}
              transition={{ duration: 0.1 }}
              onClick={() => {
                setPressedKey(key);
                setTimeout(() => setPressedKey(null), 300);
                if (action === 'notes')    setShowNotesModal(true);
                else if (action === 'email')    promptLeadEmail(currentLead);
                else if (action === 'call')     promptLeadCall(currentLead);
                else if (action === 'previous') navigatePrev();
                else if (!isDone) triggerSwipeAction(action as SwipeAction);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                isPressed ? `${bg} scale-95` : `border-gray-800 bg-transparent`
              }`}
            >
              <kbd className={`text-xs font-bold font-mono ${isPressed ? color : 'text-gray-400'} min-w-[14px]`}>
                {key}
              </kbd>
              <span className={`text-xs ${isPressed ? color : 'text-gray-600'}`}>{label}</span>
            </motion.button>
          );
        })}
      </footer>

      {/* ── MODALS ── */}
      {currentLead && (
        <>
          <NotesModal
            lead={currentLead}
            isOpen={showNotesModal}
            onClose={() => setShowNotesModal(false)}
            onSave={handleSaveNotes}
          />
          <EmailDraftModal
            lead={currentLead}
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            onSend={handleEmailSent}
          />
        </>
      )}
      <AnimatePresence>
        {showDeleteConfirm && currentLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={(event) => {
              if (event.target === event.currentTarget) setShowDeleteConfirm(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="w-full max-w-sm rounded-2xl border p-5"
              style={{ background: '#11111a', borderColor: '#2b1f2a' }}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-rose-500/15 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-rose-300" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold">Delete lead?</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    This will remove {currentLead.name} from your rolodex.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteCurrentLead()}
                  disabled={deletingLead}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {deletingLead ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowImportModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-5xl rounded-3xl border overflow-hidden"
              style={{ background: '#11111a', borderColor: '#1f1f2e' }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1f1f2e' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-semibold">Import Leads from CSV</h3>
                    <p className="text-gray-400 text-sm">Upload a CSV, preview the rows, and choose which columns to import.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] min-h-[560px]">
                <div className="border-r p-5 space-y-4" style={{ borderColor: '#1f1f2e', background: '#0d0d14' }}>
                  <label
                    htmlFor="csv-upload-input"
                    className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-8 cursor-pointer text-center transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/5"
                    style={{ borderColor: '#2a2a3a' }}
                  >
                    <Upload className="w-8 h-8 text-indigo-300" />
                    <div>
                      <p className="text-white font-medium">Choose CSV file</p>
                      <p className="text-gray-500 text-sm mt-1">Click to upload lead data from your computer</p>
                    </div>
                    <input
                      id="csv-upload-input"
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => void handleCsvSelected(e.target.files?.[0] ?? null)}
                    />
                  </label>

                  <div className="rounded-2xl border px-4 py-3" style={{ background: '#13131a', borderColor: '#1f1f2e' }}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-gray-500 text-xs uppercase tracking-wider">Selected file</p>
                      {importFileName ? (
                        <button
                          type="button"
                          onClick={clearCsvSelection}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Remove file
                        </button>
                      ) : null}
                    </div>
                    <p className="text-white text-sm font-medium break-all">{importFileName || 'No file chosen yet'}</p>
                    <p className="text-gray-500 text-xs mt-2">{csvHeaders.length > 0 ? `${csvHeaders.length} columns detected` : 'Upload a CSV to begin mapping columns.'}</p>
                  </div>

                  <div className="rounded-2xl border px-4 py-3 space-y-3" style={{ background: '#13131a', borderColor: '#1f1f2e' }}>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">Column mapping</p>
                    {csvHeaders.length === 0 ? (
                      <p className="text-gray-500 text-sm">No columns to map yet.</p>
                    ) : (
                      csvHeaders.map((header) => (
                        <div key={header} className="space-y-1.5">
                          <label className="block text-xs text-gray-400 truncate">{header}</label>
                          <select
                            value={columnMapping[header] ?? 'skip'}
                            onChange={(e) => {
                              const value = e.target.value as LeadImportField;
                              setColumnMapping((prev) => ({ ...prev, [header]: value }));
                            }}
                            className="w-full rounded-xl border px-3 py-2 text-sm text-white focus:outline-none"
                            style={{ background: '#0d0d14', borderColor: '#2a2a3a' }}
                          >
                            {IMPORTABLE_FIELDS.map((field) => (
                              <option key={field.value} value={field.value}>
                                {field.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="p-5 flex flex-col min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h4 className="text-white font-semibold">Preview</h4>
                      <p className="text-gray-500 text-sm">Review the first few rows before importing.</p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {csvPreviewRows.length > 0 ? `${csvPreviewRows.length} preview row${csvPreviewRows.length === 1 ? '' : 's'}` : 'No rows loaded'}
                    </div>
                  </div>

                  {importError ? (
                    <div className="mb-4 rounded-xl border px-4 py-3 text-sm text-rose-300" style={{ background: '#2a1117', borderColor: '#5a1f2b' }}>
                      {importError}
                    </div>
                  ) : null}

                  {importSuccess ? (
                    <div className="mb-4 rounded-xl border px-4 py-3 text-sm text-emerald-300" style={{ background: '#0f2218', borderColor: '#1d5134' }}>
                      {importSuccess}
                    </div>
                  ) : null}

                  <div className="flex-1 min-h-0 rounded-2xl border overflow-hidden" style={{ borderColor: '#1f1f2e' }}>
                    {csvHeaders.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center px-6" style={{ background: '#0d0d14' }}>
                        <div>
                          <FileSpreadsheet className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">Upload a CSV file to preview lead rows here.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-auto h-full" style={{ background: '#0d0d14' }}>
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr style={{ background: '#13131a' }}>
                              {csvHeaders.map((header) => (
                                <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 border-b whitespace-nowrap" style={{ borderColor: '#1f1f2e' }}>
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreviewRows.map((row, rowIndex) => (
                              <tr key={rowIndex} className="border-b last:border-b-0" style={{ borderColor: '#1f1f2e' }}>
                                {csvHeaders.map((header) => (
                                  <td key={`${rowIndex}-${header}`} className="px-4 py-3 text-gray-200 whitespace-nowrap">
                                    {row[header] || <span className="text-gray-600">—</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">Mapped columns set to “Do not import” will be ignored.</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowImportModal(false)}
                        className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => void handleImportLeads()}
                        disabled={importing}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
                        style={{ background: '#4f46e5' }}
                      >
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
      {crmModal}
    </div>
  );
}
