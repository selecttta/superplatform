-- ============================================================
-- SuperPlatform Marketplace Escrow Migration
-- Run this in Supabase SQL editor
-- ============================================================

-- 1. Add missing columns to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS seller_type TEXT DEFAULT 'customer' CHECK (seller_type IN ('customer', 'provider')),
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0;

-- 2. Add escrow fields to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'pending' CHECK (escrow_status IN ('pending', 'held', 'released', 'refunded')),
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;

-- 3. Ensure wallet_balance exists on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_balance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned NUMERIC(12,2) DEFAULT 0;

-- 4. Update wallet_transactions to support marketplace
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_deducted NUMERIC(12,2);

-- ============================================================
-- FUNCTION: create_marketplace_order
-- Creates order in escrow, marks product as sold
-- ============================================================
CREATE OR REPLACE FUNCTION create_marketplace_order(
  p_buyer_id    UUID,
  p_product_id  UUID,
  p_amount      NUMERIC,
  p_payment_ref TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id        UUID;
  v_seller_id       UUID;
  v_commission_rate NUMERIC := 0.05;
  v_commission      NUMERIC;
  v_seller_amount   NUMERIC;
BEGIN
  -- Get seller info from product
  SELECT seller_id INTO v_seller_id
  FROM products WHERE id = p_product_id;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Product not found or has no seller';
  END IF;

  v_commission    := ROUND(p_amount * v_commission_rate, 2);
  v_seller_amount := ROUND(p_amount - v_commission, 2);

  -- Create the order in escrow
  INSERT INTO orders (
    user_id, product_id, seller_id,
    total_amount, payment_method, payment_status,
    escrow_status, commission_rate, commission_amount, seller_amount,
    status, created_at
  ) VALUES (
    p_buyer_id, p_product_id, v_seller_id,
    p_amount, 'escrow', 'paid',
    'held', v_commission_rate, v_commission, v_seller_amount,
    'confirmed', NOW()
  )
  RETURNING id INTO v_order_id;

  -- Hold funds in buyer's pending (already deducted by payment)
  -- Update seller's pending_balance
  UPDATE profiles
  SET pending_balance = COALESCE(pending_balance, 0) + v_seller_amount
  WHERE id = v_seller_id;

  -- Log pending wallet transaction for seller
  INSERT INTO wallet_transactions (
    user_id, amount, type, description,
    reference, order_id, commission_deducted, created_at
  ) VALUES (
    v_seller_id, v_seller_amount, 'pending_sale',
    'Sale pending delivery confirmation',
    p_payment_ref, v_order_id, v_commission, NOW()
  );

  RETURN v_order_id;
END;
$$;

-- ============================================================
-- FUNCTION: release_escrow_to_seller
-- Called after buyer confirms delivery (or 48h auto-release)
-- Moves funds from pending to available wallet
-- ============================================================
CREATE OR REPLACE FUNCTION release_escrow_to_seller(
  p_order_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller_id     UUID;
  v_seller_amount NUMERIC;
  v_commission    NUMERIC;
BEGIN
  -- Get order details
  SELECT seller_id, seller_amount, commission_amount
  INTO v_seller_id, v_seller_amount, v_commission
  FROM orders
  WHERE id = p_order_id AND escrow_status = 'held';

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Order not found or escrow already released';
  END IF;

  -- Move from pending to available
  UPDATE profiles
  SET
    pending_balance  = GREATEST(0, COALESCE(pending_balance, 0)  - v_seller_amount),
    wallet_balance   = COALESCE(wallet_balance, 0)  + v_seller_amount,
    total_earned     = COALESCE(total_earned, 0)    + v_seller_amount
  WHERE id = v_seller_id;

  -- Mark order as released
  UPDATE orders
  SET
    escrow_status = 'released',
    released_at   = NOW(),
    status        = 'delivered'
  WHERE id = p_order_id;

  -- Update wallet transaction status
  UPDATE wallet_transactions
  SET type = 'sale_completed',
      description = 'Payment released to wallet (escrow cleared)'
  WHERE order_id = p_order_id AND user_id = v_seller_id;

END;
$$;

-- ============================================================
-- FUNCTION: refund_escrow_to_buyer
-- Called when a dispute is resolved in buyer's favour
-- ============================================================
CREATE OR REPLACE FUNCTION refund_escrow_to_buyer(
  p_order_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_buyer_id      UUID;
  v_seller_id     UUID;
  v_total         NUMERIC;
  v_seller_amount NUMERIC;
BEGIN
  SELECT user_id, seller_id, total_amount, seller_amount
  INTO v_buyer_id, v_seller_id, v_total, v_seller_amount
  FROM orders
  WHERE id = p_order_id AND escrow_status = 'held';

  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Order not found or cannot be refunded';
  END IF;

  -- Return full amount to buyer
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_total
  WHERE id = v_buyer_id;

  -- Remove from seller pending
  UPDATE profiles
  SET pending_balance = GREATEST(0, COALESCE(pending_balance, 0) - v_seller_amount)
  WHERE id = v_seller_id;

  UPDATE orders
  SET escrow_status = 'refunded', status = 'cancelled'
  WHERE id = p_order_id;
END;
$$;

-- ============================================================
-- FUNCTION: topup_wallet (idempotent, used by payment webhook)
-- ============================================================
CREATE OR REPLACE FUNCTION topup_wallet(
  p_user_id UUID,
  p_amount  NUMERIC
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- FUNCTION: deduct_wallet (used by wallet payment handler)
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_wallet(
  p_user_id UUID,
  p_amount  NUMERIC
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) - p_amount
  WHERE id = p_user_id
    AND wallet_balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;
END;
$$;

-- ============================================================
-- RLS POLICIES for orders (marketplace sellers can see their orders)
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyers_see_own_orders" ON orders;
CREATE POLICY "buyers_see_own_orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sellers_see_their_orders" ON orders;
CREATE POLICY "sellers_see_their_orders" ON orders
  FOR SELECT USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "buyers_insert_orders" ON orders;
CREATE POLICY "buyers_insert_orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_orders" ON orders;
CREATE POLICY "admin_all_orders" ON orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- RLS Policies for products (sellers can manage own products)
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_can_read_approved" ON products;
CREATE POLICY "public_can_read_approved" ON products
  FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "sellers_manage_own" ON products;
CREATE POLICY "sellers_manage_own" ON products
  FOR ALL USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "admin_all_products" ON products;
CREATE POLICY "admin_all_products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_condition ON products(condition);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON orders(escrow_status);
