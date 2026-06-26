'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { useModals } from './ModalContext';
import { useOrganization } from './OrganizationContext';

export type CrmProvider = 'hubspot' | 'salesforce' | 'pipedrive' | 'zoho';

export interface CrmConnection {
  id: string;
  provider: CrmProvider;
  portal_id: string | null;
  account_name: string | null;
  status: 'active' | 'error' | 'disconnected';
  connected_at: string;
  last_synced_at: string | null;
}

export interface CrmSyncRun {
  id: string;
  provider: CrmProvider;
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

/** Provider display metadata */
export const CRM_PROVIDER_INFO: Record<CrmProvider, {
  label: string;
  description: string;
  gradient: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  available: boolean;
}> = {
  hubspot: {
    label: 'HubSpot',
    description: 'Sync contacts with your HubSpot CRM account.',
    gradient: 'from-orange-500 to-rose-500',
    accentColor: '#FF7A59',
    bgColor: 'rgba(255, 122, 89, 0.08)',
    borderColor: 'rgba(255, 122, 89, 0.25)',
    available: true,
  },
  salesforce: {
    label: 'Salesforce',
    description: 'Connect your Salesforce org to sync contacts.',
    gradient: 'from-blue-500 to-cyan-500',
    accentColor: '#00A1E0',
    bgColor: 'rgba(0, 161, 224, 0.08)',
    borderColor: 'rgba(0, 161, 224, 0.25)',
    available: true,
  },
  pipedrive: {
    label: 'Pipedrive',
    description: 'Pull and push contacts from Pipedrive.',
    gradient: 'from-emerald-500 to-green-500',
    accentColor: '#017737',
    bgColor: 'rgba(1, 119, 55, 0.08)',
    borderColor: 'rgba(1, 119, 55, 0.25)',
    available: false,
  },
  zoho: {
    label: 'Zoho CRM',
    description: 'Integrate with your Zoho CRM workspace.',
    gradient: 'from-red-500 to-yellow-500',
    accentColor: '#E42527',
    bgColor: 'rgba(228, 37, 39, 0.08)',
    borderColor: 'rgba(228, 37, 39, 0.25)',
    available: false,
  },
};

interface CrmContextType {
  // Multi-CRM connections
  connections: CrmConnection[];
  syncRuns: Record<string, CrmSyncRun | null>; // keyed by provider
  crmLoading: boolean;
  crmAction: 'connect' | 'import' | 'export' | 'sync' | 'disconnect' | null;
  crmActionProvider: CrmProvider | null;
  crmError: string;
  setCrmError: (v: string) => void;
  crmResult: CrmSyncResult | null;
  crmBusy: boolean;

  // Generic actions
  loadCrmStatus: () => Promise<void>;
  startOAuth: (provider: CrmProvider) => Promise<void>;
  runCrmAction: (provider: CrmProvider, action: 'import' | 'export' | 'sync' | 'disconnect') => Promise<void>;
  getConnection: (provider: CrmProvider) => CrmConnection | null;

  // Backward compatibility aliases
  crmConnection: CrmConnection | null;
  crmLastRun: CrmSyncRun | null;
  startHubSpotOAuth: () => Promise<void>;
  runHubSpotAction: (action: 'import' | 'export' | 'sync' | 'disconnect') => Promise<void>;

  // Modal state
  showCrmModal: boolean;
  setShowCrmModal: (v: boolean) => void;
}

const CrmContext = createContext<CrmContextType | null>(null);

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('useCrm must be used within CrmProvider');
  return ctx;
}

