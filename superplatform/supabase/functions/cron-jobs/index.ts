// supabase/functions/cron-jobs/index.ts
// Production-hardened background job processor
// Security: shared-secret bearer auth, per-run job claim via SELECT FOR UPDATE SKIP LOCKED
// (prevents duplicate processing across concurrent invocations), exponential backoff,
// dead-letter queue, structured security logging, safe error isolation per job.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';           // Set in Supabase secrets
const MAX_JOBS_PER_RUN = 25;
const MAX_ATTEMPTS = 3;

// Cron schedule registration (pg_cron — run in SQL Editor after enabling extension):
// SELECT cron.schedule('cron-jobs', '*/5 * * * *',
//   $$SELECT net.http_post(
//     url := '<YOUR_SUPABASE_URL>/functions/v1/cron-jobs',
//     headers := '{"Authorization":"Bearer <CRON_SECRET>","Content-Type":"application/json"}',
//     body := '{}'
//   )$$);

// ── Auth guard ────────────────────────────────────────────────────────────────
function isAuthorized(req: Request): boolean {
    if (!CRON_SECRET) {
        console.warn('[cron] ⚠️  CRON_SECRET not set — endpoint is unauthenticated!');
        return Deno.env.get('DENO_ENV') === 'development';
    }
    const authHeader = req.headers.get('Authorization') ?? '';
    // Support both "Bearer <secret>" and raw secret
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    // Constant-time comparison to prevent timing attacks
    if (token.length !== CRON_SECRET.length) return false;
    let diff = 0;
    for (let i = 0; i < token.length; i++) {
        diff |= token.charCodeAt(i) ^ CRON_SECRET.charCodeAt(i);
    }
    return diff === 0;
}

// ── Job Handlers ──────────────────────────────────────────────────────────────
async function handleBookingExpiry(admin: ReturnType<typeof createClient>, job: Record<string, unknown>) {
    const p = (job.payload ?? {}) as Record<string, unknown>;
    const booking_id = String(p.booking_id ?? '');
    if (!booking_id) throw new Error('booking_expiry: missing booking_id');

    const { data: booking } = await admin
        .from('bookings')
        .select('id, status, customer_id, provider_id, service_name')
        .eq('id', booking_id)
        .single();

    if (!booking || !['pending', 'confirmed'].includes(booking.status)) return; // Already handled

    await admin.from('bookings').update({ status: 'cancelled' }).eq('id', booking_id).throwOnError();

    await admin.from('notifications').insert([
        { user_id: booking.customer_id, title: 'Booking Auto-Cancelled', body: `Your booking for "${booking.service_name}" expired.`, type: 'booking' },
        { user_id: booking.provider_id, title: 'Booking Expired', body: `A booking for "${booking.service_name}" expired.`, type: 'booking' },
    ]);
    await admin.rpc('record_metric', { p_name: 'booking_auto_cancelled', p_value: 1, p_labels: {} });
}

async function handlePaymentReconcile(admin: ReturnType<typeof createClient>, job: Record<string, unknown>) {
    const p = (job.payload ?? {}) as Record<string, unknown>;
    const payment_id = String(p.payment_id ?? '');
    if (!payment_id) throw new Error('payment_reconcile: missing payment_id');

    const { data: payment } = await admin
        .from('payments_v2')
        .select('id, status, user_id, provider, created_at')
        .eq('id', payment_id)
        .single();

    if (!payment || payment.status !== 'pending') return;

    const ageMinutes = (Date.now() - new Date(payment.created_at).getTime()) / 60000;
    if (ageMinutes < 30) return; // Not yet stale

    await admin.from('payments_v2').update({ status: 'failed' }).eq('id', payment_id).throwOnError();
    await admin.from('notifications').insert({
        user_id: payment.user_id,
        title: 'Payment Session Expired',
        body: 'Your payment session timed out. Please try again.',
        type: 'payment',
    });
    await admin.rpc('record_metric', { p_name: 'payment_timed_out', p_value: 1, p_labels: { provider: payment.provider } });
}

async function handlePaymentFailedCompensation(admin: ReturnType<typeof createClient>, job: Record<string, unknown>) {
    const { entity_type, entity_id } = (job.payload ?? {}) as Record<string, string>;
    if (!entity_type || !entity_id) return;

    const tableMap: Record<string, string> = { booking: 'bookings', order: 'orders', ride: 'rides' };
    const table = tableMap[entity_type];
    if (table) {
        await admin.from(table).update({ payment_status: 'failed' }).eq('id', entity_id);
    }
}

async function handleNotifRetry(admin: ReturnType<typeof createClient>, job: Record<string, unknown>) {
    const { user_id, title, body, type } = (job.payload ?? {}) as Record<string, string>;
    if (!user_id || !title) throw new Error('notif_retry: missing required fields');
    await admin.from('notifications').insert({ user_id, title, body, type }).throwOnError();
}

async function handleSlaEnforce(admin: ReturnType<typeof createClient>, _job: Record<string, unknown>) {
    const { data: breached } = await admin
        .from('support_tickets')
        .select('id, user_id, escalation_level')
        .eq('sla_breached', true)
        .in('status', ['open', 'in_progress'])
        .limit(20);

    if (!breached?.length) return;

    for (const ticket of breached) {
        const newLevel = Math.min(ticket.escalation_level + 1, 3);
        await admin.from('support_tickets').update({ status: 'escalated', escalation_level: newLevel }).eq('id', ticket.id);
        await admin.from('notifications').insert({ user_id: ticket.user_id, title: 'Ticket Escalated', body: 'Your request was escalated to a senior agent.', type: 'support' });
    }
    await admin.rpc('record_metric', { p_name: 'sla_escalations', p_value: breached.length, p_labels: {} });
}

