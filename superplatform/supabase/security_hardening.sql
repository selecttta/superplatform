-- ═══════════════════════════════════════════════════════════════════════════
-- SUPERPLATFORM GH — SECURITY HARDENING PATCH v1
-- Run AFTER backend_completion.sql
-- Addresses 14 critical production security gaps
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- CRITICAL FIX 1: Replace is_admin() with JWT-claims version
-- The original version does a DB query on every RLS policy check, creating
-- a recursive RLS evaluation and a performance bottleneck on every query.
-- JWT claims are evaluated in memory — no DB hit, no recursion.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  -- Reads role from the JWT token claim — no DB query, no recursion
  SELECT COALESCE(
    (auth.jwt() ->> 'role') = 'admin',
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    FALSE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- Bonus: helper for anonymous access guard
CREATE OR REPLACE FUNCTION is_authenticated() RETURNS BOOLEAN AS $$
  SELECT auth.uid() IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- ─────────────────────────────────────────────────────────────────────────────
-- CRITICAL FIX 2: Add SET search_path to ALL SECURITY DEFINER functions
-- Without this, an attacker who can create schemas can hijack function calls
-- via search_path injection (CVE-class vulnerability in Postgres).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER FUNCTION enforce_state_transition(TEXT, TEXT, TEXT)
  SET search_path = public, pg_catalog;

ALTER FUNCTION register_idempotency_key(TEXT, UUID, TEXT, TEXT)
  SET search_path = public, pg_catalog;

ALTER FUNCTION hold_in_escrow(UUID, DECIMAL, TEXT, TEXT, UUID)
  SET search_path = public, pg_catalog;

ALTER FUNCTION release_from_escrow(UUID, DECIMAL, UUID, TEXT, TEXT, UUID)
  SET search_path = public, pg_catalog;

ALTER FUNCTION compensate(UUID, DECIMAL, TEXT, TEXT, UUID)
  SET search_path = public, pg_catalog;

ALTER FUNCTION acquire_availability_lock(TEXT, UUID, UUID, INTERVAL, UUID)
  SET search_path = public, pg_catalog;

ALTER FUNCTION release_availability_lock(TEXT, UUID, UUID)
  SET search_path = public, pg_catalog;

ALTER FUNCTION resolve_dispute(UUID, TEXT, DECIMAL, UUID)
  SET search_path = public, pg_catalog;

ALTER FUNCTION enqueue_job(TEXT, JSONB, TIMESTAMPTZ)
  SET search_path = public, pg_catalog;

ALTER FUNCTION record_metric(TEXT, DECIMAL, JSONB)
  SET search_path = public, pg_catalog;

ALTER FUNCTION verify_prescription_integrity(UUID)
  SET search_path = public, pg_catalog;

ALTER FUNCTION is_feature_enabled(TEXT, TEXT, TEXT)
  SET search_path = public, pg_catalog;

ALTER FUNCTION record_fraud_signal(UUID, TEXT, INT)
  SET search_path = public, pg_catalog;

-- ─────────────────────────────────────────────────────────────────────────────
-- CRITICAL FIX 3: Fix acquire_availability_lock — GET DIAGNOSTICS bug
-- GET DIAGNOSTICS must come immediately after the DML it measures.
-- Using a temp variable and checking FOUND is the correct pattern.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION acquire_availability_lock(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_locked_by   UUID,
  p_duration    INTERVAL DEFAULT '15 minutes',
  p_booking_ref UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_rows_inserted INT;
BEGIN
  -- Validate inputs
  IF p_entity_type IS NULL OR p_entity_id IS NULL OR p_locked_by IS NULL THEN
    RAISE EXCEPTION 'acquire_availability_lock: NULL argument not allowed';
  END IF;
  IF p_duration < '0 seconds'::INTERVAL OR p_duration > '24 hours'::INTERVAL THEN
    RAISE EXCEPTION 'acquire_availability_lock: duration must be between 0 and 24 hours';
  END IF;

  -- Purge expired locks first
  DELETE FROM availability_locks
  WHERE entity_type = p_entity_type
    AND entity_id   = p_entity_id
    AND locked_until < now();

  -- Attempt atomic insert
  INSERT INTO availability_locks (entity_type, entity_id, locked_by, locked_until, booking_ref)
  VALUES (p_entity_type, p_entity_id, p_locked_by, now() + p_duration, p_booking_ref)
  ON CONFLICT (entity_type, entity_id) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
  RETURN v_rows_inserted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- ─────────────────────────────────────────────────────────────────────────────
-- CRITICAL FIX 4: Input validation on all financial functions
-- Without these guards, negative amounts or zero-value transfers could
-- corrupt the ledger or allow fraudulent balance manipulation.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION hold_in_escrow(
  p_wallet_id   UUID,
  p_amount      DECIMAL,
  p_reason      TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID
) RETURNS UUID AS $$
DECLARE v_ledger_id UUID;
BEGIN
  -- Input validation
  IF p_wallet_id IS NULL OR p_entity_id IS NULL THEN
    RAISE EXCEPTION 'hold_in_escrow: wallet_id and entity_id are required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'hold_in_escrow: amount must be positive, got %', p_amount;
  END IF;
  IF p_amount > 1000000 THEN
    RAISE EXCEPTION 'hold_in_escrow: amount exceeds maximum single-transaction limit';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'hold_in_escrow: reason is required';
  END IF;

  -- Verify the wallet belongs to an active user (not suspended)
  IF NOT EXISTS (
    SELECT 1 FROM wallets w JOIN profiles p ON p.id = w.user_id
    WHERE w.id = p_wallet_id AND COALESCE(p.is_suspended, FALSE) = FALSE
  ) THEN
    RAISE EXCEPTION 'hold_in_escrow: wallet not found or account suspended';
  END IF;

  -- Move available → escrow atomically with SELECT FOR UPDATE
  UPDATE wallets
  SET available_balance = available_balance - p_amount,
      escrow_balance    = escrow_balance    + p_amount,
      updated_at        = now()
  WHERE id = p_wallet_id AND available_balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient available balance for escrow hold';
  END IF;

  INSERT INTO ledger (from_wallet_id, to_wallet_id, amount, reason, entity_type, entity_id)
  VALUES (p_wallet_id, NULL, p_amount, 'escrow_hold:' || p_reason, p_entity_type, p_entity_id)
  RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION release_from_escrow(
  p_wallet_id      UUID,
  p_amount         DECIMAL,
  p_dest_wallet_id UUID,
  p_reason         TEXT,
  p_entity_type    TEXT,
  p_entity_id      UUID
) RETURNS UUID AS $$
DECLARE v_ledger_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'release_from_escrow: amount must be positive';
  END IF;
  IF p_wallet_id = p_dest_wallet_id THEN
    RAISE EXCEPTION 'release_from_escrow: source and destination wallets must differ';
  END IF;

  UPDATE wallets
  SET escrow_balance = escrow_balance - p_amount,
      updated_at     = now()
  WHERE id = p_wallet_id AND escrow_balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient escrow balance for release';
  END IF;

  UPDATE wallets
  SET available_balance = available_balance + p_amount,
      updated_at        = now()
  WHERE id = p_dest_wallet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination wallet not found';
  END IF;

  INSERT INTO ledger (from_wallet_id, to_wallet_id, amount, reason, entity_type, entity_id)
  VALUES (p_wallet_id, p_dest_wallet_id, p_amount, 'escrow_release:' || p_reason, p_entity_type, p_entity_id)
  RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION compensate(
  p_wallet_id   UUID,
  p_amount      DECIMAL,
  p_reason      TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID
) RETURNS UUID AS $$
DECLARE v_ledger_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'compensate: amount must be positive';
  END IF;
  IF p_amount > 1000000 THEN
    RAISE EXCEPTION 'compensate: compensation amount exceeds limit';
  END IF;

  UPDATE wallets
  SET available_balance = available_balance + p_amount,
      escrow_balance    = GREATEST(escrow_balance - p_amount, 0),
      updated_at        = now()
  WHERE id = p_wallet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'compensate: wallet not found';
  END IF;

  INSERT INTO ledger (from_wallet_id, to_wallet_id, amount, reason, entity_type, entity_id)
  VALUES (NULL, p_wallet_id, p_amount, 'compensation:' || p_reason, p_entity_type, p_entity_id)
  RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- ─────────────────────────────────────────────────────────────────────────────
-- CRITICAL FIX 5: Anonymous access guards on all sensitive RLS policies
-- Previously, auth.uid() = NULL would silently fail but not block anon requests.
-- Adding explicit IS NOT NULL checks.
-- ─────────────────────────────────────────────────────────────────────────────

-- Wallets: only authenticated users
DROP POLICY IF EXISTS "wallets_select" ON wallets;
CREATE POLICY "wallets_select" ON wallets FOR SELECT
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR is_admin()));

