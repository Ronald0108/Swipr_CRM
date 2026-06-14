import type { BillingPlan } from '../_shared/stripe.ts';
import {
  formBody,
  getAuthenticatedUser,
  getPriceIdForPlan,
  jsonResponse,
  optionsResponse,
  requireEnv,
  stripeRequest,
} from '../_shared/stripe.ts';

type StripeCustomer = {
  id: string;
};

type StripeCheckoutSession = {
  url: string | null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const plan = body.plan as BillingPlan;
    if (plan !== 'individual' && plan !== 'team') throw new Error('Choose an Individual or Team plan.');

    const { data: profile, error: profileError } = await supabase
      .from('billing_profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    let stripeCustomerId = profile?.stripe_customer_id as string | undefined;
    if (!stripeCustomerId) {
      const customer = await stripeRequest<StripeCustomer>('/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody({
          email: user.email,
          'metadata[user_id]': user.id,
        }),
      });
      stripeCustomerId = customer.id;

      const { error } = await supabase
        .from('billing_profiles')
        .upsert({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          plan: 'free',
          status: 'free',
        }, { onConflict: 'user_id' });
      if (error) throw error;
    }

    const appOrigin = requireEnv('APP_ORIGIN');
    const session = await stripeRequest<StripeCheckoutSession>('/checkout/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody({
        mode: 'subscription',
        customer: stripeCustomerId,
        client_reference_id: user.id,
        success_url: `${appOrigin}?billing=success`,
        cancel_url: `${appOrigin}?billing=cancelled`,
        allow_promotion_codes: true,
        'line_items[0][price]': getPriceIdForPlan(plan),
        'line_items[0][quantity]': 1,
        'metadata[user_id]': user.id,
        'metadata[plan]': plan,
        'subscription_data[metadata][user_id]': user.id,
        'subscription_data[metadata][plan]': plan,
      }),
    });

    if (!session.url) throw new Error('Stripe did not return a Checkout URL.');
    return jsonResponse({ url: session.url });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Failed to create Checkout session.' }, 400);
  }
});
