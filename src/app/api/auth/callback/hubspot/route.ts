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

  // Derive the origin from reverse-proxy headers (Vercel sets these).
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const fallbackOrigin = host ? `${proto}://${host}` : currentUrl.origin;

  // Will be refined to the stored origin once we look up the oauth state.
  let redirectTo = fallbackOrigin;

  console.log("[HubSpot OAuth] Callback hit", {
    fallbackOrigin,
    hasCode: !!code,
    hasState: !!state,
  });

  if (!code || !state) {
    return NextResponse.json(
      { error: "No code provided by HubSpot" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseClient();

    // ── Step 1: Look up the OAuth state ──────────────────────────────────
    const { data: oauthState, error: stateError } = await supabase
      .from("crm_oauth_states")
      .select("*")
      .eq("state", state)
      .eq("provider", "hubspot")
      .single();

    if (stateError || !oauthState) {
      console.error("[HubSpot OAuth] State lookup failed", { stateError });
      throw new Error("Invalid OAuth state.");
    }
    if (new Date(oauthState.expires_at).getTime() < Date.now()) {
      throw new Error("Expired OAuth state.");
    }

    // Recover the origin that initiated the OAuth flow.
    redirectTo = oauthState.redirect_to || fallbackOrigin;

    console.log("[HubSpot OAuth] State resolved", {
      storedRedirectTo: oauthState.redirect_to,
      resolvedRedirectTo: redirectTo,
      organizationId: oauthState.organization_id,
    });

    // ── Step 2: Build the redirect_uri that matches the authorize URL ──
    const callbackUri = `${redirectTo}/api/auth/callback/hubspot`;

    console.log("[HubSpot OAuth] Exchanging code", { callbackUri });

    // ── Step 3: Exchange the authorization code for tokens ────────────
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
      console.error("[HubSpot OAuth] Token exchange failed", {
        status: tokenResponse.status,
        tokenData,
        callbackUri,
      });
      throw new Error(
        `Failed to retrieve token from HubSpot: ${JSON.stringify(tokenData)}`,
      );
    }

    console.log("[HubSpot OAuth] Token exchange succeeded");

    // ── Step 4: Fetch the HubSpot identity ───────────────────────────
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

    // ── Step 5: Save the connection ──────────────────────────────────
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

    // ── Step 6: Encrypt and store tokens ─────────────────────────────
    const encryptedAccessToken = await encryptToken(tokenData.access_token);
    const encryptedRefreshToken = await encryptToken(
      tokenData.refresh_token ?? tokenData.access_token,
    );

    await supabase
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

    // Clean up the used state
    await supabase.from("crm_oauth_states").delete().eq("state", state);

    console.log("[HubSpot OAuth] Success — redirecting to", redirectTo);

    return NextResponse.redirect(
      `${redirectTo}/dashboard?hubspot=connected`,
      302,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("[HubSpot OAuth] Error:", errorMessage, error);
    const message = encodeURIComponent(errorMessage || "HubSpot OAuth failed.");
    return NextResponse.redirect(
      `${redirectTo}/dashboard?hubspot=error&message=${message}`,
      302,
    );
  }
}