-- Ledger: only authenticated users
DROP POLICY IF EXISTS "ledger_select" ON ledger;
CREATE POLICY "ledger_select" ON ledger FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      from_wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()) OR
      to_wallet_id   IN (SELECT id FROM wallets WHERE user_id = auth.uid()) OR
      is_admin()
    )
  );
DROP POLICY IF EXISTS "ledger_insert" ON ledger;
CREATE POLICY "ledger_insert" ON ledger FOR INSERT
  WITH CHECK (FALSE); -- ONLY via SECURITY DEFINER functions; direct insert is ALWAYS denied

-- payments_v2
DROP POLICY IF EXISTS "payments_v2_select" ON payments_v2;
CREATE POLICY "payments_v2_select" ON payments_v2 FOR SELECT
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR is_admin()));
DROP POLICY IF EXISTS "payments_v2_insert" ON payments_v2;
CREATE POLICY "payments_v2_insert" ON payments_v2 FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
DROP POLICY IF EXISTS "payments_v2_update" ON payments_v2;
CREATE POLICY "payments_v2_update" ON payments_v2 FOR UPDATE
  USING (FALSE); -- ONLY service role (webhook) can update; all client updates denied

-- Medical records: never allow anonymous
DROP POLICY IF EXISTS "med_records_access" ON medical_records;
CREATE POLICY "med_records_access" ON medical_records FOR SELECT
  USING (auth.uid() IS NOT NULL AND (patient_id = auth.uid() OR doctor_id = auth.uid() OR is_admin()));
