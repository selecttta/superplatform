import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Phone, MessageCircle, Star, MapPin, Shield, Clock, ChevronLeft,
  Check, Calendar, ChevronLeft as Left, ChevronRight as Right,
  Bed, Bath, Maximize, UserPlus, UserCheck, Send, Loader2, Heart
} from 'lucide-react';
import StarRating from '../components/common/StarRating';
import BookingModal from '../components/common/BookingModal';
import { useReviews } from '../hooks/useReviews';
import { useAuthStore } from '../store/authStore';
import { useFavStore } from '../store/favStore';
import { fmt } from '../utils/helpers';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// ── Type-specific services ─────────────────────────────────
const SERVICES_MAP = {
  driver: [
    { name: 'Standard Ride', price: 45, desc: 'Comfortable sedan, up to 4 passengers' },
    { name: 'Premium Ride', price: 80, desc: 'Luxury SUV, max comfort' },
    { name: 'Parcel Delivery', price: 30, desc: 'Documents & small packages' },
    { name: 'Airport Transfer', price: 150, desc: 'To/from Kotoka International Airport' },
  ],
  health: [
    { name: 'General Consultation', price: 120, desc: '30-min in-person or video call' },
    { name: 'Follow-up Appointment', price: 80, desc: 'Review results & adjust treatment' },
    { name: 'Lab Test Referral', price: 40, desc: 'Order & review diagnostic tests' },
    { name: 'Specialist Referral', price: 60, desc: 'Coordinated specialist care' },
  ],
  'home-service': [
    { name: 'Standard Service', price: 100, desc: 'Basic service package (1–2 hrs)' },
    { name: 'Premium Service', price: 200, desc: 'Comprehensive service with parts' },
    { name: 'Emergency Call', price: 250, desc: 'Same-day urgent response' },
    { name: 'Monthly Maintenance', price: 350, desc: 'Monthly scheduled maintenance' },
  ],
  beauty: [
    { name: 'Basic Appointment', price: 80, desc: '1 service — hair, nails, or makeup' },
    { name: 'Full Glam Package', price: 250, desc: 'Hair + makeup + nails (4 hrs)' },
    { name: 'Bridal Package', price: 500, desc: 'Bridal full glam + touch-ups' },
    { name: 'Monthly Subscription', price: 400, desc: '4 appointments / month' },
  ],
  'real-estate': [
    { name: 'Property Tour', price: 0, desc: 'Schedule a viewing (free)' },
    { name: 'Agent Consultation', price: 100, desc: 'Get expert advice & market insights' },
    { name: 'Mortgage Consultation', price: 150, desc: 'Home loan guidance & calculator' },
  ],
  transport: [
    { name: 'Standard Ride', price: 45, desc: 'Comfortable sedan, up to 4 passengers' },
    { name: 'Premium Ride', price: 80, desc: 'Luxury SUV' },
    { name: 'Airport Transfer', price: 150, desc: 'To/from Kotoka International Airport' },
  ],
  rentals: [
    { name: 'Half-day Rental', price: 200, desc: '4-hour rental period' },
    { name: 'Full-day Rental', price: 350, desc: '8-hour rental period' },
    { name: 'Weekly Rental', price: 1400, desc: '7-day rental' },
  ],
  default: [
    { name: 'Basic Service', price: 100, desc: 'Standard service package' },
    { name: 'Premium Service', price: 200, desc: 'Premium quality service' },
    { name: 'Emergency Call', price: 180, desc: 'Same-day/urgent response' },
  ],
};

