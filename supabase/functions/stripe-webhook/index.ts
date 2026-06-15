import type { BillingPlan, BillingStatus } from '../_shared/stripe.ts';
import {
  findUserIdForStripeCustomer,
  getPlanForPriceId,
  jsonResponse,
  optionsResponse,
  stripeRequest,
  upsertBillingProfile,
  verifyStripeSignature,
} from '../_shared/stripe.ts';

type StripeEvent<T = Record<string, unknown>> = {
  type: string;
  data: {
    object: T;
  };
};

type StripeCheckoutSession = {
  client_reference_id?: string | null;
  customer?: string | null;
  subscription?: string | null;
  metadata?: {
    user_id?: string;
    plan?: BillingPlan;
  } | null;
};

type StripeSubscription = {
  id: string;
  customer: string;
  status: BillingStatus;
  current_period_end?: number | null;
  metadata?: {
    user_id?: string;
    plan?: BillingPlan;
  } | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
};

type StripeInvoice = {
  customer?: string | null;
  subscription?: string | null;
};

async function getSubscription(subscriptionId: string) {
  return await stripeRequest<StripeSubscription>(`/subscriptions/${subscriptionId}`);
}

async function syncSubscription(subscription: StripeSubscription, fallbackUserId?: string | null) {
  const stripeCustomerId = subscription.customer;
  const userId = subscription.metadata?.user_id
    ?? fallbackUserId
    ?? await findUserIdForStripeCustomer(stripeCustomerId);

  if (!userId) throw new Error('No user found for Stripe subscription.');

  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const plan = subscription.metadata?.plan ?? getPlanForPriceId(priceId);

  await upsertBillingProfile({
    userId,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    plan,
    status: subscription.status,
    priceId,
    currentPeriodEnd: subscription.current_period_end ?? null,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  try {
    const payload = await req.text();
    await verifyStripeSignature(payload, req.headers.get('stripe-signature'));

    const event = JSON.parse(payload) as StripeEvent;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as StripeCheckoutSession;
      if (session.subscription) {
        const subscription = await getSubscription(session.subscription);
        await syncSubscription(subscription, session.client_reference_id ?? session.metadata?.user_id ?? null);
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await syncSubscription(event.data.object as StripeSubscription);
    }

    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as StripeInvoice;
      if (invoice.subscription) {
        const subscription = await getSubscription(invoice.subscription);
        await syncSubscription(subscription);
      }
    }

    return jsonResponse({ received: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Stripe webhook failed.' }, 400);
  }
});