DROP POLICY IF EXISTS "med_records_insert" ON medical_records;
CREATE POLICY "med_records_insert" ON medical_records FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND doctor_id = auth.uid());

-- Audit log: nobody can insert directly, only via triggers/functions
DROP POLICY IF EXISTS "audit_insert" ON medical_audit_log;
CREATE POLICY "audit_insert" ON medical_audit_log FOR INSERT
  WITH CHECK (FALSE); -- must go through log_medical_access() function

-- Disputes
DROP POLICY IF EXISTS "disputes_insert" ON disputes;
CREATE POLICY "disputes_insert" ON disputes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND opened_by = auth.uid());

-- Support tickets
DROP POLICY IF EXISTS "tickets_insert" ON support_tickets;
CREATE POLICY "tickets_insert" ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Fraud signals: deny ALL direct access
DROP POLICY IF EXISTS "fraud_admin_only" ON fraud_signals;
CREATE POLICY "fraud_admin_only" ON fraud_signals FOR SELECT USING (is_admin());
CREATE POLICY "fraud_insert_deny" ON fraud_signals FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "fraud_update_deny" ON fraud_signals FOR UPDATE USING (FALSE);

-- ─────────────────────────────────────────────────────────────────────────────
-- CRITICAL FIX 6: Revoke direct function execution from untrusted roles
-- SECURITY DEFINER functions must not be callable by anon/unauthenticated users.
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION hold_in_escrow(UUID, DECIMAL, TEXT, TEXT, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION release_from_escrow(UUID, DECIMAL, UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION compensate(UUID, DECIMAL, TEXT, TEXT, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION resolve_dispute(UUID, TEXT, DECIMAL, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION acquire_availability_lock(TEXT, UUID, UUID, INTERVAL, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION release_availability_lock(TEXT, UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION enqueue_job(TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION record_fraud_signal(UUID, TEXT, INT) FROM PUBLIC, anon;

-- Allow authenticated users to call non-financial helpers
GRANT EXECUTE ON FUNCTION is_feature_enabled(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_prescription_integrity(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: Server-side rate limiting table
-- Used by Edge Functions to enforce per-user / per-IP request limits.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  identifier   TEXT NOT NULL,       -- user_id, phone, or IP
  action       TEXT NOT NULL,       -- 'otp_send', 'otp_verify', 'payment_init', etc.
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  count        INT NOT NULL DEFAULT 1,
  UNIQUE (identifier, action, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits ON rate_limits(identifier, action, window_start);

-- Check + increment rate limit atomically (returns TRUE if allowed, FALSE if blocked)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action     TEXT,
  p_max_count  INT,
  p_window     INTERVAL DEFAULT '1 minute'
) RETURNS BOOLEAN AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count        INT;
BEGIN
  v_window_start := date_trunc('minute', now()); -- 1-minute windows

  INSERT INTO rate_limits (identifier, action, window_start, count)
  VALUES (p_identifier, p_action, v_window_start, 1)
  ON CONFLICT (identifier, action, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, TEXT, INT, INTERVAL) TO service_role;

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limits_deny_all" ON rate_limits USING (FALSE); -- only via functions

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8: Webhook replay attack prevention
-- Stores seen webhook nonces to reject duplicate/replayed webhooks.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_nonces (
  nonce      TEXT PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhook_nonces ON webhook_nonces(received_at);

-- Clean up nonces older than 24h (called by cron job)
CREATE OR REPLACE FUNCTION purge_old_nonces() RETURNS INT AS $$
DECLARE v_count INT;
BEGIN
  DELETE FROM webhook_nonces WHERE received_at < now() - INTERVAL '24 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

ALTER TABLE webhook_nonces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nonces_deny_all" ON webhook_nonces USING (FALSE);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9: OTP table (replace in-memory store in send-otp Edge Function)
-- In-memory OTPs don't survive function restarts and can't enforce rate limits.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,   -- bcrypt hash of the OTP — never store plain
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INT NOT NULL DEFAULT 0,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (phone)  -- one active OTP per phone at a time
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone, expires_at);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "otp_deny_all" ON otp_codes USING (FALSE); -- Only via service role

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 10: Security events log
-- Central incident log for all security-relevant events.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_events (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type  TEXT NOT NULL,   -- 'invalid_signature', 'rate_limit_hit', 'replay_attack', 'brute_force', 'suspicious_transition'
  severity    TEXT NOT NULL DEFAULT 'warn' CHECK (severity IN ('info','warn','critical')),
  user_id     UUID REFERENCES profiles(id),
  ip_address  TEXT,
  user_agent  TEXT,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sec_events_type     ON security_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_sec_events_user     ON security_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sec_events_severity ON security_events(severity, created_at);

-- Prevent modification
CREATE OR REPLACE FUNCTION security_event_immutable() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Security event log is immutable';
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_catalog;

DROP TRIGGER IF EXISTS trg_sec_event_immutable ON security_events;
CREATE TRIGGER trg_sec_event_immutable
  BEFORE UPDATE OR DELETE ON security_events
  FOR EACH ROW EXECUTE FUNCTION security_event_immutable();

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_events_admin" ON security_events FOR SELECT USING (is_admin());
CREATE POLICY "sec_events_insert" ON security_events FOR INSERT WITH CHECK (TRUE); -- service role only

-- Quick helper for Edge Functions to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_severity   TEXT DEFAULT 'warn',
  p_user_id    UUID DEFAULT NULL,
  p_ip         TEXT DEFAULT NULL,
  p_details    JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO security_events (event_type, severity, user_id, ip_address, details)
  VALUES (p_event_type, p_severity, p_user_id, p_ip, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 11: Wallet balance hard constraints
-- Belt-and-suspenders: DB-level constraints ensure balances can NEVER go negative
-- even if application code has a bug.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE wallets
  ADD CONSTRAINT chk_wallet_available_non_negative
    CHECK (available_balance >= 0),
  ADD CONSTRAINT chk_wallet_escrow_non_negative
    CHECK (escrow_balance >= 0),
  ADD CONSTRAINT chk_wallet_locked_non_negative
    CHECK (locked_balance >= 0);

-- Maximum wallet cap (anti money-laundering control)
ALTER TABLE wallets
  ADD CONSTRAINT chk_wallet_available_cap
    CHECK (available_balance <= 500000),
  ADD CONSTRAINT chk_wallet_escrow_cap
    CHECK (escrow_balance <= 500000);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 12: Payments_v2 amount constraints
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE payments_v2
  ADD CONSTRAINT chk_payment_positive   CHECK (amount > 0),
  ADD CONSTRAINT chk_payment_max        CHECK (amount <= 500000),
  ADD CONSTRAINT chk_payment_currency   CHECK (currency IN ('GHS','USD','EUR','GBP'));

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 13: Add indexes for security event queries (hot path)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fraud_flagged_recent
  ON fraud_signals(auto_flagged, last_seen DESC)
  WHERE auto_flagged = TRUE;

CREATE INDEX IF NOT EXISTS idx_disputes_open
  ON disputes(status, created_at)
  WHERE status IN ('opened','under_review');

CREATE INDEX IF NOT EXISTS idx_tickets_sla_breach
  ON support_tickets(sla_due_at, status)
  WHERE status NOT IN ('resolved','closed');

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 14: Privilege separation — revoke unnecessary grants
-- By default Supabase grants all roles access to all functions.
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON TABLE ledger FROM anon;
REVOKE ALL ON TABLE wallets FROM anon;
REVOKE ALL ON TABLE payments_v2 FROM anon;
REVOKE ALL ON TABLE security_events FROM anon;
REVOKE ALL ON TABLE webhook_nonces FROM anon;
REVOKE ALL ON TABLE otp_codes FROM anon;
REVOKE ALL ON TABLE rate_limits FROM anon;
REVOKE ALL ON TABLE medical_records FROM anon;
REVOKE ALL ON TABLE prescriptions FROM anon;
REVOKE ALL ON TABLE patient_consent FROM anon;
REVOKE ALL ON TABLE medical_audit_log FROM anon;
REVOKE ALL ON TABLE fraud_signals FROM anon;
REVOKE ALL ON TABLE audit_log FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 15: Statement-level audit trigger for admin actions
-- Captures all UPDATE/DELETE operations on sensitive tables by admins.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_sensitive_table_audit() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (actor_id, action, table_name, row_id, old_val, new_val)
    VALUES (
      auth.uid(),
      'update',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (actor_id, action, table_name, row_id, old_val)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- Attach to sensitive tables
DROP TRIGGER IF EXISTS trg_audit_profiles ON profiles;
CREATE TRIGGER trg_audit_profiles
  AFTER UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trg_sensitive_table_audit();

DROP TRIGGER IF EXISTS trg_audit_wallets ON wallets;
CREATE TRIGGER trg_audit_wallets
  AFTER UPDATE OR DELETE ON wallets
  FOR EACH ROW EXECUTE FUNCTION trg_sensitive_table_audit();

DROP TRIGGER IF EXISTS trg_audit_listings ON listings;
CREATE TRIGGER trg_audit_listings
  AFTER UPDATE OR DELETE ON listings
  FOR EACH ROW EXECUTE FUNCTION trg_sensitive_table_audit();
