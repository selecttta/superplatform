# SuperPlatform GH — Web App (React + Tailwind CSS)

## Tech Stack

| Layer       | Technology |
|-------------|------------|
| Frontend    | React 18 + Tailwind CSS |
| Routing     | React Router v6 |
| State       | Zustand (auth, cart, favorites) |
| Animations  | Framer Motion |
| Backend     | Supabase (Auth + DB + Storage + Realtime) |
| Payments    | MTN MoMo · Vodafone Cash · AirtelTigo · Paystack (card) |
| Edge Fns    | Supabase Edge Functions (Deno) |

## Getting Started

```bash
cd superplatform
npm install
cp .env.example .env.local   # fill in Supabase credentials
npm start
```

## Supabase Setup

```bash
# 1. Create project at https://supabase.com
# 2. Go to SQL Editor → New Query → paste schema.sql content → Run
# 3. Enable Realtime on: messages, bookings, notifications, profiles
# 4. Create storage buckets: avatars, listings
# 5. Deploy edge functions:
supabase functions deploy process-momo-payment
supabase functions deploy send-otp
supabase functions deploy send-notification
supabase functions deploy on-booking-created

# 6. Set secrets:
supabase secrets set MOMO_API_USER=xxx
supabase secrets set MOMO_API_KEY=xxx
supabase secrets set MOMO_ENV=production
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx
```

## Project Structure

```
src/
├── components/
│   ├── auth/ProtectedRoute.jsx
│   ├── common/
│   │   ├── Navbar.jsx           # Search + favorites + cart + notifications
│   │   ├── CategorySlider.jsx   # Homepage category hero sliders
│   │   ├── BookingModal.jsx
│   │   ├── PaymentModal.jsx     # MoMo + Card + Wallet payments
│   │   ├── Footer.jsx
│   │   └── StarRating.jsx
│   ├── ecommerce/ProductCard.jsx
│   └── home/HeroSlider.jsx      # 8-slide animated hero
├── pages/
│   ├── HomePage.jsx
│   ├── TransportPage.jsx        # Map + booking + provider cards
│   ├── HealthPage.jsx           # Doctors with consistent image sizing
│   ├── EcommercePage.jsx
│   ├── BeautyPage.jsx           # Tailor, Fashion Stylist, Salons
│   ├── HomeServicesPage.jsx     # Carpenter, Appliance Repair + providers
│   ├── RealEstatePage.jsx
│   ├── RentalsPage.jsx
│   ├── FavoritesPage.jsx        # Saved providers, services, products
│   ├── ProviderDetailPage.jsx   # Gallery + tabs + sticky booking
│   ├── ChatPage.jsx             # Real-time messaging
│   ├── CustomerDashboard.jsx
│   ├── ProviderDashboard.jsx
│   ├── AdminDashboard.jsx
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   └── ProfilePage.jsx
├── store/
│   ├── authStore.js
│   ├── cartStore.js
│   └── favStore.js              # Persistent favorites
└── lib/
    ├── supabase.js
    └── constants.js             # All categories, services, providers
```

## Demo Accounts

| Email              | Password  | Role     |
|--------------------|-----------|----------|
| customer@demo.com  | demo1234  | Customer |
| provider@demo.com  | demo1234  | Provider |
| admin@demo.com     | demo1234  | Admin    |
