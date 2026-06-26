import {
  formBody,
  getAuthenticatedUser,
  jsonResponse,
  optionsResponse,
  requireEnv,
  stripeRequest,
} from '../_shared/stripe.ts';

type StripePortalSession = {
  url: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const organizationId = body.organizationId;
    
    if (!organizationId) throw new Error('Missing organizationId');

    const { data: profile, error } = await supabase
      .from('billing_profiles')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw error;
    if (!profile?.stripe_customer_id) throw new Error('No Stripe billing profile found for this account.');

    const session = await stripeRequest<StripePortalSession>('/billing_portal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody({
        customer: profile.stripe_customer_id,
        return_url: requireEnv('APP_ORIGIN'),
      }),
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Failed to open billing portal.' }, 400);
  }
});
