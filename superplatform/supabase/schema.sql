-- ═══════════════════════════════════════════════════════════════════════════
-- SUPERPLATFORM GH — PRODUCTION DATABASE SCHEMA v2
-- Run: Supabase Dashboard → SQL Editor → New Query → Run All
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT NOT NULL,
  full_name            TEXT,
  phone                TEXT,
  avatar_url           TEXT,
  role                 TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','provider','admin')),
  category             TEXT,
  is_approved          BOOLEAN DEFAULT FALSE,
  is_online            BOOLEAN DEFAULT FALSE,
  onboarding_complete  BOOLEAN DEFAULT FALSE,
  wallet_balance       DECIMAL(12,2) DEFAULT 0,
  rating               DECIMAL(3,2) DEFAULT 0,
  total_reviews        INT DEFAULT 0,
  trips_completed      INT DEFAULT 0,
  jobs_completed       INT DEFAULT 0,
  bio                  TEXT,
  location             TEXT,
  vehicle_type         TEXT,
  vehicle_plate        TEXT,
  vehicle_color        TEXT,
  current_lat          DECIMAL(10,8),
  current_lng          DECIMAL(11,8),
  id_type              TEXT,
  id_number            TEXT,
  id_verified          BOOLEAN DEFAULT FALSE,
  paystack_customer_id TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, icon TEXT, color TEXT,
  active BOOLEAN DEFAULT TRUE, sort_order INT DEFAULT 0
);
INSERT INTO categories (slug,name,icon,color,sort_order) VALUES
  ('transport','Transport','🚗','#3b82f6',1),('home-services','Home Services','🔧','#10b981',2),
  ('beauty','Beauty & Fashion','💄','#ec4899',3),('health','Health Services','🏥','#ef4444',4),
  ('ecommerce','E-Commerce','🛍️','#f97316',5),('real-estate','Real Estate','🏠','#8b5cf6',6),
  ('rentals','Rentals','🔑','#06b6d4',7)
ON CONFLICT(slug) DO NOTHING;

-- PROMO SLIDES
CREATE TABLE IF NOT EXISTS promo_slides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, title TEXT NOT NULL, subtitle TEXT,
  image_url TEXT NOT NULL, cta_label TEXT, cta_link TEXT,
  active BOOLEAN DEFAULT TRUE, order_index INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()
);

-- LISTINGS
CREATE TABLE IF NOT EXISTS listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
  price DECIMAL(12,2) NOT NULL, price_type TEXT DEFAULT 'fixed',
  images TEXT[] DEFAULT '{}', tags TEXT[] DEFAULT '{}', location TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','inactive')),
  is_featured BOOLEAN DEFAULT FALSE, rating DECIMAL(3,2) DEFAULT 0, total_reviews INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id), provider_id UUID NOT NULL REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id), service_name TEXT NOT NULL, category TEXT,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled','no_show')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  scheduled_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, notes TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5), review TEXT, address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- RIDES
CREATE TABLE IF NOT EXISTS rides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id), driver_id UUID REFERENCES profiles(id),
  pickup_addr TEXT NOT NULL, dropoff_addr TEXT NOT NULL,
  pickup_lat DECIMAL(10,8), pickup_lng DECIMAL(11,8),
  dropoff_lat DECIMAL(10,8), dropoff_lng DECIMAL(11,8),
  ride_type TEXT DEFAULT 'standard', fare DECIMAL(12,2), distance_km DECIMAL(8,2),
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested','accepted','arriving','in_progress','completed','cancelled')),
  payment_status TEXT DEFAULT 'pending', started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  rating INT, created_at TIMESTAMPTZ DEFAULT now()
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL, description TEXT, price DECIMAL(12,2) NOT NULL,
  original_price DECIMAL(12,2), category TEXT,
  condition TEXT DEFAULT 'new' CHECK (condition IN ('new','used','refurbished')),
  images TEXT[] DEFAULT '{}', stock INT DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','sold','inactive')),
  is_featured BOOLEAN DEFAULT FALSE, rating DECIMAL(3,2) DEFAULT 0, total_reviews INT DEFAULT 0,
  views INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  total DECIMAL(12,2) NOT NULL, subtotal DECIMAL(12,2), delivery_fee DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  payment_status TEXT DEFAULT 'pending', payment_method TEXT,
  delivery_addr TEXT, delivery_lat DECIMAL(10,8), delivery_lng DECIMAL(11,8), notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id), title TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL, qty INT NOT NULL DEFAULT 1, image_url TEXT
);

-- PROPERTIES
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL, description TEXT,
  type TEXT CHECK (type IN ('rent','sale','land')),
  prop_type TEXT CHECK (prop_type IN ('house','apartment','commercial','land','office')),
  price DECIMAL(14,2) NOT NULL, bedrooms INT, bathrooms INT, size_sqm DECIMAL(10,2),
  location TEXT, area TEXT, city TEXT DEFAULT 'Accra', images TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','sold','rented','inactive')),
  is_featured BOOLEAN DEFAULT FALSE, lat DECIMAL(10,8), lng DECIMAL(11,8),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RENTALS
