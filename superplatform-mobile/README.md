# SuperPlatform GH — Mobile App (React Native + Expo)

Ghana's all-in-one super-platform. 7 categories, real-time chat, GPS tracking, mobile payments.

## Tech Stack

| Layer       | Technology |
|-------------|------------|
| Framework   | React Native 0.73 + Expo SDK 50 |
| Navigation  | React Navigation v6 (Stack + Bottom Tabs) |
| State       | Zustand |
| Backend     | Supabase (Auth + DB + Storage + Realtime) |
| Payments    | MTN MoMo · Vodafone Cash · AirtelTigo · Card (Paystack) |
| Maps        | react-native-maps (Google Maps) |
| Location    | expo-location |
| Push Notifs | expo-notifications → Expo Push Service |
| Preview     | Expo Go |

## Getting Started

```bash
# 1. Install dependencies
cd superplatform-mobile
npm install

# 2. Set up environment
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# 3. Set up Supabase database (run web schema first)
# See ../superplatform/supabase/schema.sql

# 4. Start development
npx expo start

# Scan QR code with Expo Go app on your phone
```

## Project Structure

```
src/
├── components/
│   ├── cards/
│   │   └── ProviderCard.js          # Reusable provider card
│   ├── payment/
│   │   └── PaymentSheet.js          # MoMo / Card / Wallet payment modal
│   └── ui/
│       └── index.js                 # Card, Button, Badge, Avatar, StarRating, etc.
├── hooks/
│   ├── useNotifications.js          # Push token registration + listeners
│   ├── useLocation.js               # GPS with provider broadcasting
│   └── useRealtimeBookings.js       # Live booking updates via Supabase
├── lib/
│   ├── constants.js                 # Colors, categories, payment methods
│   └── supabase.js                  # Supabase client (SecureStore adapter)
├── navigation/
│   └── RootNavigator.js             # Role-based routing (customer/provider/admin)
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.js
│   │   └── RegisterScreen.js
│   ├── admin/
│   │   └── AdminDashboardScreen.js  # Approve providers & listings, view stats
│   ├── beauty/
│   │   └── BeautyScreen.js          # Salons, services, fashion shop
│   ├── chat/
│   │   ├── ChatListScreen.js        # All conversations with real-time unread count
│   │   └── ChatDetailScreen.js      # Real-time messaging via Supabase
│   ├── customer/
│   │   ├── HomeScreen.js            # Hero slider + category grid
│   │   ├── CustomerDashboardScreen.js
│   │   └── PaymentScreen.js
│   ├── ecommerce/
│   │   └── EcommerceScreen.js       # Shop + Second-hand + Cart + Orders
│   ├── health/
│   │   └── HealthScreen.js          # Doctors + Lab tests + Pharmacy + Mental health
│   ├── homeservices/
│   │   └── HomeServicesScreen.js    # Plumbing, electrical, carpenter, etc.
│   ├── profile/
│   │   └── ProfileScreen.js         # Edit profile, wallet, settings, notifications
│   ├── provider/
│   │   ├── ProviderDashboardScreen.js  # Onboarding + listings + bookings + earnings
│   │   └── ProviderDetailScreen.js     # Gallery + services + reviews + book
│   ├── realestate/
│   │   └── RealEstateScreen.js      # Property listings with filters
│   ├── rentals/
│   │   └── RentalsScreen.js         # Car, equipment, event space rentals
│   └── transport/
│       └── TransportScreen.js       # GPS map + ride booking + driver cards
├── store/
│   ├── authStore.js                 # Auth state + profile + sign in/up/out
│   └── cartStore.js                 # Shopping cart
└── utils/
    ├── helpers.js                   # fmt, fmtDate, makeCall, openMaps
    └── theme.js                     # Theme tokens
```

## Role-Based Navigation

| Role     | Screens Available |
|----------|------------------|
| Customer | Home, all 7 categories, shop, chat, account, profile |
| Provider | Provider dashboard (onboarding → listings → bookings → earnings), chat, profile |
| Admin    | Admin dashboard (providers, listings, users, transactions), profile |

## Real-time Features

- **Chat**: Supabase Realtime `postgres_changes` on `messages` table
- **Unread badge**: Live count on Messages tab
- **Booking updates**: Provider sees new bookings instantly
- **Driver location**: Provider broadcasts GPS every 10s via `useLocation(broadcast: true)`

## Payment Flow

1. User taps "Book" / "Checkout"
2. `PaymentSheet` modal opens
3. User selects method (MTN MoMo, Vodafone, AirtelTigo, Card, SP Wallet)
4. For MoMo: Supabase Edge Function calls MTN MoMo API → user gets prompt on phone
5. Transaction logged to `wallet_transactions` table
6. Booking status updated to `confirmed`

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Configure builds
eas build:configure

# Build APK (Android)
eas build --platform android --profile preview

# Build for App Store (iOS)
eas build --platform ios

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

## Push Notifications

- Uses Expo Push Notification Service
- Tokens stored in `profiles.push_token`
- Triggered via `send-notification` Supabase Edge Function
- Booking notifications sent via `on-booking-created` webhook

## Environment Variables

See `.env.example` for all required variables.
