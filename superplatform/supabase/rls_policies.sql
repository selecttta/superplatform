-- Supabase Row Level Security (RLS) Policies for SuperPlatform v4
-- Run this script in the Supabase SQL Editor

-- ─────────────────────────────────────────────────────────────────
-- 1. Enable RLS on all tables
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────
-- 2. Profiles (Users)
-- ─────────────────────────────────────────────────────────────────
-- Anyone can view public profile info (for provider details, reviews)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Users can insert their own profile on signup
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────
-- 3. Listings (Products & Services)
-- ─────────────────────────────────────────────────────────────────
-- Anyone can view active listings
CREATE POLICY "Active listings are public" ON listings
  FOR SELECT USING (status = 'active');

-- Providers/Admins can view their own pending/rejected listings
CREATE POLICY "Providers view own listings" ON listings
  FOR SELECT USING (auth.uid() = provider_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Providers can insert their own listings
CREATE POLICY "Providers can insert listings" ON listings
  FOR INSERT WITH CHECK (auth.uid() = provider_id);

-- Providers can update their own listings
CREATE POLICY "Providers can update own listings" ON listings
  FOR UPDATE USING (auth.uid() = provider_id);

-- Admins can update any listing (to approve/reject)
CREATE POLICY "Admins can update any listing" ON listings
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─────────────────────────────────────────────────────────────────
-- 4. Bookings
-- ─────────────────────────────────────────────────────────────────
-- Customers view their bookings; Providers view their bookings; Admins view all
CREATE POLICY "Users view own bookings" ON bookings
  FOR SELECT USING (
    auth.uid() = customer_id OR 
    auth.uid() = provider_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Customers can create bookings
CREATE POLICY "Customers can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Both parties (Customer/Provider) or Admin can update booking status
CREATE POLICY "Participants can update booking" ON bookings
  FOR UPDATE USING (
    auth.uid() = customer_id OR 
    auth.uid() = provider_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────
-- 5. Orders (E-commerce)
-- ─────────────────────────────────────────────────────────────────
-- Customers view their orders; Admins view all
CREATE POLICY "Customers view own orders" ON orders
  FOR SELECT USING (
    auth.uid() = customer_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Customers can create orders
CREATE POLICY "Customers can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Admins can update orders
CREATE POLICY "Admins can update orders" ON orders
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─────────────────────────────────────────────────────────────────
-- 6. Reviews
-- ─────────────────────────────────────────────────────────────────
-- Reviews are public
CREATE POLICY "Reviews are public" ON reviews
  FOR SELECT USING (true);

-- Authenticated users can write reviews
CREATE POLICY "Auth users can insert reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Users can only update/delete their own reviews
CREATE POLICY "Users update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Users delete own reviews" ON reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- ─────────────────────────────────────────────────────────────────
-- 7. Notifications
-- ─────────────────────────────────────────────────────────────────
-- Users can only see their own notifications
CREATE POLICY "Users view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Admins/System can insert notifications (via Functions usually)
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true); -- In a real app, restrict this to service role or functions

-- Users can update (mark read) their own notifications
CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- 8. Chat Conversations & Messages
-- ─────────────────────────────────────────────────────────────────
-- Users can view conversations they are part of
CREATE POLICY "Participants view conversations" ON conversations
  FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = provider_id);

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = customer_id OR auth.uid() = provider_id);

-- Users can view messages in their conversations
CREATE POLICY "Participants view messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = messages.conversation_id 
      AND (c.customer_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

-- Users can send messages to their conversations
CREATE POLICY "Participants send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND 
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = conversation_id 
      AND (c.customer_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );
