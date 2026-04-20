-- ═══════════════════════════════════════════════════════════════════════════
-- SUPERPLATFORM GH — BACKEND COMPLETION PATCH
-- Additive Only · Non-Destructive · Paystack-Ready
-- Run AFTER schema.sql in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- § 1  STATE MACHINE ENFORCEMENT
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. Allowed state-transition config
CREATE TABLE IF NOT EXISTS state_transitions (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type  TEXT NOT NULL,  -- 'booking' | 'order' | 'ride' | 'rental' | 'payment'
  from_status  TEXT NOT NULL,
  to_status    TEXT NOT NULL,
  UNIQUE (entity_type, from_status, to_status)
);

-- Seed allowed transitions
INSERT INTO state_transitions (entity_type, from_status, to_status) VALUES
  -- bookings
  ('booking','pending','confirmed'),
  ('booking','confirmed','in_progress'),
  ('booking','confirmed','cancelled'),
  ('booking','in_progress','completed'),
  ('booking','in_progress','no_show'),
  ('booking','pending','cancelled'),
  -- orders
  ('order','pending','confirmed'),
  ('order','confirmed','processing'),
  ('order','processing','shipped'),
  ('order','shipped','delivered'),
  ('order','pending','cancelled'),
  ('order','confirmed','cancelled'),
  ('order','delivered','refunded'),
  -- rides
  ('ride','requested','accepted'),
  ('ride','accepted','arriving'),
  ('ride','arriving','in_progress'),
  ('ride','in_progress','completed'),
  ('ride','requested','cancelled'),
  ('ride','accepted','cancelled'),
  -- rentals
  ('rental','pending','confirmed'),
  ('rental','confirmed','active'),
  ('rental','active','returned'),
  ('rental','pending','cancelled'),
  -- payments
  ('payment','initiated','pending'),
  ('payment','pending','confirmed'),
  ('payment','pending','failed'),
  ('payment','confirmed','refunded')
ON CONFLICT DO NOTHING;

-- 1b. Idempotency keys to prevent duplicate execution
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key          TEXT PRIMARY KEY,
  entity_id    UUID NOT NULL,
  entity_type  TEXT NOT NULL,
  action       TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);
-- Auto-expire old keys after 24h (advisory — clean via job)
CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency_keys(created_at);

-- 1c. Transition enforcement function
CREATE OR REPLACE FUNCTION enforce_state_transition(
  p_entity_type TEXT,
  p_current     TEXT,
  p_next        TEXT
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM state_transitions
    WHERE entity_type = p_entity_type
      AND from_status = p_current
      AND to_status   = p_next
  ) THEN
    RAISE EXCEPTION 'Invalid state transition: % → % for %', p_current, p_next, p_entity_type;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1d. Trigger: enforce booking transitions