/** Edge function name mapping per provider */
const EDGE_FUNCTION_MAP: Record<CrmProvider, Record<string, string>> = {
  hubspot: {
    'oauth-start': 'hubspot-oauth-start',
    import: 'hubspot-import-contacts',
    export: 'hubspot-export-contacts',
    sync: 'hubspot-sync-contacts',
    disconnect: 'hubspot-disconnect',
  },
  salesforce: {
    'oauth-start': 'salesforce-oauth-start',
    import: 'salesforce-import-contacts',
    export: 'salesforce-export-contacts',
    sync: 'salesforce-sync-contacts',
    disconnect: 'salesforce-disconnect',
  },
  pipedrive: {},
  zoho: {},
};

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { activeOrganization } = useOrganization();
  const { fetchLeads } = useLeads();
  const { showCallNoticeMessage } = useModals();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [connections, setConnections] = useState<CrmConnection[]>([]);
  const [syncRuns, setSyncRuns] = useState<Record<string, CrmSyncRun | null>>({});
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmAction, setCrmAction] = useState<'connect' | 'import' | 'export' | 'sync' | 'disconnect' | null>(null);
  const [crmActionProvider, setCrmActionProvider] = useState<CrmProvider | null>(null);
  const [crmError, setCrmError] = useState('');
  const [crmResult, setCrmResult] = useState<CrmSyncResult | null>(null);
  const [showCrmModal, setShowCrmModal] = useState(false);

  const crmBusy = crmAction !== null || crmLoading;

  const getConnection = useCallback((provider: CrmProvider) => {
    return connections.find(c => c.provider === provider) ?? null;
  }, [connections]);

  // Backward compatibility
  const crmConnection = getConnection('hubspot');
  const crmLastRun = syncRuns['hubspot'] ?? null;

  const loadCrmStatus = useCallback(async () => {
    if (!session || !activeOrganization) { setConnections([]); setSyncRuns({}); return; }
    setCrmLoading(true);
    try {
      // Fetch ALL active connections (not just hubspot)
      const { data: allConnections, error: connectionError } = await supabase
        .from('crm_connections')
        .select('id, provider, portal_id, account_name, status, connected_at, last_synced_at')
        .eq('organization_id', activeOrganization.id)
        .neq('status', 'disconnected');

      if (connectionError) throw connectionError;
      setConnections((allConnections as CrmConnection[]) ?? []);

      // Fetch latest sync run per provider
      const runs: Record<string, CrmSyncRun | null> = {};
      for (const conn of (allConnections ?? [])) {
        const { data: syncRun, error: syncRunError } = await supabase
          .from('crm_sync_runs')
          .select('id, provider, operation, status, created_count, updated_count, skipped_count, failed_count, errors, started_at, finished_at')
          .eq('organization_id', activeOrganization.id)
          .eq('provider', conn.provider)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!syncRunError) {
          runs[conn.provider] = (syncRun as CrmSyncRun | null) ?? null;
        }
      }
      setSyncRuns(runs);
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Failed to load CRM status.');
    } finally {
      setCrmLoading(false);
    }
  }, [session, activeOrganization]);

  const startOAuth = useCallback(async (provider: CrmProvider) => {
    if (!session || !activeOrganization) return;
    const functionName = EDGE_FUNCTION_MAP[provider]?.['oauth-start'];
    if (!functionName) { setCrmError(`OAuth not available for ${provider}.`); return; }

    setCrmAction('connect');
    setCrmActionProvider(provider);
    setCrmError('');
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { redirectTo: window.location.origin, organizationId: activeOrganization.id },
      });
      if (error) throw error;
      if (!data?.authUrl) throw new Error(`${provider} OAuth URL was not returned.`);
      window.location.href = data.authUrl;
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : `Failed to connect ${provider}.`);
    } finally {
      setCrmAction(null);
      setCrmActionProvider(null);
    }
  }, [session, activeOrganization]);

  const startHubSpotOAuth = useCallback(() => startOAuth('hubspot'), [startOAuth]);

  const runCrmAction = useCallback(async (provider: CrmProvider, action: 'import' | 'export' | 'sync' | 'disconnect') => {
    const functionName = EDGE_FUNCTION_MAP[provider]?.[action];
    if (!functionName || !activeOrganization) { setCrmError(`Action "${action}" not available for ${provider}.`); return; }

    setCrmAction(action);
    setCrmActionProvider(provider);
    setCrmError('');
    setCrmResult(null);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body: { organizationId: activeOrganization.id } });
      if (error) throw error;
      setCrmResult((data?.result as CrmSyncResult | undefined) ?? null);
      await loadCrmStatus();
      if (action !== 'disconnect') {
        await fetchLeads();
      } else {
        setConnections(prev => prev.filter(c => c.provider !== provider));
      }
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : `${provider} ${action} failed.`);
    } finally {
      setCrmAction(null);
      setCrmActionProvider(null);
    }
  }, [fetchLeads, loadCrmStatus, activeOrganization]);

  const runHubSpotAction = useCallback(
    (action: 'import' | 'export' | 'sync' | 'disconnect') => runCrmAction('hubspot', action),
    [runCrmAction]
  );

  // Load CRM status on session change
  useEffect(() => {
    if (session && activeOrganization) { void loadCrmStatus(); }
    else { setConnections([]); setSyncRuns({}); }
  }, [loadCrmStatus, session, activeOrganization]);

  // Handle OAuth callback query params
  useEffect(() => {
    const providers: CrmProvider[] = ['hubspot', 'salesforce'];
    for (const provider of providers) {
      const status = searchParams.get(provider);
      if (!status) continue;
      if (status === 'connected') {
        showCallNoticeMessage({ kind: 'success', message: `${CRM_PROVIDER_INFO[provider].label} connected.` });
        void loadCrmStatus();
      } else if (status === 'error') {
        showCallNoticeMessage({ kind: 'error', message: searchParams.get('message') ?? `${CRM_PROVIDER_INFO[provider].label} connection failed.` });
      }
      router.replace(pathname);
      break;
    }
  }, [loadCrmStatus, pathname, searchParams, router, showCallNoticeMessage]);

  return (
    <CrmContext.Provider value={{
      connections, syncRuns, crmLoading, crmAction, crmActionProvider, crmError, setCrmError, crmResult, crmBusy,
      loadCrmStatus, startOAuth, runCrmAction, getConnection,
      crmConnection, crmLastRun, startHubSpotOAuth, runHubSpotAction,
      showCrmModal, setShowCrmModal,
    }}>
      {children}
    </CrmContext.Provider>
  );
}
