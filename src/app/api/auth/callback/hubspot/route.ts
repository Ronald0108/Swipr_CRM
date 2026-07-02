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
  const appOrigin = currentUrl.origin;
  const callbackUri = `${currentUrl.origin}${currentUrl.pathname}`;
  const { searchParams } = currentUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "No code provided by HubSpot" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseClient();

    const { data: oauthState, error: stateError } = await supabase
      .from("crm_oauth_states")
      .select("*")
      .eq("state", state)
      .eq("provider", "hubspot")
      .single();

    if (stateError || !oauthState) throw new Error("Invalid OAuth state.");
    if (new Date(oauthState.expires_at).getTime() < Date.now())
      throw new Error("Expired OAuth state.");

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
          scopes: [
            "crm.objects.contacts.read",
            "crm.objects.contacts.write",
          ],
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

    if (tokenError) throw tokenError;

    await supabase.from("crm_oauth_states").delete().eq("state", state);

    return NextResponse.redirect(
      `${oauthState.redirect_to ?? appOrigin}?hubspot=connected`,
      302,
    );
  } catch (error) {
    console.error("HubSpot OAuth Error:", error);
    const message = encodeURIComponent(
      error instanceof Error ? error.message : "HubSpot OAuth failed.",
    );
    return NextResponse.redirect(
      `${appOrigin}?hubspot=error&message=${message}`,
      302,
    );
  }
}
