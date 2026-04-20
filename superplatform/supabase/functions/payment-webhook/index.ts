// supabase/functions/payment-webhook/index.ts
// Production-hardened webhook handler
// Security: HMAC-SHA512 signature, replay attack prevention via nonce,
// timestamp freshness check, body size limit, structured security logging,
// CORS whitelist, idempotency guard, safe error responses.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? '';
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean);
const MAX_BODY_BYTES = 64 * 1024;        // 64 KB — reject oversized payloads
const MAX_EVENT_AGE_MS = 5 * 60 * 1000;   // 5 minutes — reject stale/replayed events
const IS_DEV = Deno.env.get('DENO_ENV') === 'development';

// ── Security helpers ──────────────────────────────────────────────────────────
function safeHeaders(origin: string | null): Record<string, string> {
    const isAllowed = ALLOWED_ORIGINS.length === 0 || (origin && ALLOWED_ORIGINS.includes(origin));
    return {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        ...(isAllowed && origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    };
}

async function verifyHmac(body: string, signature: string): Promise<boolean> {
    if (!WEBHOOK_SECRET) {
        if (IS_DEV) {
            console.warn('[webhook] ⚠️  WEBHOOK_SECRET not set — skipping signature verification (dev only)');
            return true;
        }
        return false; // In production, always reject if secret is not configured
    }
    try {
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(WEBHOOK_SECRET),
            { name: 'HMAC', hash: 'SHA-512' },
            false,
            ['verify']
        );
        // Support both hex-encoded and raw signatures
        let sigBytes: ArrayBuffer;
        if (/^[0-9a-f]+$/i.test(signature) && signature.length === 128) {
            // Hex-encoded SHA-512 → convert via .buffer to get plain ArrayBuffer
            const arr = new Uint8Array(signature.match(/.{2}/g)!.map(h => parseInt(h, 16)));
            sigBytes = arr.buffer as ArrayBuffer;
        } else {
            const enc = new TextEncoder().encode(signature);
            sigBytes = enc.buffer as ArrayBuffer;
        }
        return await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(body));
    } catch {
        return false;
    }
}

function mapProviderStatus(event: string): 'confirmed' | 'failed' | null {
    const EVENT_MAP: Record<string, 'confirmed' | 'failed'> = {
        'charge.success': 'confirmed',
        'payment.success': 'confirmed',
        'transfer.success': 'confirmed',
        'charge.failed': 'failed',
        'payment.failed': 'failed',
        'transfer.failed': 'failed',
        'charge.reversed': 'failed',
    };
    return EVENT_MAP[event] ?? null;
}

