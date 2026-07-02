import {
  getAuthenticatedUser,
  getHubSpotScopes,
  jsonResponse,
  optionsResponse,
  requireEnv,
} from "../_shared/hubspot.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const body =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabase.from("crm_oauth_states").insert({
      state,
      user_id: user.id,
      organization_id: body.organizationId,
      provider: "hubspot",
      redirect_to: body.redirectTo ?? null,
      expires_at: expiresAt,
    });
    if (error) throw error;

    const callbackBase =
      body.redirectTo ??
      Deno.env.get("APP_ORIGIN") ??
      Deno.env.get("SITE_URL") ??
      "http://localhost:3000";
    const callbackUri = new URL(
      "/api/auth/callback/hubspot",
      callbackBase,
    ).toString();

    const params = new URLSearchParams({
      client_id: requireEnv("HUBSPOT_CLIENT_ID"),
      redirect_uri: callbackUri,
      scope: getHubSpotScopes().join(" "),
      state,
    });

    return jsonResponse({
      authUrl: `https://app.hubspot.com/oauth/authorize?${params.toString()}`,
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to start HubSpot OAuth.",
      },
      400,
    );
  }
});
