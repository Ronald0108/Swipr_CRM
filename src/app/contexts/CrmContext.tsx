'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { useModals } from './ModalContext';

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

interface CrmContextType {
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
}

const CrmContext = createContext<CrmContextType | null>(null);

type CrmFunctionResponse = {
  authUrl?: string;
  result?: CrmSyncResult;
  error?: string;
};

async function invokeCrmFunction<T extends CrmFunctionResponse>(
  functionName: string,
  accessToken: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase client configuration.');

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({})) as T;
  if (!response.ok) {
    throw new Error(data.error ?? `${functionName} failed with status ${response.status}.`);
  }

  return data;
}

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('useCrm must be used within CrmProvider');
  return ctx;
}

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { fetchLeads } = useLeads();
  const { showCallNoticeMessage } = useModals();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [crmConnection, setCrmConnection] = useState<CrmConnection | null>(null);
  const [crmLastRun, setCrmLastRun] = useState<CrmSyncRun | null>(null);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmAction, setCrmAction] = useState<'connect' | 'import' | 'export' | 'sync' | 'disconnect' | null>(null);
  const [crmError, setCrmError] = useState('');
  const [crmResult, setCrmResult] = useState<CrmSyncResult | null>(null);

  const crmBusy = crmAction !== null || crmLoading;

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
      const data = await invokeCrmFunction('hubspot-oauth-start', session.access_token, { redirectTo: window.location.origin });
      if (!data?.authUrl) throw new Error('HubSpot OAuth URL was not returned.');
      const authUrl = new URL(data.authUrl);
      if (!authUrl.searchParams.get('client_id') || !authUrl.searchParams.get('redirect_uri')) {
        throw new Error('HubSpot OAuth URL is missing client_id or redirect_uri. Check Supabase function secrets.');
      }
      window.location.href = data.authUrl;
    } catch (error) { setCrmError(error instanceof Error ? error.message : 'Failed to connect HubSpot.'); }
    finally { setCrmAction(null); }
  }, [session]);

  const runHubSpotAction = useCallback(async (action: 'import' | 'export' | 'sync' | 'disconnect') => {
    const functionName = { import: 'hubspot-import-contacts', export: 'hubspot-export-contacts', sync: 'hubspot-sync-contacts', disconnect: 'hubspot-disconnect' }[action];
    setCrmAction(action); setCrmError(''); setCrmResult(null);
    try {
      if (!session) throw new Error('You must be logged in to use HubSpot sync.');
      const data = await invokeCrmFunction(functionName, session.access_token);
      setCrmResult((data?.result as CrmSyncResult | undefined) ?? null);
      await loadCrmStatus();
      if (action !== 'disconnect') { await fetchLeads(); } else { setCrmConnection(null); }
    } catch (error) { setCrmError(error instanceof Error ? error.message : `HubSpot ${action} failed.`); }
    finally { setCrmAction(null); }
  }, [fetchLeads, loadCrmStatus, session]);

  useEffect(() => {
    if (session) { void loadCrmStatus(); }
    else { setCrmConnection(null); setCrmLastRun(null); }
  }, [loadCrmStatus, session]);

  useEffect(() => {
    const hubspotStatus = searchParams.get('hubspot');
    if (!hubspotStatus) return;
    if (hubspotStatus === 'connected') { showCallNoticeMessage({ kind: 'success', message: 'HubSpot connected.' }); void loadCrmStatus(); }
    else if (hubspotStatus === 'error') { showCallNoticeMessage({ kind: 'error', message: searchParams.get('message') ?? 'HubSpot connection failed.' }); }
    router.replace(pathname);
  }, [loadCrmStatus, pathname, searchParams, router, showCallNoticeMessage]);

  return (
    <CrmContext.Provider value={{
      crmConnection, crmLastRun, crmLoading, crmAction, crmError, setCrmError, crmResult, crmBusy,
      loadCrmStatus, startHubSpotOAuth, runHubSpotAction
    }}>
      {children}
    </CrmContext.Provider>
  );
}