CREATE OR REPLACE FUNCTION trg_enforce_booking_transition() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM enforce_state_transition('booking', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_state ON bookings;
CREATE TRIGGER trg_booking_state
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trg_enforce_booking_transition();

-- 1e. Trigger: enforce order transitions
CREATE OR REPLACE FUNCTION trg_enforce_order_transition() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM enforce_state_transition('order', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_state ON orders;
CREATE TRIGGER trg_order_state
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_enforce_order_transition();

-- 1f. Trigger: enforce ride transitions
CREATE OR REPLACE FUNCTION trg_enforce_ride_transition() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM enforce_state_transition('ride', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ride_state ON rides;
CREATE TRIGGER trg_ride_state
  BEFORE UPDATE ON rides
  FOR EACH ROW EXECUTE FUNCTION trg_enforce_ride_transition();

-- 1g. Register idempotency key (RPC callable from Edge Functions)
CREATE OR REPLACE FUNCTION register_idempotency_key(
  p_key         TEXT,
  p_entity_id   UUID,
  p_entity_type TEXT,
  p_action      TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO idempotency_keys (key, entity_id, entity_type, action)
  VALUES (p_key, p_entity_id, p_entity_type, p_action)
  ON CONFLICT (key) DO NOTHING;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────────────────
-- § 2  UNIFIED WALLET, ESCROW & IMMUTABLE LEDGER
-- ─────────────────────────────────────────────────────────────────────────────

-- 2a. Wallets table (additive — profiles.wallet_balance stays untouched)
CREATE TABLE IF NOT EXISTS wallets (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_type       TEXT NOT NULL DEFAULT 'consumer', -- 'consumer' | 'earnings'
  available_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  escrow_balance    DECIMAL(14,2) NOT NULL DEFAULT 0,
  locked_balance    DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'GHS',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, wallet_type)
);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- Auto-provision wallet on new profile
CREATE OR REPLACE FUNCTION provision_wallets_for_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id, wallet_type) VALUES
    (NEW.id, 'consumer'),
    (NEW.id, 'earnings')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_provision_wallets ON profiles;
CREATE TRIGGER trg_provision_wallets
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION provision_wallets_for_user();

-- 2b. Immutable Ledger (append-only — DELETE/UPDATE raise exceptions)
CREATE TABLE IF NOT EXISTS ledger (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_wallet_id  UUID REFERENCES wallets(id),
  to_wallet_id    UUID REFERENCES wallets(id),
  amount          DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  reason          TEXT NOT NULL,
  entity_type     TEXT,   -- 'booking' | 'order' | 'ride' | 'rental' | 'topup' | 'payout' | 'refund'
  entity_id       UUID,
  meta            JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_from   ON ledger(from_wallet_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_to     ON ledger(to_wallet_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_entity ON ledger(entity_type, entity_id);

-- Prevent ANY modification to ledger rows
CREATE OR REPLACE FUNCTION ledger_immutable() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Ledger entries are immutable. Use compensating entries instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_no_update ON ledger;
CREATE TRIGGER trg_ledger_no_update
  BEFORE UPDATE OR DELETE ON ledger
  FOR EACH ROW EXECUTE FUNCTION ledger_immutable();

-- 2c. Escrow functions
CREATE OR REPLACE FUNCTION hold_in_escrow(
  p_wallet_id UUID,
  p_amount    DECIMAL,
  p_reason    TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID
) RETURNS UUID AS $$
DECLARE v_ledger_id UUID;
BEGIN
  -- Move available → escrow atomically
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  -- Release escrow from source wallet
  UPDATE wallets
  SET escrow_balance    = escrow_balance - p_amount,
      updated_at        = now()
  WHERE id = p_wallet_id AND escrow_balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient escrow balance';
  END IF;

  -- Credit destination wallet (provider earnings)
  UPDATE wallets
  SET available_balance = available_balance + p_amount,
      updated_at        = now()
  WHERE id = p_dest_wallet_id;

  INSERT INTO ledger (from_wallet_id, to_wallet_id, amount, reason, entity_type, entity_id)
  VALUES (p_wallet_id, p_dest_wallet_id, p_amount, 'escrow_release:' || p_reason, p_entity_type, p_entity_id)
  RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compensation = reverse ledger entry (NEVER modify existing rows)
CREATE OR REPLACE FUNCTION compensate(
  p_wallet_id   UUID,
  p_amount      DECIMAL,
  p_reason      TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID
) RETURNS UUID AS $$
DECLARE v_ledger_id UUID;
BEGIN
  UPDATE wallets
  SET available_balance = available_balance + p_amount,
      escrow_balance    = GREATEST(escrow_balance - p_amount, 0),
      updated_at        = now()
  WHERE id = p_wallet_id;

  INSERT INTO ledger (from_wallet_id, to_wallet_id, amount, reason, entity_type, entity_id)
  VALUES (NULL, p_wallet_id, p_amount, 'compensation:' || p_reason, p_entity_type, p_entity_id)
  RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS on wallets & ledger
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_select" ON wallets FOR SELECT
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "wallets_update" ON wallets FOR UPDATE
  USING (is_admin()); -- only server-side functions touch these

CREATE POLICY "ledger_select" ON ledger FOR SELECT
  USING (
    from_wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()) OR
    to_wallet_id   IN (SELECT id FROM wallets WHERE user_id = auth.uid()) OR
    is_admin()
  );
CREATE POLICY "ledger_insert" ON ledger FOR INSERT
  WITH CHECK (true); -- only via SECURITY DEFINER functions


-- ─────────────────────────────────────────────────────────────────────────────
-- § 3  PAYMENT ABSTRACTION (PROVIDER-AGNOSTIC, PAYSTACK-READY)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments_v2 (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES profiles(id),
  amount              DECIMAL(14,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'GHS',
  status              TEXT NOT NULL DEFAULT 'initiated'
                        CHECK (status IN ('initiated','pending','confirmed','failed','refunded')),
  -- Provider fields: NULL until a payment provider is configured
  provider            TEXT,                  -- 'paystack' | 'stripe' | 'momo' | NULL
  provider_reference  TEXT,                  -- e.g. Paystack reference
  provider_meta       JSONB DEFAULT '{}',    -- raw webhook payload
  -- What this payment is for
  linked_entity_type  TEXT NOT NULL,         -- 'booking' | 'order' | 'ride' | 'topup'
  linked_entity_id    UUID NOT NULL,
  -- Idempotency & audit
  idempotency_key     TEXT UNIQUE,
  webhook_received_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_v2_user     ON payments_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_v2_entity   ON payments_v2(linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_payments_v2_provider ON payments_v2(provider, provider_reference);
CREATE INDEX IF NOT EXISTS idx_payments_v2_status   ON payments_v2(status);

DROP TRIGGER IF EXISTS trg_payments_v2_updated_at ON payments_v2;
CREATE TRIGGER trg_payments_v2_updated_at
  BEFORE UPDATE ON payments_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enforce payment status transitions
CREATE OR REPLACE FUNCTION trg_enforce_payment_transition() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM enforce_state_transition('payment', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_state ON payments_v2;
CREATE TRIGGER trg_payment_state
  BEFORE UPDATE ON payments_v2
  FOR EACH ROW EXECUTE FUNCTION trg_enforce_payment_transition();

ALTER TABLE payments_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_v2_select" ON payments_v2 FOR SELECT
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "payments_v2_insert" ON payments_v2 FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_v2_update" ON payments_v2 FOR UPDATE
  USING (is_admin()); -- only webhook handler (service role) updates


-- ─────────────────────────────────────────────────────────────────────────────
-- § 4a  HEALTH COMPLIANCE
-- ─────────────────────────────────────────────────────────────────────────────

-- Encrypted medical records (pgcrypto symmetric encryption)
CREATE TABLE IF NOT EXISTS medical_records (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id      UUID NOT NULL REFERENCES profiles(id),
  doctor_id       UUID NOT NULL REFERENCES profiles(id),
  booking_id      UUID REFERENCES bookings(id),
  -- Encrypted payload — encrypted with pgcrypto using server-side key
  encrypted_data  BYTEA NOT NULL,
  record_type     TEXT NOT NULL CHECK (record_type IN ('consultation','lab','prescription','imaging','referral')),
  consent_given   BOOLEAN NOT NULL DEFAULT FALSE,
  consent_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Patient consent records
CREATE TABLE IF NOT EXISTS patient_consent (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id      UUID NOT NULL REFERENCES profiles(id),
  doctor_id       UUID NOT NULL REFERENCES profiles(id),
  consent_type    TEXT NOT NULL, -- 'data_sharing' | 'treatment' | 'referral'
  granted         BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Immutable medical audit log
CREATE TABLE IF NOT EXISTS medical_audit_log (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  actor_id    UUID NOT NULL REFERENCES profiles(id),
  patient_id  UUID NOT NULL REFERENCES profiles(id),
  action      TEXT NOT NULL, -- 'viewed' | 'created' | 'updated' | 'shared'
  record_id   UUID,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Prescriptions with integrity hash
CREATE TABLE IF NOT EXISTS prescriptions (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  medical_record_id UUID REFERENCES medical_records(id),
  patient_id      UUID NOT NULL REFERENCES profiles(id),
  doctor_id       UUID NOT NULL REFERENCES profiles(id),
  items           JSONB NOT NULL DEFAULT '[]', -- [{drug, dosage, duration}]
  content_hash    TEXT NOT NULL, -- SHA-256 of items JSON
  is_dispensed    BOOLEAN DEFAULT FALSE,
  dispensed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Verify prescription integrity on read
CREATE OR REPLACE FUNCTION verify_prescription_integrity(p_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_stored_hash TEXT;
  v_actual_hash TEXT;
BEGIN
  SELECT content_hash,
         encode(digest(items::TEXT, 'sha256'), 'hex')
  INTO v_stored_hash, v_actual_hash
  FROM prescriptions WHERE id = p_id;
  RETURN v_stored_hash = v_actual_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevent medical audit log tampering
CREATE OR REPLACE FUNCTION medical_audit_immutable() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Medical audit log is immutable.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medical_audit_immutable ON medical_audit_log;
CREATE TRIGGER trg_medical_audit_immutable
  BEFORE UPDATE OR DELETE ON medical_audit_log
  FOR EACH ROW EXECUTE FUNCTION medical_audit_immutable();

-- RLS for health tables
ALTER TABLE medical_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consent   ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "med_records_access" ON medical_records FOR SELECT
  USING (patient_id = auth.uid() OR doctor_id = auth.uid() OR is_admin());
CREATE POLICY "med_records_insert" ON medical_records FOR INSERT
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "consent_select" ON patient_consent FOR SELECT
  USING (patient_id = auth.uid() OR doctor_id = auth.uid() OR is_admin());
CREATE POLICY "consent_insert" ON patient_consent FOR INSERT
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "audit_select" ON medical_audit_log FOR SELECT
  USING (actor_id = auth.uid() OR patient_id = auth.uid() OR is_admin());
CREATE POLICY "audit_insert" ON medical_audit_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "rx_select" ON prescriptions FOR SELECT
  USING (patient_id = auth.uid() OR doctor_id = auth.uid() OR is_admin());
CREATE POLICY "rx_insert" ON prescriptions FOR INSERT
  WITH CHECK (doctor_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- § 4b  REAL ESTATE COMPLIANCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS property_contracts (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id     UUID NOT NULL REFERENCES properties(id),
  buyer_id        UUID REFERENCES profiles(id),
  tenant_id       UUID REFERENCES profiles(id),
  agent_id        UUID NOT NULL REFERENCES profiles(id),
  contract_type   TEXT NOT NULL CHECK (contract_type IN ('sale','lease','rental_agreement')),
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','signed','active','terminated','expired')),
  document_url    TEXT,
  document_version INT NOT NULL DEFAULT 1,
  signature_hash  TEXT,    -- SHA-256 of signed document
  signed_at       TIMESTAMPTZ,
  effective_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  dispute_hook    JSONB DEFAULT '{}', -- linked dispute_id if raised
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Document version history
CREATE TABLE IF NOT EXISTS contract_versions (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id  UUID NOT NULL REFERENCES property_contracts(id) ON DELETE CASCADE,
  version      INT NOT NULL,
  document_url TEXT NOT NULL,
  changed_by   UUID REFERENCES profiles(id),
  change_note  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Property escrow deposits
CREATE TABLE IF NOT EXISTS property_deposits (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id   UUID NOT NULL REFERENCES property_contracts(id),
  payer_id      UUID NOT NULL REFERENCES profiles(id),
  wallet_id     UUID REFERENCES wallets(id),
  amount        DECIMAL(14,2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'held'
                  CHECK (status IN ('held','released','refunded','forfeited')),
  held_at       TIMESTAMPTZ DEFAULT now(),
  released_at   TIMESTAMPTZ,
  ledger_entry  UUID REFERENCES ledger(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON property_contracts;
CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON property_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE property_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_deposits  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_select" ON property_contracts FOR SELECT
  USING (buyer_id = auth.uid() OR tenant_id = auth.uid() OR agent_id = auth.uid() OR is_admin());
CREATE POLICY "contracts_insert" ON property_contracts FOR INSERT
  WITH CHECK (agent_id = auth.uid());
CREATE POLICY "contracts_update" ON property_contracts FOR UPDATE
  USING (agent_id = auth.uid() OR is_admin());

CREATE POLICY "contract_versions_select" ON contract_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM property_contracts c WHERE c.id = contract_id AND (c.agent_id = auth.uid() OR c.buyer_id = auth.uid() OR c.tenant_id = auth.uid() OR is_admin())));

CREATE POLICY "deposits_select" ON property_deposits FOR SELECT
  USING (payer_id = auth.uid() OR is_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- § 5  BACKGROUND JOB QUEUE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_queue (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_type    TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','processing','completed','failed','dead_letter')),
  run_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts    INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_error  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_run_at ON job_queue(run_at, status);
CREATE INDEX IF NOT EXISTS idx_job_queue_type   ON job_queue(job_type, status);

DROP TRIGGER IF EXISTS trg_job_queue_updated_at ON job_queue;
CREATE TRIGGER trg_job_queue_updated_at
  BEFORE UPDATE ON job_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper: enqueue a background job
CREATE OR REPLACE FUNCTION enqueue_job(
  p_type    TEXT,
  p_payload JSONB,
  p_run_at  TIMESTAMPTZ DEFAULT now()
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO job_queue (job_type, payload, run_at)
  VALUES (p_type, p_payload, p_run_at)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-enqueue expiry job when a booking is confirmed
CREATE OR REPLACE FUNCTION enqueue_booking_expiry() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND NEW.scheduled_at IS NOT NULL THEN
    PERFORM enqueue_job(
      'booking_expiry',
      jsonb_build_object('booking_id', NEW.id),
      NEW.scheduled_at + INTERVAL '4 hours'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enqueue_booking_expiry ON bookings;
CREATE TRIGGER trg_enqueue_booking_expiry
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION enqueue_booking_expiry();

-- Auto-enqueue reconciliation job on payment stuck in pending > 15 min
CREATE OR REPLACE FUNCTION enqueue_payment_reconciliation() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM enqueue_job(
      'payment_reconcile',
      jsonb_build_object('payment_id', NEW.id),
      now() + INTERVAL '15 minutes'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enqueue_reconcile ON payments_v2;
CREATE TRIGGER trg_enqueue_reconcile
  AFTER INSERT OR UPDATE ON payments_v2
  FOR EACH ROW EXECUTE FUNCTION enqueue_payment_reconciliation();


-- ─────────────────────────────────────────────────────────────────────────────
-- § 6  INVENTORY & AVAILABILITY LOCKING
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS availability_locks (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type   TEXT NOT NULL,   -- 'product' | 'rental' | 'property' | 'listing' | 'slot'
  entity_id     UUID NOT NULL,
  locked_by     UUID NOT NULL REFERENCES profiles(id),
  locked_until  TIMESTAMPTZ NOT NULL,
  booking_ref   UUID,            -- booking/order this lock relates to
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (entity_type, entity_id) -- one lock per entity at a time
);

CREATE INDEX IF NOT EXISTS idx_avail_locks_entity  ON availability_locks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_avail_locks_expiry  ON availability_locks(locked_until);

-- Acquire atomic lock (returns TRUE if acquired, FALSE if already locked)
CREATE OR REPLACE FUNCTION acquire_availability_lock(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_locked_by   UUID,
  p_duration    INTERVAL DEFAULT '15 minutes',
  p_booking_ref UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE v_inserted BOOLEAN;
BEGIN
  -- First purge expired locks
  DELETE FROM availability_locks
  WHERE entity_type = p_entity_type
    AND entity_id   = p_entity_id
    AND locked_until < now();

  INSERT INTO availability_locks (entity_type, entity_id, locked_by, locked_until, booking_ref)
  VALUES (p_entity_type, p_entity_id, p_locked_by, now() + p_duration, p_booking_ref)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Release lock
CREATE OR REPLACE FUNCTION release_availability_lock(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_locked_by   UUID
) RETURNS VOID AS $$
BEGIN
  DELETE FROM availability_locks
  WHERE entity_type = p_entity_type
    AND entity_id   = p_entity_id
    AND locked_by   = p_locked_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Double-booking prevention: check slot availability before insert
CREATE OR REPLACE FUNCTION trg_prevent_double_booking() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.listing_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM bookings
      WHERE listing_id   = NEW.listing_id
        AND status       NOT IN ('cancelled','no_show')
        AND scheduled_at = NEW.scheduled_at
        AND id           != NEW.id
    ) THEN
      RAISE EXCEPTION 'Time slot already booked for this listing';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_double_book ON bookings;
CREATE TRIGGER trg_no_double_book
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trg_prevent_double_booking();

ALTER TABLE availability_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locks_select" ON availability_locks FOR SELECT
  USING (locked_by = auth.uid() OR is_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- § 7  DISPUTE & EVIDENCE SYSTEM
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disputes (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  opened_by       UUID NOT NULL REFERENCES profiles(id),
  against_user_id UUID REFERENCES profiles(id),
  entity_type     TEXT NOT NULL,  -- 'booking' | 'order' | 'ride' | 'rental' | 'property'
  entity_id       UUID NOT NULL,
  reason          TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'opened'
                    CHECK (status IN ('opened','under_review','resolved','refunded','closed')),
  resolution      TEXT,
  refund_amount   DECIMAL(14,2) DEFAULT 0,
  assigned_to     UUID REFERENCES profiles(id),  -- admin
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_uploads (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dispute_id  UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES profiles(id),
  file_url    TEXT NOT NULL,
  file_type   TEXT NOT NULL CHECK (file_type IN ('image','video','document','audio')),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_disputes_updated_at ON disputes;
CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Admin resolves dispute with optional wallet refund
CREATE OR REPLACE FUNCTION resolve_dispute(
  p_dispute_id   UUID,
  p_resolution   TEXT,
  p_refund_amount DECIMAL DEFAULT 0,
  p_admin_id     UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_opened_by UUID;
  v_wallet_id UUID;
BEGIN
  SELECT opened_by INTO v_opened_by FROM disputes WHERE id = p_dispute_id;

  UPDATE disputes SET
    status       = CASE WHEN p_refund_amount > 0 THEN 'refunded' ELSE 'resolved' END,
    resolution   = p_resolution,
    refund_amount = p_refund_amount,
    assigned_to  = p_admin_id,
    resolved_at  = now()
  WHERE id = p_dispute_id;

  -- If refund: compensate via ledger
  IF p_refund_amount > 0 THEN
    SELECT id INTO v_wallet_id FROM wallets
    WHERE user_id = v_opened_by AND wallet_type = 'consumer';

    PERFORM compensate(
      v_wallet_id,
      p_refund_amount,
      'dispute_resolution',
      'dispute',
      p_dispute_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE disputes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_select" ON disputes FOR SELECT
  USING (opened_by = auth.uid() OR against_user_id = auth.uid() OR is_admin());
CREATE POLICY "disputes_insert" ON disputes FOR INSERT
  WITH CHECK (opened_by = auth.uid());
CREATE POLICY "disputes_update" ON disputes FOR UPDATE
  USING (is_admin());

CREATE POLICY "evidence_select" ON evidence_uploads FOR SELECT
  USING (uploader_id = auth.uid() OR is_admin());
CREATE POLICY "evidence_insert" ON evidence_uploads FOR INSERT
  WITH CHECK (uploader_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- § 8  SUPPORT TICKETING SYSTEM
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_tickets (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES profiles(id),
  subject             TEXT NOT NULL,
  body                TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','in_progress','escalated','resolved','closed')),
  priority            TEXT NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('low','normal','high','urgent')),
  linked_entity_type  TEXT,   -- 'booking' | 'order' | 'dispute' | NULL
  linked_entity_id    UUID,
  assigned_to         UUID REFERENCES profiles(id), -- support staff
  escalation_level    INT NOT NULL DEFAULT 1,
  sla_due_at          TIMESTAMPTZ,
  sla_breached        BOOLEAN GENERATED ALWAYS AS (sla_due_at < now() AND status NOT IN ('resolved','closed')) STORED,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticket_id  UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES profiles(id),
  body       TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- internal staff notes
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_user   ON support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_sla    ON support_tickets(sla_due_at, status);
CREATE INDEX IF NOT EXISTS idx_ticket_msgs    ON ticket_messages(ticket_id, created_at);

-- Auto-set SLA on insert (normal=48h, high=24h, urgent=4h)
CREATE OR REPLACE FUNCTION set_sla_due() RETURNS TRIGGER AS $$
BEGIN
  NEW.sla_due_at := CASE NEW.priority
    WHEN 'low'    THEN now() + INTERVAL '72 hours'
    WHEN 'normal' THEN now() + INTERVAL '48 hours'
    WHEN 'high'   THEN now() + INTERVAL '24 hours'
    WHEN 'urgent' THEN now() + INTERVAL '4 hours'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_sla ON support_tickets;
CREATE TRIGGER trg_set_sla
  BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_sla_due();

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON support_tickets;
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_select" ON support_tickets FOR SELECT
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "tickets_insert" ON support_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "tickets_update" ON support_tickets FOR UPDATE
  USING (is_admin());

CREATE POLICY "ticket_msgs_select" ON ticket_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR is_admin()))
    AND (NOT is_internal OR is_admin())
  );
CREATE POLICY "ticket_msgs_insert" ON ticket_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- § 9  FRAUD & ABUSE DETECTION HOOKS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fraud_signals (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signal_type  TEXT NOT NULL CHECK (signal_type IN (
                 'repeat_cancel','excess_refund','fake_review',
                 'provider_abuse','wallet_abuse','multi_account'
               )),
  count        INT NOT NULL DEFAULT 1,
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT now(),
  auto_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  review_note  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, signal_type)
);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_user ON fraud_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flagged       ON fraud_signals(auto_flagged);

-- Increment fraud signal counter
CREATE OR REPLACE FUNCTION record_fraud_signal(
  p_user_id    UUID,
  p_signal     TEXT,
  p_threshold  INT DEFAULT 3
) RETURNS VOID AS $$
DECLARE v_count INT;
BEGIN
  INSERT INTO fraud_signals (user_id, signal_type, count, last_seen)
  VALUES (p_user_id, p_signal, 1, now())
  ON CONFLICT (user_id, signal_type)
  DO UPDATE SET count     = fraud_signals.count + 1,
                last_seen = now()
  RETURNING count INTO v_count;

  -- Auto-flag above threshold
  IF v_count >= p_threshold THEN
    UPDATE fraud_signals SET auto_flagged = TRUE
    WHERE user_id = p_user_id AND signal_type = p_signal;
    -- Enqueue review notification to admins
    PERFORM enqueue_job('fraud_review', jsonb_build_object(
      'user_id', p_user_id, 'signal', p_signal, 'count', v_count
    ));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-record cancellation signal
CREATE OR REPLACE FUNCTION trg_fraud_cancellation() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    PERFORM record_fraud_signal(NEW.customer_id, 'repeat_cancel', 5);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_cancel_fraud ON bookings;
CREATE TRIGGER trg_booking_cancel_fraud
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trg_fraud_cancellation();

ALTER TABLE fraud_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fraud_admin_only" ON fraud_signals FOR ALL
  USING (is_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- § 10  ROLE CONFLICT GUARDS
-- ─────────────────────────────────────────────────────────────────────────────

-- Guard: provider cannot book their own listing
CREATE OR REPLACE FUNCTION trg_no_self_booking() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id = NEW.provider_id THEN
    RAISE EXCEPTION 'Providers cannot book their own services';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_self_booking ON bookings;
CREATE TRIGGER trg_self_booking
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trg_no_self_booking();

-- Guard: seller cannot purchase their own product
CREATE OR REPLACE FUNCTION trg_no_self_purchase() RETURNS TRIGGER AS $$
DECLARE v_seller UUID;
BEGIN
  SELECT seller_id INTO v_seller FROM products WHERE id = NEW.product_id;
  IF v_seller IS NOT NULL AND v_seller = (
    SELECT customer_id FROM orders WHERE id = NEW.order_id
  ) THEN
    RAISE EXCEPTION 'Sellers cannot purchase their own products';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_self_purchase ON order_items;
CREATE TRIGGER trg_self_purchase
  BEFORE INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION trg_no_self_purchase();

-- Guard: agent cannot approve their own listing/property
CREATE OR REPLACE FUNCTION trg_no_self_approval() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF NEW.provider_id = auth.uid() THEN
      RAISE EXCEPTION 'Providers cannot approve their own listings';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_self_approval ON listings;
CREATE TRIGGER trg_self_approval
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION trg_no_self_approval();


-- ─────────────────────────────────────────────────────────────────────────────
-- § 11  OBSERVABILITY & AUDIT
-- ─────────────────────────────────────────────────────────────────────────────

-- Structured audit log for sensitive actions
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  actor_id    UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,   -- 'approve_listing' | 'suspend_user' | 'resolve_dispute' | etc.
  table_name  TEXT,
  row_id      UUID,
  old_val     JSONB,
  new_val     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_log(actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_table  ON audit_log(table_name, row_id);

-- Time-series metrics for conversion/failure/latency tracking
CREATE TABLE IF NOT EXISTS metrics (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  metric_name  TEXT NOT NULL,
  value        DECIMAL(14,4) NOT NULL,
  labels       JSONB DEFAULT '{}',
  ts           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name, ts DESC);

-- Record a metric (callable from Edge Functions)
CREATE OR REPLACE FUNCTION record_metric(
  p_name   TEXT,
  p_value  DECIMAL,
  p_labels JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO metrics (metric_name, value, labels) VALUES (p_name, p_value, p_labels);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevent audit log tampering
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log is immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_immutable ON audit_log;
CREATE TRIGGER trg_audit_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin" ON audit_log FOR SELECT USING (is_admin());
CREATE POLICY "audit_insert" ON audit_log FOR INSERT WITH CHECK (true);
CREATE POLICY "metrics_admin" ON metrics FOR ALL USING (is_admin());
CREATE POLICY "metrics_insert" ON metrics FOR INSERT WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- § 12  REGULATORY KILL SWITCHES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flags (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  flag_key     TEXT NOT NULL,         -- e.g. 'health_booking', 'ecommerce', 'transport'
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  region       TEXT DEFAULT 'GH',     -- ISO country code or 'ALL'
  vertical     TEXT DEFAULT 'all',    -- category slug or 'all'
  reason       TEXT,                  -- why toggled
  updated_by   UUID REFERENCES profiles(id),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (flag_key, region, vertical)
);

-- Seed default flags (all enabled)
INSERT INTO feature_flags (flag_key, region, vertical) VALUES
  ('transport',       'GH', 'transport'),
  ('ecommerce',       'GH', 'ecommerce'),
  ('health',          'GH', 'health'),
  ('beauty',          'GH', 'beauty'),
  ('home_services',   'GH', 'home-services'),
  ('real_estate',     'GH', 'real-estate'),
  ('rentals',         'GH', 'rentals'),
  ('chat',            'GH', 'all'),
  ('reviews',         'GH', 'all'),
  ('wallet_topup',    'GH', 'all'),
  ('provider_signup', 'GH', 'all'),
  ('emergency_shutdown', 'GH', 'all')
ON CONFLICT DO NOTHING;

-- Check flag (used in RPCs / Edge Functions before processing requests)
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_flag_key TEXT,
  p_region   TEXT DEFAULT 'GH',
  p_vertical TEXT DEFAULT 'all'
) RETURNS BOOLEAN AS $$
DECLARE v_result BOOLEAN;
BEGIN
  SELECT enabled INTO v_result
  FROM feature_flags
  WHERE flag_key = p_flag_key
    AND (region = p_region OR region = 'ALL')
    AND (vertical = p_vertical OR vertical = 'all')
  LIMIT 1;
  RETURN COALESCE(v_result, TRUE); -- default: enabled if no flag configured
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_read_all" ON feature_flags FOR SELECT USING (true); -- frontend can read
CREATE POLICY "flags_write_admin" ON feature_flags FOR ALL USING (is_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- FINAL: indexes for new tables
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_disputes_entity     ON disputes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status     ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_med_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_pat   ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_contracts_property  ON property_contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key   ON feature_flags(flag_key, region);
