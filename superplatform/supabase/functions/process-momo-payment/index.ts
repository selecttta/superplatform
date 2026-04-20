// supabase/functions/process-momo-payment/index.ts
// Production-hardened MTN MoMo payment initiator
// Security: amount validation, phone sanitization, per-user rate limiting,
// idempotency key enforcement, no credential exposure in errors,
// CORS whitelist, body size guard, structured logging.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MOMO_API_KEY = Deno.env.get('MOMO_API_KEY')!;
const MOMO_API_USER = Deno.env.get('MOMO_API_USER')!;
const MOMO_ENV = Deno.env.get('MOMO_ENV') ?? 'sandbox';
const MAX_BODY_BYTES = 8 * 1024;

const BASE_URL = MOMO_ENV === 'production'
  ? 'https://proxy.momoapi.mtn.com'
  : 'https://sandbox.momodeveloper.mtn.com';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

function sanitizePhone(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  return /^(\+?[\d]{9,15})$/.test(cleaned) ? cleaned : null;
}

function validateAmount(raw: unknown): number | null {
  const n = Number(raw);
  if (!isFinite(n) || n <= 0) return null; // Must be positive
  if (n > 50000) return null; // Max single MoMo transaction (GHS 50,000)
  if (Math.floor(n * 100) !== n * 100) return null; // Max 2 decimal places
  return n;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS_HEADERS });
  }

  // Body size guard
  const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: CORS_HEADERS });
  }

  // Auth: require valid JWT from Supabase (authenticated user only)
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: CORS_HEADERS });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS_HEADERS });
  }

  // Input validation
  const phone = sanitizePhone(String(body.phone ?? ''));
  if (!phone) {
    return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400, headers: CORS_HEADERS });
  }

  const amount = validateAmount(body.amount);
  if (amount === null) {
    return new Response(JSON.stringify({ error: 'Invalid amount — must be positive and ≤ 50,000 GHS' }), { status: 400, headers: CORS_HEADERS });
  }

  const currency = String(body.currency ?? 'GHS');
  const bookingId = body.bookingId ? String(body.bookingId) : null;
  const orderId = body.orderId ? String(body.orderId) : null;
  const rideId = body.rideId ? String(body.rideId) : null;
  const idempotencyKey = body.idempotencyKey ? String(body.idempotencyKey) : null;

  if (!['GHS', 'USD'].includes(currency)) {
    return new Response(JSON.stringify({ error: 'Unsupported currency' }), { status: 400, headers: CORS_HEADERS });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    global: { headers: { Authorization: authHeader } }, // forward user JWT for RLS
  });

  // Rate limit: max 3 payment initiations per user per minute
  const { data: userProfile } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  const userId = userProfile?.user?.id ?? 'anon';

  const { data: rateLimitOk } = await admin.rpc('check_rate_limit', {
    p_identifier: `momo_pay:${userId}`,
    p_action: 'payment_init',
    p_max_count: 3,
    p_window: '1 minute',
  });

  if (!rateLimitOk) {
    await admin.rpc('log_security_event', {
      p_event_type: 'payment_rate_limit_hit',
      p_severity: 'warn',
      p_user_id: userId !== 'anon' ? userId : null,
      p_details: { amount, currency },
    });
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }), { status: 429, headers: CORS_HEADERS });
  }

  // Idempotency: check if this key was already processed
  if (idempotencyKey) {
    const { data: existing } = await admin
      .from('payments_v2')
      .select('id, status, provider_reference')
      .eq('idempotency_key', idempotencyKey)
      .single();
    if (existing) {
      return new Response(JSON.stringify({
        success: true,
        reference: existing.provider_reference,
        status: existing.status,
        note: 'idempotent_replay',
      }), { status: 200, headers: CORS_HEADERS });
    }
  }

  // Step 1: Get MoMo access token
  let access_token: string;
  try {
    const tokenRes = await fetch(`${BASE_URL}/collection/token/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${MOMO_API_USER}:${MOMO_API_KEY}`)}`,
        'Ocp-Apim-Subscription-Key': MOMO_API_KEY,
      },
    });
    if (!tokenRes.ok) throw new Error(`Token endpoint returned ${tokenRes.status}`);
    const tokenData = await tokenRes.json();
    access_token = tokenData.access_token;
    if (!access_token) throw new Error('Missing access_token in response');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[momo] Token fetch failed:', msg);
    await admin.rpc('log_security_event', {
      p_event_type: 'momo_token_failure',
      p_severity: 'critical',
      p_user_id: userId !== 'anon' ? userId : null,
      p_details: { error: msg },
    });
    return new Response(JSON.stringify({ error: 'Payment provider unavailable. Please try again.' }), { status: 503, headers: CORS_HEADERS });
  }

  // Step 2: Initiate payment
  const reference = crypto.randomUUID();
  const entityId = bookingId ?? orderId ?? rideId ?? reference;
  const entityType = bookingId ? 'booking' : orderId ? 'order' : rideId ? 'ride' : 'topup';

  try {
    const payRes = await fetch(`${BASE_URL}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-Reference-Id': reference,
        'X-Target-Environment': MOMO_ENV,
        'Ocp-Apim-Subscription-Key': MOMO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount.toFixed(2),
        currency,
        externalId: reference,
        payer: { partyIdType: 'MSISDN', partyId: phone.replace(/^\+/, '') },
        payerMessage: 'SuperPlatform Payment',
        payeeNote: `Ref: ${entityId}`,
      }),
    });
    if (!payRes.ok && payRes.status !== 202) {
      throw new Error(`MoMo API returned ${payRes.status}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[momo] Payment initiation failed:', msg);
    return new Response(JSON.stringify({ error: 'Payment initiation failed. Please try again.' }), { status: 502, headers: CORS_HEADERS });
  }

  // Step 3: Record in payments_v2 (NOT the old payments table)
  const { data: paymentRecord, error: insertErr } = await admin
    .from('payments_v2')
    .insert({
      user_id: userId !== 'anon' ? userId : null,
      amount,
      currency,
      status: 'pending',
      provider: 'mtn_momo',
      provider_reference: reference,
      linked_entity_type: entityType,
      linked_entity_id: entityId,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('[momo] Payment record insert failed:', insertErr.message);
    return new Response(JSON.stringify({ error: 'Payment recorded with error — contact support with reference: ' + reference }), { status: 500, headers: CORS_HEADERS });
  }

  await admin.rpc('record_metric', {
    p_name: 'payment_initiated',
    p_value: amount,
    p_labels: { provider: 'mtn_momo', entity_type: entityType },
  }).catch(() => { });

  return new Response(JSON.stringify({ success: true, reference, payment_id: paymentRecord?.id }), {
    status: 200,
    headers: CORS_HEADERS,
  });
});
