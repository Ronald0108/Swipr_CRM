/**
 * Universal CRM Adapter Interface
 *
 * Every CRM integration (HubSpot, Salesforce, Pipedrive, Zoho, etc.)
 * implements this interface. The rest of the system is provider-agnostic.
 */

export type CrmProvider = 'hubspot' | 'salesforce' | 'pipedrive' | 'zoho';

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  scope?: string;
}

export interface CrmIdentity {
  portalId: string;
  accountName: string;
  email?: string;
}

export interface CrmContact {
  externalId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  location: string;
  source: string;
  notes: string;
  status: string;
  updatedAt: string | null;
}

export interface SyncCounts {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface SyncResult extends SyncCounts {
  errors: string[];
}

export interface LeadPayload {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  location: string;
  source: string;
  notes: string;
  status: string;
  industry: string;
}

/**
 * The universal CRM adapter contract.
 * Each CRM provider implements this interface.
 */
export interface CrmAdapter {
  readonly provider: CrmProvider;

  /** Build the OAuth authorization URL for this CRM */
  getAuthUrl(state: string, redirectUri: string): string;

  /** Exchange an authorization code for access + refresh tokens */
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenSet>;

  /** Get a valid access token, refreshing if needed */
  getAccessToken(connectionId: string): Promise<string>;

  /** Fetch the account identity (portal name, etc.) */
  getIdentity(accessToken: string): Promise<CrmIdentity>;

  /** Fetch all contacts from this CRM */
  fetchContacts(accessToken: string): Promise<CrmContact[]>;

  /** Push leads to this CRM, creating or updating as needed */
  pushContacts(accessToken: string, leads: LeadPayload[], userId: string): Promise<SyncResult>;
}

/**
 * Convert a CrmContact to a Supabase leads-table insert payload.
 */
export function crmContactToLeadPayload(contact: CrmContact, userId: string, provider: CrmProvider) {
  const name = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();

  return {
    user_id: userId,
    name,
    title: contact.title || '',
    company: contact.company || '',
    industry: '',
    phone: contact.phone || '',
    email: contact.email || '',
    score: 0,
    status: normalizeSwiprStatus(contact.status),
    notes: contact.notes || '',
    source: contact.source || capitalizeProvider(provider),
    location: contact.location || '',
    timezone: '',
    tags: [capitalizeProvider(provider)],
    last_contact: '',
    crm_source: provider,
    crm_external_id: contact.externalId,
    crm_remote_updated_at: contact.updatedAt,
    crm_last_synced_at: new Date().toISOString(),
  };
}

function normalizeSwiprStatus(status: string | null | undefined): string {
  if (status === 'new' || status === 'connected' || status === 'voicemail' || status === 'lost' || status === 'qualified') {
    return status;
  }
  return 'new';
}

function capitalizeProvider(provider: CrmProvider): string {
  const names: Record<CrmProvider, string> = {
    hubspot: 'HubSpot',
    salesforce: 'Salesforce',
    pipedrive: 'Pipedrive',
    zoho: 'Zoho',
  };
  return names[provider];
}

/**
 * Registry of CRM adapters. Import and register adapters here.
 */
const adapterRegistry = new Map<CrmProvider, () => CrmAdapter>();

export function registerCrmAdapter(provider: CrmProvider, factory: () => CrmAdapter) {
  adapterRegistry.set(provider, factory);
}

export function getCrmAdapter(provider: CrmProvider): CrmAdapter {
  const factory = adapterRegistry.get(provider);
  if (!factory) throw new Error(`No CRM adapter registered for provider: ${provider}`);
  return factory();
}
