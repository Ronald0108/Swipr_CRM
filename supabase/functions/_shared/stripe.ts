import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export type BillingPlan = 'individual' | 'team';

export type BillingStatus =
  | 'free'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function optionsResponse() {
  return new Response('ok', { headers: corsHeaders });
}

export function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

export function getAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase function environment.');
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function getAuthenticatedUser(req: Request) {
  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Missing authorization token.');

  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid authorization token.');

  return { supabase, user: data.user };
}

export function getPriceIdForPlan(plan: BillingPlan) {
  if (plan === 'individual') return requireEnv('STRIPE_PRICE_INDIVIDUAL');
  if (plan === 'team') return requireEnv('STRIPE_PRICE_TEAM');
  throw new Error('Unsupported billing plan.');
}

export function getPlanForPriceId(priceId: string | null | undefined): BillingPlan | 'free' {
  if (!priceId) return 'free';
  if (priceId === Deno.env.get('STRIPE_PRICE_INDIVIDUAL')) return 'individual';
  if (priceId === Deno.env.get('STRIPE_PRICE_TEAM')) return 'team';
  return 'free';
}

export async function stripeRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireEnv('STRIPE_SECRET_KEY')}`,
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = data?.error?.message ?? text ?? 'Stripe request failed.';
    throw new Error(message);
  }

  return data as T;
}

export function formBody(values: Record<string, string | number | boolean | null | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== null && value !== undefined) params.set(key, String(value));
  });
  return params;
}

export async function upsertBillingProfile(input: {
  organizationId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  plan: BillingPlan | 'free';
  status: BillingStatus;
  priceId?: string | null;
  currentPeriodEnd?: number | null;
}) {
  const supabase = getAdminClient();
  const currentPeriodEnd = input.currentPeriodEnd
    ? new Date(input.currentPeriodEnd * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from('billing_profiles')
    .upsert({
      organization_id: input.organizationId,
      stripe_customer_id: input.stripeCustomerId ?? null,
      stripe_subscription_id: input.stripeSubscriptionId ?? null,
      plan: input.plan,
      status: input.status,
      price_id: input.priceId ?? null,
      current_period_end: currentPeriodEnd,
    }, { onConflict: 'organization_id' });

  if (error) throw error;
}

export async function findOrganizationIdForStripeCustomer(stripeCustomerId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('billing_profiles')
    .select('organization_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (error) throw error;
  return data?.organization_id as string | undefined;
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a[index] ^ b[index];
  }
  return result === 0;
}

export async function verifyStripeSignature(payload: string, signatureHeader: string | null) {
  if (!signatureHeader) throw new Error('Missing Stripe signature.');

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key, value];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) throw new Error('Invalid Stripe signature.');

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(requireEnv('STRIPE_WEBHOOK_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = new Uint8Array(digest);
  const actual = hexToBytes(signature);

  if (!timingSafeEqual(expected, actual)) throw new Error('Invalid Stripe signature.');
}
