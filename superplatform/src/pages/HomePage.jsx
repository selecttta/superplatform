import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Smartphone, TrendingUp, MapPin, Star } from 'lucide-react';
import HeroSlider from '../components/home/HeroSlider';
import ProductCard from '../components/ecommerce/ProductCard';
import { useAuthStore } from '../store/authStore';
import { useCountdown } from '../hooks/useCountdown';
import { CATEGORIES } from '../lib/constants';
import { fmt } from '../utils/helpers';
import { supabase } from '../lib/supabase';

function FlashTimer() {
  const { h, m, s } = useCountdown(5);
  const pad = n => String(n).padStart(2, '0');
  return (
    <div className="flex items-center gap-1">
      {[pad(h), pad(m), pad(s)].map((v, i) => (
        <React.Fragment key={i}>
          <div className="bg-brand-500 text-[var(--text)] font-mono font-bold text-xs px-1.5 py-0.5 rounded min-w-[22px] text-center">{v}</div>
          {i < 2 && <span className="text-brand-400 font-bold text-xs">:</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

const mapProduct = p => ({
  id: p.id,
  name: p.title,
  price: p.price,
  original: p.compare_at_price,
  img: p.images?.[0] || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80',
  rating: p.rating || 0,
  reviews: p.reviews_count || 0,
  cat: 'Product', // You could expand this by fetching category names
  badge: p.is_new ? 'NEW' : null,
  isNew: p.is_new
});

export default function HomePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch products
        const { data: prodData } = await supabase.from('products').select('*').limit(8).order('created_at', { ascending: false });
        if (prodData) setProducts(prodData.map(mapProduct));

        // Fetch services
        const { data: servData } = await supabase.from('services').select('*').limit(4).order('created_at', { ascending: false });
        if (servData) setServices(servData);

        // Fetch doctors
        const { data: docData } = await supabase.from('provider_profiles').select('*').eq('category', 'health').limit(4);
        if (docData) setDoctors(docData);

        // Fetch properties
        const { data: propData } = await supabase.from('properties').select('*').limit(3).order('created_at', { ascending: false });
        if (propData) setProperties(propData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* ── HERO ── */}
      <HeroSlider />

      {/* ── LOCATION BANNER (logged in) ── */}
      {user && (
        <div className="bg-gradient-to-r from-brand-600/15 to-transparent border-y border-brand-500/15">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm">
            <MapPin size={14} className="text-brand-400 shrink-0" />
            <span className="text-[var(--text-muted)]">Showing near <span className="text-[var(--text)] font-medium">Accra, Ghana</span></span>
            <span className="text-[var(--text)]/20 hidden sm:block">·</span>
            <span className="text-[var(--text)]/35 hidden sm:block text-xs">Personalized based on your activity</span>
          </div>
        </div>
      )}

      {/* ── CATEGORIES GRID ── */}
      <section className="section">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-brand-500 text-xs font-semibold uppercase tracking-widest mb-2">What can we help with?</p>
            <h2 className="heading-lg">All Categories</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {CATEGORIES.map((cat, i) => (
            <Link key={cat.id} to={cat.path}
              className="group relative overflow-hidden rounded-2xl aspect-square cursor-pointer"
              style={{ animation: `fadeUp .5s ${i * 0.06}s ease both` }}>
              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className={`absolute inset-0 bg-gradient-to-t ${cat.gradient} opacity-70 group-hover:opacity-80 transition-opacity`} />
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <h3 className="font-display font-bold text-white text-sm sm:text-base leading-tight">{cat.name}</h3>
                <p className="text-white/0 group-hover:text-white/80 text-xs mt-1 transition-colors duration-300 line-clamp-2">{cat.tagline}</p>
                <div className="mt-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="text-xs font-semibold text-brand-300">{cat.cta} →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── TRANSPORT QUICK BOOK ── */}
      <section className="section-sm">
        <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-blue-900/60 to-dark-800 border border-blue-500/15">
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-12">
              <div className="badge-blue mb-4">🚗 Transport</div>
              <h2 className="heading-lg mb-3 text-white">Need a ride?<br />Book in 30 seconds.</h2>
              <p className="text-sm sm:text-base text-white/80 mb-6 sm:mb-8">GPS-tracked drivers. Upfront pricing. No surprises.</p>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="label">Pickup</label>
                  <input className="input" placeholder="Your current location" />
                </div>
                <div>
                  <label className="label">Destination</label>
                  <input className="input" placeholder="Where are you going?" />
                </div>
              </div>
              <button onClick={() => navigate('/transport')} className="btn-primary btn-lg" style={{ background: '#3b82f6', boxShadow: '0 8px 24px #3b82f644' }}>
                Find Drivers →
              </button>
            </div>
            <div className="hidden md:block relative">
              <img src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=900&q=80" alt="Transport" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent to-blue-950/80" />
            </div>
          </div>
        </div>
      </section>

      {/* ── FLASH DEALS ── */}
      <section className="section">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-brand-500" />
            <h2 className="heading-md">Flash Deals</h2>
            <FlashTimer />
          </div>
          <Link to="/ecommerce" className="btn-ghost text-sm rounded-xl gap-1">All Deals <ArrowRight size={14} /></Link>
        </div>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.filter(p => p.original).slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="text-center py-10 text-[var(--text-muted)] border border-[var(--border)] rounded-2xl border-dashed">
            No active deals today. Check back later!
          </div>
        )}
      </section>

      {/* ── HEALTH CTA ── */}
      <section className="section-sm">
        <div className="rounded-3xl overflow-hidden relative">
          <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1400&q=80" alt="Health" className="w-full h-64 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/95 via-red-900/60 to-transparent" />
          <div className="absolute inset-0 flex items-center p-5 sm:p-8 md:p-14">
            <div>
              <div className="badge-red mb-3 sm:mb-4">🏥 Health Services</div>
              <h2 className="heading-lg mb-2 sm:mb-3 max-w-xs text-white">Your health, on your schedule.</h2>
              <p className="text-sm sm:text-base text-white/80 mb-4 sm:mb-6 max-w-sm">Consult verified doctors, book lab tests, order prescriptions — all from home.</p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button onClick={() => navigate('/health')} className="btn btn-sm sm:btn-lg text-white font-bold" style={{ background: '#ef4444', boxShadow: '0 8px 24px #ef444440' }}>Consult a Doctor</button>
                <button onClick={() => navigate('/health?tab=labs')} className="btn-secondary btn-sm sm:btn-lg">Book Lab Test</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOME SERVICES ── */}
      <section className="section">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-1">On Demand</p>
            <h2 className="heading-md">Home Services</h2>
          </div>
          <Link to="/home-services" className="btn-ghost text-sm rounded-xl gap-1">View all <ArrowRight size={14} /></Link>
        </div>
        {services.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {services.slice(0, 4).map(svc => (
              <Link key={svc.id} to="/home-services" className="card-hover p-5 group">
                <div className="text-3xl mb-3">🔧</div>
                <h3 className="font-semibold text-[var(--text)] text-sm mb-1">{svc.title}</h3>
                <p className="text-xs text-muted mb-3 line-clamp-2">{svc.description}</p>
                <p className="text-brand-400 font-bold text-sm">From {fmt(svc.price)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-[var(--text-muted)] border border-[var(--border)] rounded-2xl border-dashed">
            Service providers are joining soon. Come back later!
          </div>
        )}
      </section>

      {/* ── FEATURED DOCTORS ── */}
      <section className="section">
        <div className="flex items-center justify-between mb-6">
          <h2 className="heading-md">Top Doctors</h2>
          <Link to="/health" className="btn-ghost text-sm rounded-xl gap-1">View all <ArrowRight size={14} /></Link>
        </div>
        {doctors.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {doctors.slice(0, 4).map(doc => (
              <Link key={doc.id} to="/health" className="card-hover p-5">
                <img src={doc.profile_picture_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&q=80'} alt={doc.business_name} className="w-14 h-14 rounded-2xl object-cover mb-3 bg-gray-800" />
                <h3 className="font-semibold text-[var(--text)] text-sm">{doc.business_name || 'Dr. Professional'}</h3>
                <p className="text-xs text-red-400 mb-1">{doc.subcategories?.[0] || 'General Practitioner'}</p>
                <div className="flex items-center gap-1 mb-2">
                  <Star size={10} className="stars-filled fill-current" />
                  <span className="text-xs text-[var(--text)]/45">{doc.average_rating || 'New'}</span>
                </div>
                <p className="text-xs font-bold text-brand-400">{fmt(doc.starting_price || 0)}/session</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-[var(--text-muted)] border border-[var(--border)] rounded-2xl border-dashed">
            No doctors available in your area right now.
          </div>
        )}
      </section>

      {/* ── BEAUTY + REAL ESTATE SPLIT ── */}
      <section className="section-sm">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-3xl overflow-hidden relative">
            <img src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80" alt="Beauty" className="w-full h-72 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-pink-950/90 via-pink-900/40 to-transparent" />
            <div className="absolute bottom-0 p-4 sm:p-7">
              <div className="badge-red mb-2 sm:mb-3" style={{ background: '#ec489918', color: '#f9a8d4' }}>💄 Beauty & Fashion</div>
              <h3 className="font-display font-bold text-base sm:text-xl md:text-2xl mb-2 text-white">Look amazing,<br />feel confident.</h3>
              <button onClick={() => navigate('/beauty')} className="text-sm font-semibold text-pink-300 hover:text-white transition-colors">Book appointment →</button>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden relative">
            <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80" alt="Real Estate" className="w-full h-72 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-violet-950/90 via-violet-900/40 to-transparent" />
            <div className="absolute bottom-0 p-4 sm:p-7">
              <div className="badge-purple mb-2 sm:mb-3">🏠 Real Estate</div>
              <h3 className="font-display font-bold text-base sm:text-xl md:text-2xl mb-2 text-white">Find your dream<br />home in Ghana.</h3>
              <button onClick={() => navigate('/real-estate')} className="text-sm font-semibold text-violet-300 hover:text-white transition-colors">Browse properties →</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED PROPERTIES ── */}
      <section className="section">
        <div className="flex items-center justify-between mb-6">
          <h2 className="heading-md">Featured Properties</h2>
          <Link to="/real-estate" className="btn-ghost text-sm rounded-xl gap-1">View all <ArrowRight size={14} /></Link>
        </div>
        {properties.length > 0 ? (
          <div className="grid sm:grid-cols-3 gap-5">
            {properties.slice(0, 3).map(p => (
              <Link key={p.id} to="/real-estate" className="card-hover overflow-hidden">
                <div className="h-44 relative">
                  <img src={p.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500&q=80'} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {p.is_featured && <div className={`absolute top-2 left-2 badge text-[var(--text)] text-xs bg-red-500`}>Featured</div>}
                  <div className={`absolute top-2 right-2 badge text-[var(--text)] text-xs ${p.type === 'lease' ? 'bg-blue-500' : 'bg-violet-500'}`}>{p.type}</div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-[var(--text)] text-sm mb-1">{p.title}</h3>
                  <p className="text-xs text-muted mb-2 flex items-center gap-1"><MapPin size={10} />{p.address || p.city}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--text)]">{fmt(p.price)}<span className="text-xs text-muted font-normal"></span></span>
                    {p.bedrooms > 0 && <span className="text-xs text-muted">{p.bedrooms}bd · {p.bathrooms}ba</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-[var(--text-muted)] border border-[var(--border)] rounded-2xl border-dashed">
            No properties listed yet. Find your next home soon!
          </div>
        )}
      </section>

      {/* ── TRENDING PRODUCTS ── */}
      <section className="section">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-brand-500" />
            <h2 className="heading-md">Trending Now</h2>
          </div>
          <Link to="/ecommerce" className="btn-ghost text-sm rounded-xl gap-1">All products <ArrowRight size={14} /></Link>
        </div>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="text-center py-10 text-[var(--text-muted)] border border-[var(--border)] rounded-2xl border-dashed">
            No products available yet. Come back later to shop for trending items!
          </div>
        )}
      </section>

      {/* ── WHY US ── */}
      <section className="section">
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { icon: <Shield size={22} className="text-brand-400" />, title: 'Verified Providers', desc: 'Every service provider is background-checked and approved by our admin team before going live.' },
            { icon: <Zap size={22} className="text-emerald-400" />, title: 'Instant Booking', desc: 'Book rides, appointments and services in seconds. Confirmation arrives immediately.' },
            { icon: <Smartphone size={22} className="text-blue-400" />, title: 'Ghana Payments', desc: 'MTN MoMo, Vodafone Cash, AirtelTigo Money and cards — all natively supported.' },
          ].map((item, i) => (
            <div key={i} className="card p-6">
              <div className="w-11 h-11 bg-white/[0.04] rounded-xl flex items-center justify-center mb-4">{item.icon}</div>
              <h3 className="font-semibold text-[var(--text)] mb-2">{item.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA (guests) ── */}
      {!user && (
        <section className="section">
          <div className="rounded-3xl text-center p-6 sm:p-10 md:p-16 hero-pattern bg-[var(--bg-secondary)] border border-[var(--border)]">
            <h2 className="font-display font-black text-2xl sm:text-3xl md:text-5xl text-[var(--text)] mb-3 sm:mb-4 break-words">
              Join <span className="gradient-text">SuperPlatform GH</span> today
            </h2>
            <p className="text-[var(--text-muted)] max-w-md mx-auto mb-6 sm:mb-8 text-sm sm:text-base md:text-lg">Free to join. Shop, book services, find property and connect with providers near you.</p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
              <Link to="/register" className="btn-primary btn-lg px-8 sm:px-10">Get Started Free</Link>
              <Link to="/register?role=provider" className="btn-outline btn-lg px-8 sm:px-10">Become a Provider</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
