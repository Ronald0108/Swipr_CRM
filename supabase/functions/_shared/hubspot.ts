import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export type SyncCounts = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};

export type SyncResult = SyncCounts & {
  errors: string[];
};

type HubSpotContact = {
  id: string;
  properties: Record<string, string | null>;
  updatedAt?: string;
};

const CUSTOM_CONTACT_PROPERTIES = {
  location: "swipr_location",
  source: "swipr_source",
  notes: "swipr_notes",
  status: "swipr_status",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function optionsResponse() {
  return new Response("ok", { headers: corsHeaders });
}

export function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey)
    throw new Error("Missing Supabase function environment.");
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function getAuthenticatedUser(req: Request) {
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Missing authorization token.");

  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid authorization token.");

  return { supabase, user: data.user, authorization };
}

export function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function getTokenEncryptionKey() {
  const secret =
    Deno.env.get("HUBSPOT_TOKEN_ENCRYPTION_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret)
    throw new Error(
      "Missing HUBSPOT_TOKEN_ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY.",
    );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  return await crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptToken(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getTokenEncryptionKey();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptToken(ciphertext: string, iv: string) {
  const key = await getTokenEncryptionKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );

  return new TextDecoder().decode(plaintext);
}

export function getHubSpotScopes() {
  return ["crm.objects.contacts.read", "crm.objects.contacts.write"];
}

/**
 * Exchange an authorization code for HubSpot tokens.
 * @param code  The authorization code from the OAuth callback.
 * @param redirectUri  The exact redirect_uri that was used in the authorize URL.
 *                     This MUST match or HubSpot will reject the exchange.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
) {
  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: requireEnv("HUBSPOT_CLIENT_ID"),
      client_secret: requireEnv("HUBSPOT_CLIENT_SECRET"),
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!response.ok)
    throw new Error(`HubSpot token exchange failed: ${await response.text()}`);
  return await response.json();
}

export async function refreshHubSpotToken(connectionId: string) {
  const supabase = getAdminClient();
  const { data: tokenRow, error } = await supabase
    .from("crm_connection_tokens")
    .select("*")
    .eq("connection_id", connectionId)
    .single();

  if (error || !tokenRow) throw new Error("HubSpot token not found.");

  const expiresAt = new Date(tokenRow.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) {
    return await decryptToken(
      tokenRow.access_token_ciphertext,
      tokenRow.access_token_iv,
    );
  }

  const refreshToken = await decryptToken(
    tokenRow.refresh_token_ciphertext,
    tokenRow.refresh_token_iv,
  );

  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: requireEnv("HUBSPOT_CLIENT_ID"),
      client_secret: requireEnv("HUBSPOT_CLIENT_SECRET"),
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok)
    throw new Error(`HubSpot token refresh failed: ${await response.text()}`);
  const refreshed = await response.json();
  const nextExpiresAt = new Date(
    Date.now() + Number(refreshed.expires_in ?? 1800) * 1000,
  ).toISOString();
  const encryptedAccessToken = await encryptToken(refreshed.access_token);
  const encryptedRefreshToken = await encryptToken(
    refreshed.refresh_token ?? refreshToken,
  );

  await supabase
    .from("crm_connection_tokens")
    .update({
      access_token_ciphertext: encryptedAccessToken.ciphertext,
      access_token_iv: encryptedAccessToken.iv,
      refresh_token_ciphertext: encryptedRefreshToken.ciphertext,
      refresh_token_iv: encryptedRefreshToken.iv,
      expires_at: nextExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("connection_id", connectionId);

  await supabase
    .from("crm_connections")
    .update({
      expires_at: nextExpiresAt,
      updated_at: new Date().toISOString(),
      status: "active",
    })
    .eq("id", connectionId);

  return refreshed.access_token as string;
}

export async function getActiveConnection(organizationId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("crm_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider", "hubspot")
    .neq("status", "disconnected")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("HubSpot is not connected.");
  return data;
}

export async function hubspotRequest(
  accessToken: string,
  path: string,
  init: RequestInit = {},
) {
  const response = await fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok)
    throw new Error(
      `HubSpot request failed: ${response.status} ${await response.text()}`,
    );
  if (response.status === 204) return null;
  return await response.json();
}

export async function getHubSpotIdentity(accessToken: string) {
  const response = await fetch(
    `https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`,
  );
  if (!response.ok)
    throw new Error(`HubSpot identity lookup failed: ${await response.text()}`);
  return await response.json();
}

export function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: "", lastname: "" };
  if (parts.length === 1) return { firstname: parts[0], lastname: "" };
  return {
    firstname: parts.slice(0, -1).join(" "),
    lastname: parts[parts.length - 1],
  };
}

function normalizeSwiprStatus(status: string | null | undefined) {
  if (
    status === "new" ||
    status === "connected" ||
    status === "voicemail" ||
    status === "lost" ||
    status === "qualified"
  ) {
    return status;
  }
  return "new";
}

export function hubspotContactToLeadPayload(
  contact: HubSpotContact,
  organizationId: string,
  userId: string,
) {
  const properties = contact.properties ?? {};
  const name = [properties.firstname, properties.lastname]
    .filter(Boolean)
    .join(" ")
    .trim();
  const remoteUpdatedAt =
    contact.updatedAt ?? properties.lastmodifieddate ?? null;

  return {
    organization_id: organizationId,
    user_id: userId,
    name,
    title: properties.jobtitle ?? "",
    company: properties.company ?? "",
    industry: "",
    phone: properties.phone ?? "",
    email: properties.email ?? "",
    score: 0,
    status: normalizeSwiprStatus(properties[CUSTOM_CONTACT_PROPERTIES.status]),
    notes: properties[CUSTOM_CONTACT_PROPERTIES.notes] ?? "",
    source: properties[CUSTOM_CONTACT_PROPERTIES.source] ?? "HubSpot",
    location:
      properties[CUSTOM_CONTACT_PROPERTIES.location] ??
      [properties.city, properties.state, properties.country]
        .filter(Boolean)
        .join(", "),
    timezone: "",
    tags: ["HubSpot"],
    last_contact: "",
    crm_source: "hubspot",
    crm_external_id: contact.id,
    crm_remote_updated_at: remoteUpdatedAt,
    crm_last_synced_at: new Date().toISOString(),
  };
}

export async function fetchHubSpotContactPropertyNames(accessToken: string) {
  const body = await hubspotRequest(accessToken, "/crm/v3/properties/contacts");
  return new Set<string>(
    (body.results ?? []).map((property: { name: string }) => property.name),
  );
}

export function leadToHubSpotProperties(
  lead: Record<string, unknown>,
  availableProperties: Set<string>,
) {
  const { firstname, lastname } = splitName(String(lead.name ?? ""));
  const properties: Record<string, string> = {
    firstname,
    lastname,
    email: String(lead.email ?? ""),
    phone: String(lead.phone ?? ""),
    company: String(lead.company ?? ""),
    jobtitle: String(lead.title ?? ""),
  };

  if (availableProperties.has(CUSTOM_CONTACT_PROPERTIES.location)) {
    properties[CUSTOM_CONTACT_PROPERTIES.location] = String(
      lead.location ?? "",
    );
  }
  if (availableProperties.has(CUSTOM_CONTACT_PROPERTIES.source)) {
    properties[CUSTOM_CONTACT_PROPERTIES.source] = String(lead.source ?? "");
  }
  if (availableProperties.has(CUSTOM_CONTACT_PROPERTIES.notes)) {
    properties[CUSTOM_CONTACT_PROPERTIES.notes] = String(lead.notes ?? "");
  }
  if (availableProperties.has(CUSTOM_CONTACT_PROPERTIES.status)) {
    properties[CUSTOM_CONTACT_PROPERTIES.status] = String(lead.status ?? "");
  }

  return properties;
}

export async function fetchAllHubSpotContacts(
  accessToken: string,
  availableProperties = new Set<string>(),
) {
  const contacts: HubSpotContact[] = [];
  let after: string | undefined;
  const properties = [
    "email",
    "firstname",
    "lastname",
    "phone",
    "company",
    "jobtitle",
    "city",
    "state",
    "country",
    "lastmodifieddate",
  ];
  Object.values(CUSTOM_CONTACT_PROPERTIES).forEach((propertyName) => {
    if (availableProperties.has(propertyName)) properties.push(propertyName);
  });

  do {
    const params = new URLSearchParams({
      limit: "100",
      properties: properties.join(","),
    });
    if (after) params.set("after", after);

    const body = await hubspotRequest(
      accessToken,
      `/crm/v3/objects/contacts?${params.toString()}`,
    );
    contacts.push(...(body.results ?? []));
    after = body.paging?.next?.after;
  } while (after);

  return contacts;
}

export async function createSyncRun(
  userId: string,
  organizationId: string,
  connectionId: string,
  operation: "import" | "export" | "sync",
) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("crm_sync_runs")
    .insert({
      user_id: userId,
      organization_id: organizationId,
      connection_id: connectionId,
      provider: "hubspot",
      operation,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function finishSyncRun(
  runId: string,
  result: SyncResult,
  status: "success" | "error" = "success",
) {
  const supabase = getAdminClient();
  await supabase
    .from("crm_sync_runs")
    .update({
      status,
      created_count: result.created,
      updated_count: result.updated,
      skipped_count: result.skipped,
      failed_count: result.failed,
      errors: result.errors,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

export async function updateConnectionSyncTime(connectionId: string) {
  const supabase = getAdminClient();
  await supabase
    .from("crm_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "active",
    })
    .eq("id", connectionId);
}
