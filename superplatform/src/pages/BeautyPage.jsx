import React, { useState, useEffect } from 'react';
import { MapPin, Phone, MessageCircle, Heart, ChevronRight, Star, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CategorySlider from '../components/common/CategorySlider';
import BookingModal from '../components/common/BookingModal';
import StarRating from '../components/common/StarRating';
import { CATEGORIES } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { fmt } from '../utils/helpers';
import { useFavStore } from '../store/favStore';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';

const cat = CATEGORIES.find(c => c.id === 'beauty');
const TABS = ['Salons & Providers','Services','Fashion Shop'];

export default function BeautyPage() {
  const navigate = useNavigate();
  const { toggle, isFav } = useFavStore();
  const addItem = useCartStore(s => s.addItem || s.add);
  const [tab, setTab] = useState('Salons & Providers');
  const [booking, setBooking] = useState(null);

  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [provRes, srvRes, prodRes] = await Promise.all([
          supabase.from('provider_profiles').select('*').eq('category', 'beauty').eq('status', 'active'),
          supabase.from('services').select('*').eq('status', 'active'),
          supabase.from('products').select('*').in('category_id', ['fashion', 'beauty', 'apparel']).eq('status', 'approved')
        ]);
        
        if (provRes.data) {
          setProviders(provRes.data.map(p => ({
            ...p,
            name: p.business_name || p.full_name || 'Salon/Provider',
            img: p.avatar_url || 'https://images.unsplash.com/photo-1560066984-138daaa4e4e0?w=400&q=80',
            rating: p.rating || 0,
            reviews: p.jobs_completed || 0,
            specialty: p.specialty || 'Beauty Services',
            price: Math.floor(Math.random() * 100 + 40),
            open: true,
            loc: p.city || p.address || 'Ghana'
          })));
        }
        
        if (srvRes.data) {
          setServices(srvRes.data.filter(s => s.category_id?.includes('beauty') || s.category_id?.includes('salon') || s.category_id?.includes('hair')));
        }
        
        if (prodRes.data) {
          setProducts(prodRes.data.map(p => ({
            ...p,
            name: p.title,
            img: p.images?.[0] || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80',
            rating: p.rating || 0,
            reviews: p.reviews_count || 0
          })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCall = (prov) => {
    toast.success(`Calling ${prov.name}…`);
    const a = document.createElement('a'); a.href = `tel:${prov.phone || '+233240000000'}`; a.click();
  };
  const handleChat = (prov) => navigate('/chat', { state: { providerId: prov.user_id || prov.id, providerName: prov.name } });
  const handleDetail = (prov) => navigate(`/provider/${prov.id}`, { state: { provider: prov, type: 'beauty' } });

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <CategorySlider slides={cat?.slides || []} ctaLabel="Book Appointment" onCta={() => setTab('Salons & Providers')} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all ${tab === t ? 'bg-pink-500 text-[var(--text)] shadow-lg shadow-pink-500/25' : 'glass text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 flex justify-center text-pink-500"><Loader2 size={32} className="animate-spin" /></div>
        ) : (
          <>
            {/* ── SALONS & PROVIDERS tab ─────────────────────────── */}
            {tab === 'Salons & Providers' && (
              <div style={{animation:'fadeUp .4s ease'}}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {providers.map((prov, i) => {
                    const favd = isFav(prov.id, 'provider');
                    return (
                      <div key={prov.id} className="card overflow-hidden group"
                        style={{animation:`fadeUp .4s ${i*0.07}s ease both`}}>
                        {/* Image banner */}
                        <div className="relative h-44 cursor-pointer" onClick={() => handleDetail(prov)}>
                          <img src={prov.img} alt={prov.name}
                            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-dark-800 to-transparent" />
                          {/* Open/closed */}
                          <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold ${prov.open ? 'bg-emerald-500 text-[var(--text)]' : 'bg-white/20 text-[var(--text-muted)]'}`}>
                            {prov.open ? 'Open Now' : 'Closed'}
                          </div>
                          {/* Fav */}
                          <button onClick={e => { e.stopPropagation(); toggle(prov.id, 'provider', prov); }}
                            className="absolute top-3 left-3 w-7 h-7 glass rounded-full flex items-center justify-center hover:bg-red-500/20 transition-all">
                            <Heart size={12} className={favd ? 'fill-red-400 text-red-400' : 'text-[var(--text-muted)]'} />
                          </button>
                          {/* Rating */}
                          <div className="absolute bottom-3 left-4">
                            <StarRating rating={prov.rating} reviews={prov.reviews} size={11} />
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="flex items-start justify-between mb-1 cursor-pointer" onClick={() => handleDetail(prov)}>
                            <div>
                              <h3 className="font-semibold text-[var(--text)]">{prov.name}</h3>
                              <p className="text-xs text-[var(--text)]/40">{prov.specialty}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-[var(--text)]/30">from</p>
                              <p className="font-bold text-[var(--text)] text-sm">{fmt(prov.price)}</p>
                            </div>
                          </div>
                          <p className="text-xs text-[var(--text)]/35 flex items-center gap-1 mb-4">
                            <MapPin size={10}/> {prov.loc}
                          </p>

                          {/* Call / Chat / Book */}
                          <div className="flex gap-2">
                            <button onClick={() => handleCall(prov)}
                              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--bg-card)] hover:bg-emerald-500/20 border border-white/8 transition-all">
                              <Phone size={11}/> Call
                            </button>
                            <button onClick={() => handleChat(prov)}
                              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--bg-card)] hover:bg-blue-500/20 border border-white/8 transition-all">
                              <MessageCircle size={11}/> Chat
                            </button>
                            <button onClick={() => setBooking({ name:`Appointment at ${prov.name}`, price: prov.price })}
                              className="flex-1 flex items-center justify-center py-2 rounded-xl text-xs font-medium text-[var(--text)] bg-pink-600 hover:bg-pink-500 transition-all">
                              Book
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {providers.length === 0 && (
                    <div className="col-span-full py-20 text-center text-[var(--text-muted)] border border-white/5 rounded-3xl">
                      No salons or providers found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SERVICES tab ──────────────────────────────────── */}
            {tab === 'Services' && (
              <div style={{animation:'fadeUp .4s ease'}}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {services.map((svc, i) => (
                    <div key={svc.id} className="card p-5 card-hover group"
                      style={{animation:`fadeUp .35s ${i*0.05}s ease both`}}>
                      <div className="text-4xl mb-3">✨</div>
                      <h3 className="font-semibold text-[var(--text)] mb-1">{svc.title}</h3>
                      <p className="text-xs text-muted mb-3 leading-relaxed truncate">{svc.description || 'Professional beauty service'}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-pink-400">{fmt(svc.price)}</span>
                        <button onClick={() => setBooking(svc)} className="btn btn-primary btn-sm">Book</button>
                      </div>
                    </div>
                  ))}
                  {services.length === 0 && (
                    <div className="col-span-full py-20 text-center text-[var(--text-muted)] border border-white/5 rounded-3xl">
                      No services found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── FASHION SHOP tab ──────────────────────────────── */}
            {tab === 'Fashion Shop' && (
              <div style={{animation:'fadeUp .4s ease'}}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {products.map((item, i) => {
                    const favd = isFav(item.id, 'product');
                    return (
                      <div key={item.id} className="card group overflow-hidden card-hover"
                        style={{animation:`fadeUp .35s ${i*0.05}s ease both`}}>
                        <div className="relative aspect-square overflow-hidden bg-[var(--bg-card)]">
                          <img src={item.img} alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <button onClick={() => toggle(item.id, 'product', item)}
                            className="absolute top-2 right-2 w-7 h-7 glass rounded-full flex items-center justify-center hover:bg-red-500/20 transition-all">
                            <Heart size={11} className={favd ? 'fill-red-400 text-red-400' : 'text-[var(--text-muted)]'} />
                          </button>
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-medium text-[var(--text)] line-clamp-1 mb-1">{item.name}</p>
                          <div className="flex items-center gap-1 mb-2">
                            {[1,2,3,4,5].map(n => <Star key={n} size={9} className={n <= item.rating ? 'stars-filled fill-current' : 'text-[var(--text)]/10'} />)}
                            <span className="text-[9px] text-[var(--text)]/30">({item.reviews})</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[var(--text)] text-sm">{fmt(item.price)}</span>
                            <button onClick={() => { if(addItem) { addItem(item); toast.success('Added!'); }}}
                              className="btn btn-primary btn-sm text-[10px] px-2 py-1">Add</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {products.length === 0 && (
                    <div className="col-span-full py-20 text-center text-[var(--text-muted)] border border-white/5 rounded-3xl">
                      No fashion products found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {booking && <BookingModal service={booking} onClose={() => setBooking(null)} />}
    </div>
  );
}