function redact(obj: Record<string, unknown>): Record<string, unknown> {
    const REDACT_KEYS = ['card', 'cvv', 'pan', 'pin', 'secret', 'key', 'token', 'password'];
    return Object.fromEntries(
        Object.entries(obj).map(([k, v]) =>
            REDACT_KEYS.some(r => k.toLowerCase().includes(r)) ? [k, '[REDACTED]'] : [k, v]
        )
    );
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req: Request) => {
    const origin = req.headers.get('origin');
    const h = safeHeaders(origin);

    // 1. Only POST accepted
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: h });
    }

    // 2. Body size guard (prevent OOM via oversized payload)
    const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
    if (contentLength > MAX_BODY_BYTES) {
        return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: h });
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
        return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: h });
    }

    // 3. Signature verification
    const signature = req.headers.get('x-paystack-signature') ?? req.headers.get('x-signature') ?? '';
    const signatureValid = await verifyHmac(rawBody, signature);
    if (!signatureValid) {
        const admin = createClient(SUPABASE_URL, SERVICE_KEY);
        await admin.rpc('log_security_event', {
            p_event_type: 'invalid_webhook_signature',
            p_severity: 'critical',
            p_details: { path: new URL(req.url).pathname, signature_header: signature.slice(0, 16) + '...' },
        }).catch(() => { });
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: h });
    }

    // 4. Parse JSON safely
    let payload: Record<string, unknown>;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: h });
    }

    const event = String(payload.event ?? payload.type ?? 'unknown');
    const payloadData = (payload.data ?? {}) as Record<string, unknown>;
    const reference = String(payloadData.reference ?? payload.reference ?? '');
    const provider = String(payload.provider ?? payload.source ?? 'unknown');
    const eventTs = Number(payloadData.paid_at ?? payload.timestamp ?? 0);

    // 5. Timestamp freshness check (prevent replay attacks with stale events)
    if (eventTs > 0) {
        const ageMs = Date.now() - eventTs * 1000;
        if (ageMs > MAX_EVENT_AGE_MS) {
            const admin = createClient(SUPABASE_URL, SERVICE_KEY);
            await admin.rpc('log_security_event', {
                p_event_type: 'webhook_replay_stale_timestamp',
                p_severity: 'warn',
                p_details: { event, reference, age_seconds: Math.round(ageMs / 1000) },
            }).catch(() => { });
            // Still return 200 to stop provider retrying — this event is genuinely stale
            return new Response(JSON.stringify({ ok: true, note: 'event_too_old' }), { status: 200, headers: h });
        }
    }

    if (!reference) {
        return new Response(JSON.stringify({ ok: true, note: 'no_reference' }), { status: 200, headers: h });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 6. Replay attack prevention — check nonce table
    const nonce = `${provider}:${reference}:${event}`;
    const { error: nonceErr } = await admin
        .from('webhook_nonces')
        .insert({ nonce })
        .select();

    if (nonceErr) {
        // Duplicate key = replay attack
        await admin.rpc('log_security_event', {
            p_event_type: 'webhook_replay_attack',
            p_severity: 'critical',
            p_details: { nonce, event, reference },
        }).catch(() => { });
        // Return 200 to stop provider from retrying a legitimately replayed event
        return new Response(JSON.stringify({ ok: true, note: 'already_processed' }), { status: 200, headers: h });
    }

    // 7. Find payment
    const { data: payment, error: findErr } = await admin
        .from('payments_v2')
        .select('id, status, linked_entity_type, linked_entity_id, user_id, amount')
        .eq('provider_reference', reference)
        .single();

    if (findErr || !payment) {
        console.warn('[webhook] Payment not found for reference:', reference);
        return new Response(JSON.stringify({ ok: true, note: 'payment_not_found' }), { status: 200, headers: h });
    }

    const newStatus = mapProviderStatus(event);
    if (!newStatus) {
        return new Response(JSON.stringify({ ok: true, note: 'event_ignored' }), { status: 200, headers: h });
    }

    // 8. Idempotency — skip if already terminal
    if (['confirmed', 'failed', 'refunded'].includes(payment.status)) {
        return new Response(JSON.stringify({ ok: true, note: 'already_terminal', status: payment.status }), { status: 200, headers: h });
    }

    // 9. Update payment status (DB trigger enforces valid transition)
    const { error: updateErr } = await admin
        .from('payments_v2')
        .update({
            status: newStatus,
            provider,
            provider_meta: redact(payload.data as Record<string, unknown> ?? {}),
            webhook_received_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

    if (updateErr) {
        console.error('[webhook] Update failed:', updateErr.message);
        // Do NOT expose internal error details
        return new Response(JSON.stringify({ error: 'Processing error' }), { status: 500, headers: h });
    }

    // 10. Downstream effects
    if (newStatus === 'confirmed') {
        const tableMap: Record<string, string> = {
            booking: 'bookings', order: 'orders', ride: 'rides',
        };
        const table = tableMap[payment.linked_entity_type];
        if (table) {
            await admin.from(table).update({ payment_status: 'paid' }).eq('id', payment.linked_entity_id).catch(() => { });
        }
        await admin.from('notifications').insert({
            user_id: payment.user_id,
            title: 'Payment Confirmed ✅',
            body: `Your payment was successful.`,
            type: 'payment',
            data: { payment_id: payment.id, entity_type: payment.linked_entity_type },
        }).catch(() => { });
        await admin.rpc('record_metric', { p_name: 'payment_confirmed', p_value: 1, p_labels: { provider } }).catch(() => { });
    } else {
        await admin.from('notifications').insert({
            user_id: payment.user_id,
            title: 'Payment Failed ❌',
            body: 'Your payment could not be processed. Please try again.',
            type: 'payment',
            data: { payment_id: payment.id },
        }).catch(() => { });
        await admin.rpc('enqueue_job', {
            p_type: 'payment_failed_compensation',
            p_payload: { payment_id: payment.id, entity_type: payment.linked_entity_type, entity_id: payment.linked_entity_id },
            p_run_at: new Date().toISOString(),
        }).catch(() => { });
        await admin.rpc('record_metric', { p_name: 'payment_failed', p_value: 1, p_labels: { provider } }).catch(() => { });
    }

    // 11. Audit log — redacted safe version
    await admin.from('audit_log').insert({
        actor_id: null,
        action: `webhook:${event}`,
        table_name: 'payments_v2',
        row_id: payment.id,
        new_val: { status: newStatus, provider },
    }).catch(() => { });

    return new Response(
        JSON.stringify({ ok: true, status: newStatus }),
        { status: 200, headers: h }
    );
});
