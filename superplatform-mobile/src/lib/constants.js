// ─── App Config ──────────────────────────────────────────────────────────────
export const APP_NAME = 'SuperPlatform GH';
export const APP_TAGLINE = 'Transport, services, shopping, health & more.';
export const CURRENCY = 'GH₵';

// ─── PRODUCTS ───────────────────────────────────────────────────────────────
export const PRODUCTS = [
  { id: 1, name: 'iPhone 15 Pro Max 256GB', price: 5200, original: 6000, img: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80', rating: 4.9, reviews: 312, cat: 'Electronics', badge: 'HOT', isNew: true },
  { id: 2, name: 'Samsung 65" 4K QLED Smart TV', price: 3400, original: 4100, img: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&q=80', rating: 4.7, reviews: 201, cat: 'Electronics', badge: 'SALE', isNew: false },
  { id: 3, name: 'Nike Air Max 2024', price: 580, original: 780, img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', rating: 4.8, reviews: 445, cat: 'Fashion', badge: 'NEW', isNew: true },
  { id: 4, name: 'Sony PlayStation 5 Slim', price: 3900, original: 4300, img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=80', rating: 4.9, reviews: 589, cat: 'Gaming', badge: 'HOT', isNew: false },
  { id: 5, name: 'MacBook Air M3 13"', price: 9200, original: 9900, img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80', rating: 4.9, reviews: 178, cat: 'Computers', badge: null, isNew: true },
  { id: 6, name: 'Premium Ankara Dress Set', price: 195, original: 300, img: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80', rating: 4.8, reviews: 134, cat: 'Fashion', badge: 'LOCAL', isNew: true },
  { id: 7, name: 'KitchenAid Stand Mixer Pro', price: 1450, original: 1800, img: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400&q=80', rating: 4.6, reviews: 67, cat: 'Home', badge: 'SALE', isNew: false },
  { id: 8, name: 'Sony WH-1000XM5 Headphones', price: 1200, original: 1600, img: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=400&q=80', rating: 4.8, reviews: 290, cat: 'Electronics', badge: null, isNew: false },
];

// ─── DOCTORS ────────────────────────────────────────────────────────────────
export const DOCTORS = [
  { id: 'd1', name: 'Dr. Akosua Owusu', specialty: 'General Practitioner', rating: 4.9, reviews: 412, price: 80, avail: 'Today', img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&q=80', badge: 'Top Rated' },
  { id: 'd2', name: 'Dr. Emmanuel Darko', specialty: 'Cardiologist', rating: 4.8, reviews: 234, price: 200, avail: 'Tomorrow', img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&q=80', badge: 'Specialist' },
  { id: 'd3', name: 'Dr. Abena Asante', specialty: 'Dermatologist', rating: 4.7, reviews: 189, price: 150, avail: 'Today', img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&q=80', badge: null },
  { id: 'd4', name: 'Dr. Kwesi Mensah', specialty: 'Psychiatrist', rating: 4.9, reviews: 102, price: 180, avail: 'Today', img: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&q=80', badge: 'Mental Health' },
];

// ─── PROPERTIES ───────────────────────────────────────────────────────────────
export const PROPERTIES = [
  { id: 'p1', name: '3BR House — East Legon', price: '3,500', unit: '/mo', type: 'Rent', location: 'East Legon, Accra', beds: 3, baths: 2, img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500&q=80', badge: 'FEATURED' },
  { id: 'p2', name: '2BR Apartment — Airport', price: '2,200', unit: '/mo', type: 'Rent', location: 'Airport Residential, Accra', beds: 2, baths: 2, img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&q=80', badge: 'HOT' },
  { id: 'p3', name: '5BR Mansion — Trasacco', price: '1,200,000', unit: '', type: 'Sale', location: 'Trasacco Valley, Accra', beds: 5, baths: 4, img: 'https://images.unsplash.com/photo-1613977257365-aaae5a9817ff?w=500&q=80', badge: 'LUXURY' },
];

// ─── HOME SERVICES ────────────────────────────────────────────────────────────
export const HOME_SERVICES = [
  { id: 'hs1', name: 'Plumbing', icon: '🔧', price: 120, desc: 'Leaks, blockages, pipe installation & more' },
  { id: 'hs2', name: 'Electrical', icon: '⚡', price: 180, desc: 'Wiring, sockets, circuit breakers & lighting' },
  { id: 'hs3', name: 'Cleaning', icon: '🧹', price: 100, desc: 'Full house deep cleaning service' },
  { id: 'hs4', name: 'AC Service', icon: '❄️', price: 160, desc: 'Installation, cleaning & gas refilling' },
];

// Notifications are fetched from Supabase — no hardcoded demo data

// ─── Colors — Dark theme (default) ────────────────────────────────────────────
export const COLORS = {
  brand: '#f97316',
  dark: '#0a0a0f',
  dark2: '#111118',
  dark3: '#1a1a26',
  dark4: '#242436',
  dark5: '#2e2e45',
  text: '#f1f1f5',
  textMuted: '#6b7280',
  border: 'rgba(255,255,255,0.08)',
  transport: '#3b82f6',
  services: '#10b981',
  beauty: '#ec4899',
  health: '#ef4444',
  ecom: '#f97316',
  realestate: '#8b5cf6',
  rentals: '#06b6d4',
};

// ─── Colors — Light theme ─────────────────────────────────────────────────────
export const COLORS_LIGHT = {
  brand: '#f97316',
  dark: '#ffffff',
  dark2: '#f5f5f8',
  dark3: '#ebebf0',
  dark4: '#dddde6',
  dark5: '#d0d0dc',
  text: '#1a1a2e',
  textMuted: '#6b7280',
  border: 'rgba(0,0,0,0.08)',
  transport: '#3b82f6',
  services: '#10b981',
  beauty: '#ec4899',
  health: '#ef4444',
  ecom: '#f97316',
  realestate: '#8b5cf6',
  rentals: '#06b6d4',
};

// ─── Header Category Scroll (circular images) ────────────────────────────────
export const HEADER_CATEGORIES = [
  { id: 'all', label: 'All', img: null, color: '#f97316', screen: null, isAll: true },
  { id: 'transport', label: 'Transport', img: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=200&q=80', color: '#3b82f6', screen: 'Transport' },
  { id: 'services', label: 'Services', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&q=80', color: '#10b981', screen: 'HomeServices' },
  { id: 'beauty', label: 'Beauty', img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&q=80', color: '#ec4899', screen: 'Beauty' },
  { id: 'health', label: 'Health', img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200&q=80', color: '#ef4444', screen: 'Health' },
  { id: 'shop', label: 'Shop', img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80', color: '#f97316', screen: 'Ecommerce' },
  { id: 'realestate', label: 'Real Estate', img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200&q=80', color: '#8b5cf6', screen: 'RealEstate' },
  { id: 'rentals', label: 'Rentals', img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&q=80', color: '#06b6d4', screen: 'Rentals' },
];

// ─── Categories ───────────────────────────────────────────────────────────────
export const CATEGORIES = [
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#3b82f6', screen: 'Transport', tagline: 'Book rides, track drivers, move smarter.' },
  { id: 'home-services', name: 'Home Services', icon: '🔧', color: '#10b981', screen: 'HomeServices', tagline: 'Plumbers, electricians & cleaners on demand.' },
  { id: 'beauty', name: 'Beauty & Fashion', icon: '💄', color: '#ec4899', screen: 'Beauty', tagline: 'Salons, stylists & boutiques at your fingertips.' },
  { id: 'health', name: 'Health Services', icon: '🏥', color: '#ef4444', screen: 'Health', tagline: 'Doctors, labs & pharmacy at your fingertips.' },
  { id: 'ecommerce', name: 'E-Commerce', icon: '🛍️', color: '#f97316', screen: 'Ecommerce', tagline: 'Buy, sell & discover products near you.' },
  { id: 'real-estate', name: 'Real Estate', icon: '🏠', color: '#8b5cf6', screen: 'RealEstate', tagline: 'Find, buy & rent property across Ghana.' },
  { id: 'rentals', name: 'Rentals', icon: '🔑', color: '#06b6d4', screen: 'Rentals', tagline: 'Rent vehicles, equipment & event spaces.' },
];

// ─── Payment methods ──────────────────────────────────────────────────────────
export const PAYMENT_METHODS = [
  { id: 'mtn', label: 'MTN Mobile Money', icon: '📱', color: '#f59e0b' },
  { id: 'vodafone', label: 'Vodafone Cash', icon: '📲', color: '#ef4444' },
  { id: 'airteltigo', label: 'AirtelTigo Money', icon: '📳', color: '#3b82f6' },
  { id: 'card', label: 'Debit/Credit Card', icon: '💳', color: '#6366f1' },
  { id: 'wallet', label: 'SP Wallet', icon: '👛', color: '#f97316' },
];

// ─── Booking statuses ─────────────────────────────────────────────────────────
export const BOOKING_STATUS = {
  PENDING: { label: 'Pending', color: '#f59e0b' },
  CONFIRMED: { label: 'Confirmed', color: '#3b82f6' },
  IN_PROGRESS: { label: 'In Progress', color: '#8b5cf6' },
  COMPLETED: { label: 'Completed', color: '#10b981' },
  CANCELLED: { label: 'Cancelled', color: '#ef4444' },
};

// ─── Ride types ───────────────────────────────────────────────────────────────
export const RIDE_TYPES = [
  { id: 'standard', label: 'Standard', icon: '🚗', priceKm: 3.5, eta: '3–5 min' },
  { id: 'premium', label: 'Premium', icon: '🚙', priceKm: 6, eta: '5–8 min' },
  { id: 'delivery', label: 'Delivery', icon: '📦', priceKm: 4, eta: '10–15 min' },
  { id: 'charter', label: 'Charter', icon: '🚌', flat: 500, eta: 'On request' },
];

// ── Auth-required helper for navigation ─────────────────────────────────────
// Use in any screen: requireAuth(user, navigation, () => doAction())
export function requireAuth(user, navigation, action) {
  if (user) {
    action();
  } else {
    const { Alert } = require('react-native');
    Alert.alert(
      'Sign In Required',
      'Please sign in or create an account to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('AuthModal', { screen: 'Login' }) },
      ]
    );
  }
}