CREATE TABLE IF NOT EXISTS rentals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL, description TEXT,
  type TEXT CHECK (type IN ('car','equipment','venue','other')),
  price_day DECIMAL(12,2), price_hour DECIMAL(12,2), deposit DECIMAL(12,2) DEFAULT 0,
  images TEXT[] DEFAULT '{}', specs JSONB DEFAULT '{}', location TEXT,
  available BOOLEAN DEFAULT TRUE, status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT now()
);

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_1 UUID NOT NULL REFERENCES profiles(id),
  participant_2 UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(participant_1, participant_2)
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL, type TEXT DEFAULT 'text' CHECK (type IN ('text','image','file','booking')),
  attachment_url TEXT, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()
);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  provider_id UUID REFERENCES profiles(id), product_id UUID REFERENCES products(id),
  listing_id UUID REFERENCES listings(id), booking_id UUID REFERENCES bookings(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5), comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL, body TEXT, type TEXT DEFAULT 'general', data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()
);

-- WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id), amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('topup','payment','refund','payout','commission','adjustment')),
  description TEXT, reference TEXT, booking_id UUID, order_id UUID, ride_id UUID,
  status TEXT DEFAULT 'completed', created_at TIMESTAMPTZ DEFAULT now()
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id), amount DECIMAL(12,2) NOT NULL, method TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  reference TEXT UNIQUE, booking_id UUID REFERENCES bookings(id),
  order_id UUID REFERENCES orders(id), ride_id UUID REFERENCES rides(id),
  meta JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now()
);

-- FAVORITES
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('product','listing','property','provider')),
  target_id UUID NOT NULL, created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

-- COMMISSION RULES
CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, category TEXT NOT NULL UNIQUE,
  rate DECIMAL(5,4) NOT NULL, min_amount DECIMAL(12,2) DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO commission_rules (category,rate) VALUES
  ('transport',0.12),('home-services',0.15),('beauty',0.15),('health',0.10),
  ('ecommerce',0.08),('real-estate',0.03),('rentals',0.10)
ON CONFLICT(category) DO NOTHING;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_role         ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_category     ON profiles(category);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online    ON profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_listings_category     ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_status       ON listings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer     ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider     ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status       ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer       ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_rides_customer        ON rides(customer_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver          ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status          ON rides(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created      ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_user      ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_products_seller       ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status       ON products(status);
CREATE INDEX IF NOT EXISTS idx_favorites_user        ON favorites(user_id);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER;

-- Profile policies
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin());

-- Listing policies
CREATE POLICY "listings_select" ON listings FOR SELECT USING (status = 'approved' OR provider_id = auth.uid() OR is_admin());
CREATE POLICY "listings_insert" ON listings FOR INSERT WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "listings_update" ON listings FOR UPDATE USING (provider_id = auth.uid() OR is_admin());

-- Booking policies
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (customer_id = auth.uid() OR provider_id = auth.uid() OR is_admin());
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (customer_id = auth.uid() OR provider_id = auth.uid() OR is_admin());

-- Ride policies
CREATE POLICY "rides_select" ON rides FOR SELECT USING (customer_id = auth.uid() OR driver_id = auth.uid() OR is_admin());
CREATE POLICY "rides_insert" ON rides FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "rides_update" ON rides FOR UPDATE USING (customer_id = auth.uid() OR driver_id = auth.uid() OR is_admin());

-- Message policies
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  EXISTS(SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS(SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (sender_id = auth.uid() OR is_admin());

-- Conversation policies
CREATE POLICY "convs_select" ON conversations FOR SELECT USING (participant_1 = auth.uid() OR participant_2 = auth.uid() OR is_admin());
CREATE POLICY "convs_insert" ON conversations FOR INSERT WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Notification policies
CREATE POLICY "notifs_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifs_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifs_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Wallet policies
CREATE POLICY "wallet_select" ON wallet_transactions FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "wallet_insert" ON wallet_transactions FOR INSERT WITH CHECK (true);

-- Payment policies
CREATE POLICY "payments_select" ON payments FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Order policies
CREATE POLICY "orders_select" ON orders FOR SELECT USING (customer_id = auth.uid() OR is_admin());
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (customer_id = auth.uid() OR is_admin());
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (EXISTS(SELECT 1 FROM orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR is_admin())));
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (true);

-- Product policies
CREATE POLICY "products_select" ON products FOR SELECT USING (status = 'approved' OR seller_id = auth.uid() OR is_admin());
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "products_update" ON products FOR UPDATE USING (seller_id = auth.uid() OR is_admin());

-- Property policies
CREATE POLICY "properties_select" ON properties FOR SELECT USING (true);
CREATE POLICY "properties_insert" ON properties FOR INSERT WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "properties_update" ON properties FOR UPDATE USING (agent_id = auth.uid() OR is_admin());

-- Rental policies
CREATE POLICY "rentals_select" ON rentals FOR SELECT USING (true);
CREATE POLICY "rentals_insert" ON rentals FOR INSERT WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "rentals_update" ON rentals FOR UPDATE USING (provider_id = auth.uid() OR is_admin());

-- Favorite policies
CREATE POLICY "favs_select" ON favorites FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "favs_insert" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favs_delete" ON favorites FOR DELETE USING (user_id = auth.uid());

-- Review policies
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at   ON profiles;   CREATE TRIGGER trg_profiles_updated_at   BEFORE UPDATE ON profiles   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_listings_updated_at   ON listings;   CREATE TRIGGER trg_listings_updated_at   BEFORE UPDATE ON listings   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_bookings_updated_at   ON bookings;   CREATE TRIGGER trg_bookings_updated_at   BEFORE UPDATE ON bookings   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_orders_updated_at     ON orders;     CREATE TRIGGER trg_orders_updated_at     BEFORE UPDATE ON orders     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_convs_updated_at      ON conversations; CREATE TRIGGER trg_convs_updated_at  BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, phone, role, wallet_balance)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone', COALESCE(NEW.raw_user_meta_data->>'role','customer'), 0)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_provider_rating() RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET
    rating = (SELECT AVG(rating) FROM reviews WHERE provider_id = NEW.provider_id),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE provider_id = NEW.provider_id)
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_rating ON reviews;
CREATE TRIGGER trg_update_rating AFTER INSERT ON reviews FOR EACH ROW WHEN (NEW.provider_id IS NOT NULL) EXECUTE FUNCTION update_provider_rating();