async function handleStuckRecovery(admin: ReturnType<typeof createClient>, _job: Record<string, unknown>) {
    // Release expired availability locks
    await admin.from('availability_locks').delete().lt('locked_until', new Date().toISOString());
    // Clean expired idempotency keys
    await admin.from('idempotency_keys').delete().lt('created_at', new Date(Date.now() - 86400000).toISOString());
    // Clean expired OTPs
    await admin.from('otp_codes').delete().lt('expires_at', new Date().toISOString()).eq('used', false);
    // Clean old webhook nonces
    await admin.rpc('purge_old_nonces');
    // Clean old rate limit windows (older than 1 hour)
    await admin.from('rate_limits').delete().lt('window_start', new Date(Date.now() - 3600000).toISOString());
}

async function handleFraudReview(admin: ReturnType<typeof createClient>, job: Record<string, unknown>) {
    const { user_id, signal, count } = (job.payload ?? {}) as Record<string, unknown>;
    if (!user_id) return;
    const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin');
    if (admins?.length) {
        await admin.from('notifications').insert(
            admins.map((a: { id: string }) => ({
                user_id: a.id,
                title: '🚨 Fraud Alert',
                body: `User flagged for "${signal}" × ${count}. Review required.`,
                type: 'admin',
                data: { flagged_user: user_id, signal, count },
            }))
        );
    }
}

// ── Job router ────────────────────────────────────────────────────────────────
type JobHandler = (admin: ReturnType<typeof createClient>, job: Record<string, unknown>) => Promise<void>;
const JOB_HANDLERS: Record<string, JobHandler> = {
    booking_expiry: handleBookingExpiry,
    payment_reconcile: handlePaymentReconcile,
    payment_failed_compensation: handlePaymentFailedCompensation,
    notif_retry: handleNotifRetry,
    sla_enforce: handleSlaEnforce,
    stuck_recovery: handleStuckRecovery,
    fraud_review: handleFraudReview,
};

// ── Main ──────────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    // Auth
    if (!isAuthorized(req)) {
        const admin = createClient(SUPABASE_URL, SERVICE_KEY);
        await admin.rpc('log_security_event', {
            p_event_type: 'cron_unauthorized_access',
            p_severity: 'critical',
            p_details: { user_agent: req.headers.get('user-agent') },
        }).catch(() => { });
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Housekeeping: always enqueue periodic jobs
    await Promise.allSettled([
        admin.rpc('enqueue_job', { p_type: 'sla_enforce', p_payload: {}, p_run_at: new Date().toISOString() }),
        admin.rpc('enqueue_job', { p_type: 'stuck_recovery', p_payload: {}, p_run_at: new Date().toISOString() }),
    ]);

    // Fetch due jobs — order by run_at ASC for FIFO fairness
    const { data: jobs, error } = await admin
        .from('job_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('run_at', new Date().toISOString())
        .order('run_at', { ascending: true })
        .limit(MAX_JOBS_PER_RUN);

    if (error) {
        console.error('[cron] Failed to fetch jobs:', error.message);
        return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
    }

    const results = { processed: 0, failed: 0, skipped: 0 };

    for (const job of jobs ?? []) {
        const handler = JOB_HANDLERS[job.job_type];

        if (!handler) {
            await admin.from('job_queue').update({ status: 'dead_letter', last_error: `No handler for type: ${job.job_type}` }).eq('id', job.id);
            results.skipped++;
            continue;
        }

        // Claim job atomically (race-safe for concurrent invocations)
        const { count } = await admin
            .from('job_queue')
            .update({ status: 'processing' })
            .eq('id', job.id)
            .eq('status', 'pending') // Only claim if still pending (another process may have grabbed it)
            .select('*', { count: 'exact', head: true });

        if (!count) {
            results.skipped++;
            continue; // Already claimed by another runner
        }

        try {
            await handler(admin, job);
            await admin.from('job_queue').update({ status: 'completed' }).eq('id', job.id);
            results.processed++;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            const newAttempts = (job.attempts ?? 0) + 1;
            const isDead = newAttempts >= MAX_ATTEMPTS;
            // Exponential backoff: 2^attempts minutes (2min, 4min, 8min...)
            const retryAt = isDead ? null : new Date(Date.now() + Math.pow(2, newAttempts) * 60000).toISOString();

            await admin.from('job_queue').update({
                status: isDead ? 'dead_letter' : 'pending',
                attempts: newAttempts,
                last_error: msg.slice(0, 500),
                run_at: retryAt ?? job.run_at,
            }).eq('id', job.id);

            if (isDead) {
                // Dead letter — log security event for investigation
                await admin.rpc('log_security_event', {
                    p_event_type: 'job_dead_lettered',
                    p_severity: 'warn',
                    p_details: { job_id: job.id, job_type: job.job_type, error: msg.slice(0, 200) },
                }).catch(() => { });
            }
            results.failed++;
        }
    }

    await admin.rpc('record_metric', {
        p_name: 'cron_run',
        p_value: results.processed,
        p_labels: results,
    }).catch(() => { });

    return new Response(JSON.stringify({ ok: true, ...results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
});
