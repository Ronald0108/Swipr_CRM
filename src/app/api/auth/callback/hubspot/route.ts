import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment for HubSpot OAuth callback.");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

function getTokenEncryptionSecret() {
  return (
    process.env.HUBSPOT_TOKEN_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function encryptToken(token: string) {
  const secret = getTokenEncryptionSecret();
  if (!secret)
    throw new Error(
      "Missing HUBSPOT_TOKEN_ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY.",
    );

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token),
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function GET(request: Request) {
  const currentUrl = new URL(request.url);
  const { searchParams } = currentUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Fallback origin: use forwarded headers (Vercel/proxies set these),
  // then fall back to the request URL origin.
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const fallbackOrigin = host ? `${proto}://${host}` : currentUrl.origin;

  // This will be updated to the stored redirect_to once we fetch the oauth state.
  let redirectTo = fallbackOrigin;

  if (!code || !state) {
    return NextResponse.json(
      { error: "No code provided by HubSpot" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseClient();

    // ── Step 1: Look up the OAuth state to recover the origin that started the flow ──
    const { data: oauthState, error: stateError } = await supabase
      .from("crm_oauth_states")
      .select("*")
      .eq("state", state)
      .eq("provider", "hubspot")
      .single();

    if (stateError || !oauthState) throw new Error("Invalid OAuth state.");
    if (new Date(oauthState.expires_at).getTime() < Date.now())
      throw new Error("Expired OAuth state.");

    // The origin that initiated the OAuth flow (stored by hubspot-oauth-start).
    // This is what was used to build the authorize URL's redirect_uri, so we
    // MUST use the same value here for the token exchange to succeed.
    redirectTo = oauthState.redirect_to || fallbackOrigin;

    // ── Step 2: Build the redirect_uri to match what was used during authorization ──
    const callbackUri = `${redirectTo}/api/auth/callback/hubspot`;

    // ── Step 3: Exchange the authorization code for tokens ──
    const tokenResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.HUBSPOT_CLIENT_ID!,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
        redirect_uri: callbackUri,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error(
        `Failed to retrieve token from HubSpot: ${JSON.stringify(tokenData)}`,
      );
    }

    // ── Step 4: Fetch the HubSpot identity ──
    const identityResponse = await fetch(
      `https://api.hubapi.com/oauth/v1/access-tokens/${tokenData.access_token}`,
    );
    if (!identityResponse.ok) {
      throw new Error(
        `HubSpot identity lookup failed: ${await identityResponse.text()}`,
      );
    }

    const identity = await identityResponse.json();
    const expiresAt = new Date(
      Date.now() + Number(tokenData.expires_in ?? 1800) * 1000,
    ).toISOString();

    // ── Step 5: Save the connection ──
    const { data: connection, error: connectionError } = await supabase
      .from("crm_connections")
      .upsert(
        {
          organization_id: oauthState.organization_id,
          user_id: oauthState.user_id,
          provider: "hubspot",
          portal_id: String(identity.hub_id ?? identity.hubId ?? ""),
          account_name: identity.hub_domain ?? identity.user ?? "HubSpot",
          status: "active",
          scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write"],
          connected_at: new Date().toISOString(),
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,provider" },
      )
      .select("*")
      .single();

    if (connectionError || !connection)
      throw connectionError ?? new Error("Failed to save HubSpot connection.");

    // ── Step 6: Encrypt and store tokens ──
    const encryptedAccessToken = await encryptToken(tokenData.access_token);
    const encryptedRefreshToken = await encryptToken(
      tokenData.refresh_token ?? tokenData.access_token,
    );

    const { error: tokenError } = await supabase
      .from("crm_connection_tokens")
      .upsert(
        {
          connection_id: connection.id,
          provider: "hubspot",
          access_token_ciphertext: encryptedAccessToken.ciphertext,
          access_token_iv: encryptedAccessToken.iv,
          refresh_token_ciphertext: encryptedRefreshToken.ciphertext,
          refresh_token_iv: encryptedRefreshToken.iv,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "connection_id" },
      );

    return NextResponse.redirect(
      `${redirectTo}?hubspot=connected`,
      302,
    );
  } catch (error) {
    console.error("HubSpot OAuth Error:", error);
    const message = encodeURIComponent(
      error instanceof Error ? error.message : "HubSpot OAuth failed.",
    );
    return NextResponse.redirect(
      `${redirectTo}?hubspot=error&message=${message}`,
      302,
    );
  }
}
