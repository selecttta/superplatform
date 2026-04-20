export const APP_NAME = 'SuperPlatform GH';
export const APP_TAGLINE = 'One platform for transport, services, shopping, health, rentals & more.';
export const CURRENCY = 'GH₵';

// ─── CATEGORIES ────────────────────────────────────────────────────────────
export const CATEGORIES = [
  {
    id: 'transport', name: 'Transport', icon: '🚗', color: '#3b82f6',
    gradient: 'from-blue-700 to-blue-950', path: '/transport',
    tagline: 'Book rides, track drivers, move smarter.', cta: 'Book a Ride',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=900&q=80',
    slides: [
      { img: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1400&q=80', title: 'Ride Anywhere in Ghana', sub: 'Fast, safe, GPS-tracked rides across Accra & beyond.' },
      { img: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1400&q=80', title: 'Track in Real-Time', sub: 'Live driver location from booking to drop-off.' },
      { img: 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=1400&q=80', title: 'Deliver Anything', sub: 'Same-day parcel & cargo delivery across the city.' },
    ],
  },
  {
    id: 'home-services', name: 'Home Services', icon: '🔧', color: '#10b981',
    gradient: 'from-emerald-700 to-emerald-950', path: '/home-services',
    tagline: 'Plumbers, electricians & cleaners on demand.', cta: 'Book a Pro',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&q=80',
    slides: [
      { img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1400&q=80', title: 'Home Repairs Done Right', sub: 'Certified professionals at your door, same day.' },
      { img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80', title: 'Deep Cleaning Services', sub: 'Spotless homes, satisfied every time.' },
      { img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1400&q=80', title: 'Electrical & AC Work', sub: 'Licensed electricians. Safe installations.' },
    ],
  },
  {
    id: 'beauty', name: 'Beauty & Fashion', icon: '💄', color: '#ec4899',
    gradient: 'from-pink-700 to-pink-950', path: '/beauty',
    tagline: 'Salons, stylists & boutiques at your fingertips.', cta: 'Book Now',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&q=80',
    slides: [
      { img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1400&q=80', title: 'Look Amazing Every Day', sub: 'Top salons & stylists, booked in seconds.' },
      { img: 'https://images.unsplash.com/photo-1560066984-138daaa4e4e0?w=1400&q=80', title: 'Hair, Nails & Makeup', sub: 'All beauty services under one platform.' },
      { img: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1400&q=80', title: 'Shop Fashion & Apparel', sub: 'Trending styles, local designers & more.' },
    ],
  },
  {
    id: 'health', name: 'Health Services', icon: '🏥', color: '#ef4444',
    gradient: 'from-red-700 to-red-950', path: '/health',
    tagline: 'Doctors, labs & pharmacy at your fingertips.', cta: 'Consult Now',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&q=80',
    slides: [
      { img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1400&q=80', title: 'Healthcare at Home', sub: 'Consult verified doctors from your phone.' },
      { img: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1400&q=80', title: 'Lab Tests Made Easy', sub: 'Book tests, get results delivered fast.' },
      { img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1400&q=80', title: 'Pharmacy Delivery', sub: 'Prescriptions & OTC meds to your door.' },
    ],
  },
  {
    id: 'ecommerce', name: 'E-Commerce', icon: '🛍️', color: '#f97316',
    gradient: 'from-orange-600 to-orange-950', path: '/ecommerce',
    tagline: 'Buy, sell & discover products near you.', cta: 'Shop Now',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=80',
    slides: [
      { img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&q=80', title: 'Shop Everything', sub: 'New & second-hand items from sellers near you.' },
      { img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&q=80', title: 'Flash Deals Daily', sub: 'Limited-time offers with massive savings.' },
      { img: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1400&q=80', title: 'Sell in Minutes', sub: 'List your item and reach thousands of buyers.' },
    ],
  },
  {
    id: 'real-estate', name: 'Real Estate', icon: '🏠', color: '#8b5cf6',
    gradient: 'from-violet-700 to-violet-950', path: '/real-estate',
    tagline: 'Find, buy & rent property across Ghana.', cta: 'Find Property',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=80',
    slides: [
      { img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&q=80', title: 'Find Your Dream Home', sub: 'Buy, rent or sell properties across Ghana.' },
      { img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1400&q=80', title: 'Luxury Listings', sub: 'Premium properties at competitive prices.' },
      { img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&q=80', title: 'Commercial Spaces', sub: 'Offices, retail shops & warehouses available.' },
    ],
  },
  {
    id: 'rentals', name: 'Rentals', icon: '🔑', color: '#06b6d4',
    gradient: 'from-cyan-700 to-cyan-950', path: '/rentals',
    tagline: 'Rent vehicles, equipment & event spaces.', cta: 'Browse Rentals',
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=900&q=80',
    slides: [
      { img: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=1400&q=80', title: 'Rent a Car', sub: 'Self-drive or with a chauffeur — your choice.' },
      { img: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1400&q=80', title: 'Event Spaces', sub: 'Halls, gazebos & rooftops for every occasion.' },
      { img: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=1400&q=80', title: 'Equipment Rental', sub: 'Generators, tents, PA systems & more.' },
    ],
  },
];

// ─── PAYMENT METHODS ─────────────────────────────────────────────────────────
export const PAYMENT_METHODS = [
  { id: 'mtn', name: 'MTN Mobile Money', icon: '📱', hint: 'Enter MTN number' },
  { id: 'vodafone', name: 'Vodafone Cash', icon: '📲', hint: 'Enter Vodafone number' },
  { id: 'airteltigo', name: 'AirtelTigo Money', icon: '📳', hint: 'Enter AirtelTigo number' },
  { id: 'card', name: 'Debit / Credit Card', icon: '💳', hint: 'Visa, Mastercard accepted' },
  { id: 'wallet', name: 'SP Wallet', icon: '👛', hint: 'Pay from your SuperPlatform balance' },
];

// ─── NOTIFICATION TYPES ───────────────────────────────────────────────────────
export const NOTIF_TYPES = { order: 'order', booking: 'booking', message: 'message', promo: 'promo', system: 'system' };