// ── Real Estate specs ──────────────────────────────────────
function PropertySpecs({ provider }) {
  return (
    <div className="card p-5 mb-4" style={{ animation: 'fadeUp .3s ease' }}>
      <h3 className="font-semibold text-[var(--text)] mb-4">Property Details</h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {provider.beds > 0 && (
          <div className="bg-[var(--bg-card)]/70 rounded-xl p-3 text-center">
            <Bed size={18} className="mx-auto mb-1 text-brand-400" />
            <p className="text-sm font-bold text-[var(--text)]">{provider.beds}</p>
            <p className="text-[10px] text-[var(--text)]/40">Bedrooms</p>
          </div>
        )}
        {provider.baths > 0 && (
          <div className="bg-[var(--bg-card)]/70 rounded-xl p-3 text-center">
            <Bath size={18} className="mx-auto mb-1 text-brand-400" />
            <p className="text-sm font-bold text-[var(--text)]">{provider.baths}</p>
            <p className="text-[10px] text-[var(--text)]/40">Bathrooms</p>
          </div>
        )}
        {provider.sqft > 0 && (
          <div className="bg-[var(--bg-card)]/70 rounded-xl p-3 text-center">
            <Maximize size={18} className="mx-auto mb-1 text-brand-400" />
            <p className="text-sm font-bold text-[var(--text)]">{(provider.sqft || 0).toLocaleString()}</p>
            <p className="text-[10px] text-[var(--text)]/40">sqft</p>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {[
          { label: 'Type', value: provider.specialty || 'Residential' },
          { label: 'Status', value: provider.type || 'For Sale' },
          { label: 'Location', value: provider.location || provider.loc || 'Accra, Ghana' },
          { label: 'Agent', value: provider.agent || provider.name || provider.full_name },
          { label: 'Listed', value: 'Jan 2024' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[var(--border)] last:border-0">
            <span className="text-xs text-[var(--text)]/40 w-24 shrink-0">{s.label}</span>
            <span className="text-xs font-medium text-[var(--text)]">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Doctor / Health specifics ──────────────────────────────
function DoctorInfo({ provider }) {
  const slots = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];
  const [picked, setPicked] = useState(null);
  return (
    <div className="card p-5 mb-4" style={{ animation: 'fadeUp .3s ease' }}>
      <h3 className="font-semibold text-[var(--text)] mb-3">Available Slots Today</h3>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {slots.map(s => (
          <button key={s} onClick={() => setPicked(s)}
            className={`py-2 rounded-xl text-xs font-medium transition-all ${picked === s ? 'bg-red-500 text-[var(--text)]' : 'bg-[var(--bg-card)]/70 text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`}>
            {s}
          </button>
        ))}
      </div>
      {provider.education && <p className="text-xs text-[var(--text)]/40 mb-2">🎓 {provider.education}</p>}
      <p className="text-xs text-[var(--text)]/40">🏥 {provider.hospital || 'Accra General Hospital'}</p>
    </div>
  );
}

// ── Review Form ────────────────────────────────────────────
function ReviewForm({ targetId, targetType }) {
  const { user } = useAuthStore();
  const { submitReview, submitting } = useReviews(targetId, targetType);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');

  if (!user) return (
    <div className="bg-[var(--bg-card)]/50 rounded-2xl p-4 text-center">
      <p className="text-sm text-[var(--text-muted)]">
        <a href="/login" className="text-brand-400 hover:underline">Sign in</a> to leave a review
      </p>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { toast.error('Select a rating.'); return; }
    if (comment.trim().length < 10) { toast.error('Review too short (min 10 chars).'); return; }
    const ok = await submitReview({ rating, comment: comment.trim() });
    if (ok) { setRating(0); setComment(''); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-card)]/50 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-semibold text-[var(--text)]">Write a Review</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button type="button" key={n}
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}>
            <Star size={22} className={n <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--text)]/20'} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value.slice(0, 500))}
        className="input resize-none h-20 text-sm" placeholder="Share your experience…" maxLength={500} />
      <div className="flex justify-between items-center">
        <span className="text-xs text-[var(--text)]/25">{comment.length}/500</span>
        <button type="submit" disabled={submitting} className="btn btn-primary btn-sm gap-2">
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Submit
        </button>
      </div>
    </form>
  );
}

// ── Main ───────────────────────────────────────────────────
export default function ProviderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggle, isFav } = useFavStore();

  const [provider, setProvider] = useState(location.state?.provider || null);
  const [loading, setLoading] = useState(!location.state?.provider);
  const provType = location.state?.type || provider?.category || 'driver';

  const [imgIdx, setImgIdx] = useState(0);
  const [booking, setBooking] = useState(null);
  const [tab, setTab] = useState('services');
  const [following, setFollowing] = useState(false);

  const { reviews, loading: revLoading } = useReviews(provider?.id, provType);
  const fav = isFav(provider?.id, 'provider');

  useEffect(() => {
    if (!provider && id) {
      // Fetch provider if coming directly via URL
      (async () => {
        setLoading(true);
        try {
          // Attempt to fetch from provider_profiles
          let { data, error } = await supabase.from('provider_profiles').select('*').eq('id', id).single();
          if (data) {
            setProvider({
              ...data,
              name: data.business_name || data.full_name || 'Provider',
              img: data.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
              loc: data.city || data.address || 'Ghana',
              rating: data.rating || 0,
              jobs: data.jobs_completed || 0
            });
          } else {
            // Also try fetching from profiles directly just in case it's a regular user profile
            const { data: profData } = await supabase.from('profiles').select('*').eq('id', id).single();
            if (profData) {
              setProvider({
                ...profData,
                name: profData.full_name || 'User',
                img: profData.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80'
              });
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id, provider]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20 flex flex-col items-center justify-center text-center">
        <h2 className="heading-lg mb-4">Provider Not Found</h2>
        <p className="text-muted mb-8">The provider you are looking for does not exist or has been removed.</p>
        <button onClick={() => navigate('/')} className="btn-primary">Go Home</button>
      </div>
    );
  }

  const images = [
    provider.img || provider.image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80',
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80',
  ];

  const services = SERVICES_MAP[provType] || SERVICES_MAP.default;

  // Tabs vary by type
  const TABS = provType === 'real-estate'
    ? ['overview', 'reviews', 'about']
    : provType === 'health'
      ? ['services', 'availability', 'reviews', 'about']
      : ['services', 'reviews', 'about'];

  const handleCall = () => {
    const a = document.createElement('a');
    a.href = `tel:${provider.phone || '+233240000000'}`;
    a.click();
  };
  const handleChat = () => navigate('/chat', { state: { providerId: provider.user_id || provider.id, providerName: provider.name || provider.full_name } });

  // Label for price
  const priceLabel = provType === 'real-estate' ? '' :
    provType === 'health' ? '/session' : '/service';

  const startPrice = provider.price || services[0]?.price || 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      {/* Back */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 mb-4">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm gap-2 text-[var(--text-muted)]">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid lg:grid-cols-5 gap-8">

          {/* ── LEFT ───────────────────────────────── */}
          <div className="lg:col-span-3">
            {/* Image gallery */}
            <div className="relative rounded-2xl overflow-hidden mb-3 h-64 md:h-96 bg-[var(--bg-card)]">
              <img src={images[imgIdx]} alt={provider.name} className="w-full h-full object-cover" />
              <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 glass rounded-full flex items-center justify-center text-[var(--text)] hover:bg-white/20">
                <Left size={16} />
              </button>
              <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 glass rounded-full flex items-center justify-center text-[var(--text)] hover:bg-white/20">
                <Right size={16} />
              </button>
              <div className="absolute top-4 left-4 glass px-3 py-1 rounded-full flex items-center gap-1.5">
                <Shield size={12} className="text-emerald-400" />
                <span className="text-xs text-emerald-300 font-medium">Verified</span>
              </div>
              <button onClick={() => toggle(provider.id, 'provider', provider)}
                className="absolute top-4 right-4 w-9 h-9 glass rounded-full flex items-center justify-center hover:bg-white/20">
                <Heart size={15} className={fav ? 'fill-red-500 text-red-500' : 'text-[var(--text-muted)]'} />
              </button>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
              {images.map((img, i) => (
                 <button key={i} onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${i === imgIdx ? 'border-brand-500' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Provider info header */}
            <div className="card p-5 mb-5">
              <div className="flex items-start gap-4">
                <img src={images[0]} alt={provider.name}
                  className="w-14 h-14 rounded-2xl object-cover shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="heading-md">{provider.name}</h1>
                    <button
                      onClick={() => { setFollowing(f => !f); toast.success(following ? 'Unfollowed' : 'Following!'); }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all ${following ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'bg-white/8 text-[var(--text-muted)] hover:bg-white/12'}`}>
                      {following ? <UserCheck size={11} /> : <UserPlus size={11} />}
                      {following ? 'Following' : 'Follow'}
                    </button>
                  </div>
                  {provider.specialty && <p className="text-[var(--text-muted)] text-sm mt-0.5">{provider.specialty}</p>}
                  {provider.car && <p className="text-[var(--text)]/40 text-xs mt-0.5">{provider.car} · {provider.color} · {provider.plate}</p>}
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <StarRating rating={provider.rating || 4.8} reviews={provider.reviews || provider.trips || provider.jobs} />
                    {(provider.trips || provider.jobs) && (
                      <span className="text-xs text-[var(--text)]/40">{(provider.trips || provider.jobs)?.toLocaleString()} completed</span>
                    )}
                    {(provider.loc || provider.location) && (
                      <span className="text-xs text-[var(--text)]/40 flex items-center gap-1">
                        <MapPin size={10} /> {provider.loc || provider.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Type-specific info block */}
            {provType === 'real-estate' && <PropertySpecs provider={provider} />}
            {provType === 'health' && tab === 'availability' && <DoctorInfo provider={provider} />}

            {/* Tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${tab === t ? 'bg-brand-500 text-[var(--text)]' : 'glass text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Services tab */}
            {tab === 'services' && (
              <div className="space-y-3" style={{ animation: 'fadeUp .3s ease' }}>
                {services.map((svc, i) => (
                  <div key={i} className="card p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-[var(--text)]">{svc.name}</p>
                      <p className="text-sm text-[var(--text)]/40 mt-0.5">{svc.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-[var(--text)]">{svc.price === 0 ? 'Free' : fmt(svc.price)}</p>
                      <button onClick={() => setBooking({ name: svc.name, price: svc.price })}
                        className="btn btn-primary btn-sm mt-2">Book</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Overview tab (real estate) */}
            {tab === 'overview' && (
              <div className="card p-5 space-y-3" style={{ animation: 'fadeUp .3s ease' }}>
                <h3 className="heading-sm">Property Overview</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {provider.description || `This ${provider.specialty || 'property'} is listed on SuperPlatform by a verified agent. All properties undergo a comprehensive vetting process before being featured. Contact the agent to schedule a free viewing.`}
                </p>
                {provider.amenities && (
                  <div>
                    <p className="text-xs text-[var(--text)]/40 uppercase tracking-wide mb-2 mt-3">Amenities</p>
                    <div className="flex flex-wrap gap-2">
                       {(Array.isArray(provider.amenities) ? provider.amenities : ['Swimming Pool', '24h Security', 'Parking', 'Generator', 'Water Supply']).map((a, i) => (
                        <span key={i} className="badge glass text-xs text-[var(--text-muted)]">✓ {a}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Availability tab (health) */}
            {tab === 'availability' && provType !== 'health' && null}
            {tab === 'availability' && provType === 'health' && <DoctorInfo provider={provider} />}

            {/* Reviews tab */}
            {tab === 'reviews' && (
              <div className="space-y-4" style={{ animation: 'fadeUp .3s ease' }}>
                {/* Summary */}
                <div className="card p-5 flex items-center gap-5">
                  <div className="text-center shrink-0">
                    <p className="font-display text-4xl font-black text-[var(--text)]">{provider.rating || 4.8}</p>
                    <StarRating rating={provider.rating || 4.8} size={14} />
                    <p className="text-xs text-[var(--text)]/40 mt-1">{reviews.length || 4} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map(n => (
                      <div key={n} className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text)]/40 w-2">{n}</span>
                        <div className="flex-1 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: n >= 4 ? `${n * 16}%` : `${n * 6}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {revLoading ? (
                  <div className="text-center py-8 text-[var(--text)]/30 text-sm">Loading reviews…</div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-6 text-[var(--text)]/30 text-sm">No reviews yet. Be the first!</div>
                ) : (
                  reviews.map((r, i) => (
                    <div key={i} className="card p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                          {(r.profiles?.full_name || r.reviewer || 'A')[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[var(--text)]">{r.profiles?.full_name || r.reviewer || 'Customer'}</p>
                          <StarRating rating={r.rating} size={10} />
                        </div>
                        <span className="text-xs text-[var(--text)]/25">{r.date || r.created_at?.slice(0, 10)}</span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{r.comment}</p>
                    </div>
                  ))
                )}
                <ReviewForm targetId={provider.id} targetType={provType} />
              </div>
            )}

            {/* About tab */}
            {tab === 'about' && (
              <div className="card p-6 space-y-4" style={{ animation: 'fadeUp .3s ease' }}>
                <h3 className="heading-sm">About</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {provider.bio || `A verified ${provType.replace('-', ' ')} provider on SuperPlatform with a proven track record. All providers are ID-verified and background checked before going live on the platform.`}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Member Since', value: 'Jan 2023' },
                    { label: 'Response Time', value: '< 5 min' },
                    { label: 'Languages', value: 'English, Twi' },
                    { label: 'Location', value: provider.loc || provider.location || 'Greater Accra' },
                    { label: 'Completed', value: `${(provider.trips || provider.jobs || 40).toLocaleString()} jobs` },
                    { label: 'Verified', value: '✅ Background checked' },
                  ].map((f, i) => (
                    <div key={i} className="glass rounded-xl p-3">
                      <p className="text-xs text-[var(--text)]/40 mb-0.5">{f.label}</p>
                      <p className="text-sm font-medium text-[var(--text)]">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Sticky booking panel ─────────── */}
          <div className="lg:col-span-2">
            <div className="card p-6 lg:sticky lg:top-24">
              {/* Price */}
              <div className="mb-5">
                <p className="text-xs text-[var(--text)]/40 uppercase tracking-wide mb-1">
                  {provType === 'real-estate' ? 'Asking Price' : 'Starting from'}
                </p>
                <p className="font-display text-3xl font-bold text-[var(--text)]">
                  {startPrice === 0 ? 'Free' : fmt(startPrice)}
                  {priceLabel && <span className="text-sm text-[var(--text)]/35 font-normal">{priceLabel}</span>}
                </p>
                {provider.eta && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-400">
                    <Clock size={11} /> Available in {provider.eta}
                  </div>
                )}
                {provider.avail && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-400">
                    <Clock size={11} /> {provider.avail}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => setBooking({ name: `${provider.name} — Service`, price: startPrice })}
                  className="btn btn-primary w-full btn-lg gap-2">
                  <Calendar size={16} />
                  {provType === 'real-estate' ? 'Schedule Viewing' :
                    provType === 'health' ? 'Book Appointment' : 'Book Now'}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleCall} className="btn btn-secondary gap-2">
                    <Phone size={15} /> Call
                  </button>
                  <button onClick={handleChat} className="btn btn-secondary gap-2">
                    <MessageCircle size={15} /> Chat
                  </button>
                </div>
              </div>

              <div className="divider" />

              {/* Trust badges */}
              <div className="space-y-3">
                {[
                  { icon: '🔒', text: 'Secure booking — pay only after service' },
                  { icon: '✅', text: 'Verified identity & background checked' },
                  { icon: '⭐', text: `${provider.rating || 4.8}★ from ${(provider.reviews || provider.trips || provider.jobs || 100)?.toLocaleString()}+ customers` },
                  { icon: '🔄', text: 'Free cancellation up to 2 hours before' },
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-base shrink-0">{t.icon}</span>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{t.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {booking && (
        <BookingModal service={booking} provider={provider} onClose={() => setBooking(null)} />
      )}
    </div>
  );
}