CREATE OR REPLACE FUNCTION update_conversation_on_message() RETURNS TRIGGER AS $$
BEGIN UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id; RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conv_message ON messages;
CREATE TRIGGER trg_conv_message AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

CREATE OR REPLACE FUNCTION deduct_wallet(p_user_id UUID, p_amount DECIMAL) RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET wallet_balance = wallet_balance - p_amount WHERE id = p_user_id AND wallet_balance >= p_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION topup_wallet(p_user_id UUID, p_amount DECIMAL) RETURNS VOID AS $$
BEGIN UPDATE profiles SET wallet_balance = wallet_balance + p_amount WHERE id = p_user_id; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE rides;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- STORAGE BUCKETS (uncomment and run separately after creating buckets in dashboard)
-- INSERT INTO storage.buckets (id,name,public) VALUES ('avatars','avatars',true),('listings','listings',true),('products','products',true),('documents','documents',false) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHEMA PATCH v3 — Missing columns & indexes for mobile features
-- ═══════════════════════════════════════════════════════════════════════════

-- Add missing columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialty         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_price        DECIMAL(10,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consultation_fee  DECIMAL(10,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability      TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reviews_count     INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended      BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fuel_type         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seats             INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transmission      TEXT;

-- Add missing columns to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_type      TEXT DEFAULT 'standard'; -- 'standard' | 'second_hand'
ALTER TABLE listings ADD COLUMN IF NOT EXISTS transaction_type  TEXT; -- 'Rent' | 'Sale' for real-estate
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bedrooms          INT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bathrooms         INT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS area_sqft         INT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_phone     TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS available         BOOLEAN DEFAULT TRUE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS badge             TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS fuel_type         TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS reviewed_at       TIMESTAMPTZ;

-- Add missing columns to bookings  
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes             TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_price       DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS scheduled_at      TIMESTAMPTZ;

-- Add missing columns to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read           BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id       UUID REFERENCES profiles(id);

-- Add missing columns to wallet_transactions
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS phone           TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS payment_method  TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS description     TEXT;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_receiver     ON messages(receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conv         ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_provider     ON bookings(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer     ON bookings(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_category     ON listings(category, status);
CREATE INDEX IF NOT EXISTS idx_profiles_role         ON profiles(role, is_approved);
CREATE INDEX IF NOT EXISTS idx_wallet_user           ON wallet_transactions(user_id, created_at);

-- Enable realtime on required tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ── RLS Policies (safe additions) ────────────────────────────────────────────

-- Messages: users can read messages in their conversations
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages FOR UPDATE
  USING (receiver_id = auth.uid());

-- Conversations
DROP POLICY IF EXISTS "conv_select" ON conversations;
CREATE POLICY "conv_select" ON conversations FOR SELECT
  USING (customer_id = auth.uid() OR provider_id = auth.uid());

DROP POLICY IF EXISTS "conv_insert" ON conversations;
CREATE POLICY "conv_insert" ON conversations FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Bookings
DROP POLICY IF EXISTS "bookings_select" ON bookings;
CREATE POLICY "bookings_select" ON bookings FOR SELECT
  USING (customer_id = auth.uid() OR provider_id = auth.uid());

-- Wallet transactions
DROP POLICY IF EXISTS "wallet_select" ON wallet_transactions;
CREATE POLICY "wallet_select" ON wallet_transactions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wallet_insert" ON wallet_transactions;
CREATE POLICY "wallet_insert" ON wallet_transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ── Admin bypass policies ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_profiles" ON profiles;
CREATE POLICY "admin_all_profiles" ON profiles FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    OR id = auth.uid()
  );

DROP POLICY IF EXISTS "admin_all_listings" ON listings;
CREATE POLICY "admin_all_listings" ON listings FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    OR user_id = auth.uid()
  );


-- Push notification token
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

