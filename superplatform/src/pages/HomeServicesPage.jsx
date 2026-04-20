import React, { useState, useEffect } from 'react';
import { MapPin, Shield, Check, Phone, MessageCircle, Heart, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CategorySlider from '../components/common/CategorySlider';
import BookingModal from '../components/common/BookingModal';
import StarRating from '../components/common/StarRating';
import { CATEGORIES } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { fmt } from '../utils/helpers';
import { useFavStore } from '../store/favStore';

const SERVICE_CATEGORIES = [
  { id:1,  name:'Plumbing',         img:'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80', desc:'Leaks, blockages, pipe installation & more' },
  { id:2,  name:'Electrical',       img:'https://images.unsplash.com/photo-1621905251918-b3a69d60f2d2?w=400&q=80', desc:'Wiring, sockets, circuit breakers & lighting' },
  { id:3,  name:'Cleaning',         img:'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80', desc:'Full house deep cleaning service' },
  { id:4,  name:'AC Service',       img:'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&q=80', desc:'Installation, cleaning & gas refilling' },
  { id:5,  name:'Painting',         img:'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80', desc:'Interior & exterior painting' },
  { id:6,  name:'Carpentry',        img:'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80', desc:'Furniture assembly & custom builds' },
  { id:7,  name:'Security & CCTV',  img:'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&q=80', desc:'CCTV installation & alarm systems' },
  { id:8,  name:'Appliance Repair', img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', desc:'Fridge, washing machine & oven repair' },
  { id:9,  name:'Handyman',         img:'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&q=80', desc:'All-round small fixes & tasks' },
  { id:10, name:'Tailor',           img:'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80', desc:'Alterations, bespoke clothing & repairs' },
];

const cat = CATEGORIES.find(c => c.id === 'home-services');

export default function HomeServicesPage() {
  const navigate  = useNavigate();
  const { toggle, isFav } = useFavStore();
  const [selectedSvc, setSelectedSvc] = useState(null);
  const [booking,     setBooking]     = useState(null);

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from('provider_profiles')
          .select('*')
          .eq('status', 'active')
          .in('category', ['home-service', 'home-services']);
          
        if (data) {
          setProviders(data.map(p => ({
            ...p,
            name: p.business_name || p.full_name || 'Home Service Pro',
            specialty: p.specialty || 'General Maintenance',
            img: p.avatar_url || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80',
            rating: p.rating || 0,
            jobs: p.jobs_completed || 0,
            loc: p.city || p.address || 'Ghana',
            price: Math.floor(Math.random()*100 + 50),
            verified: true
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
    const a = document.createElement('a');
    a.href = `tel:${prov.phone || '+233240000000'}`;
    a.click();
  };
  const handleChat   = (prov) => navigate('/chat', { state: { providerId: prov.user_id || prov.id, providerName: prov.name } });
  const handleDetail = (prov) => navigate(`/provider/${prov.id}`, { state: { provider: prov, type: 'home-service' } });

  const filteredProviders = selectedSvc 
    ? providers.filter(p => (p.specialty || '').toLowerCase().includes(selectedSvc.name.toLowerCase()) || 
                            (p.description || '').toLowerCase().includes(selectedSvc.name.toLowerCase()))
    : providers;

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <CategorySlider slides={cat?.slides || []} ctaLabel="Book a Pro" onCta={() => {}} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Service image cards */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-lg">What do you need?</h2>
          <span className="text-muted text-sm">{SERVICE_CATEGORIES.length} services available</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-12">
          {SERVICE_CATEGORIES.map(svc => (
            <button key={svc.id}
              onClick={() => setSelectedSvc(selectedSvc?.id === svc.id ? null : svc)}
              className={`card overflow-hidden text-left group transition-all hover:-translate-y-0.5 ${selectedSvc?.id === svc.id ? 'ring-2 ring-emerald-500' : 'card-hover'}`}>
              {/* Real image */}
              <div className="relative h-24 overflow-hidden">
                <img src={svc.img} alt={svc.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 to-transparent" />
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-[var(--text)] text-xs mb-0.5">{svc.name}</h3>
                <p className="text-[10px] font-bold text-emerald-400">Available</p>
              </div>
            </button>
          ))}
        </div>

        {/* Selected service quick-book bar */}
        {selectedSvc && (
          <div className="glass rounded-2xl p-4 mb-10 flex flex-wrap items-center gap-4" style={{animation:'fadeUp .3s ease'}}>
            <img src={selectedSvc.img} alt={selectedSvc.name} className="w-12 h-12 rounded-xl object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--text)]">{selectedSvc.name}</p>
              <p className="text-xs text-muted">{selectedSvc.desc}</p>
            </div>
            <button onClick={() => setBooking({ name: selectedSvc.name, price: 100 })} className="btn btn-primary btn-sm">Book Service</button>
            <button onClick={() => setSelectedSvc(null)} className="text-[var(--text)]/30 hover:text-[var(--text)] text-lg leading-none">×</button>
          </div>
        )}

        {/* Provider cards */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="heading-lg">{selectedSvc ? `Providers for ${selectedSvc.name}` : 'Top Providers'}</h2>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center text-emerald-500"><Loader2 size={32} className="animate-spin" /></div>
        ) : filteredProviders.length === 0 ? (
          <div className="py-20 text-center text-[var(--text-muted)] border border-white/5 rounded-3xl">
            No providers found{selectedSvc ? ` for ${selectedSvc.name}` : ''}.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProviders.map((prov, i) => {
              const favd = isFav(prov.id, 'provider');
              return (
                <div key={prov.id} className="card overflow-hidden group cursor-pointer"
                  style={{animation:`fadeUp .4s ${Math.random() * 0.15}s ease both`}}>
                  {/* Banner — click opens detail */}
                  <div className="relative h-40 bg-[var(--bg-card)]" onClick={() => handleDetail(prov)}>
                    <img src={prov.img} alt={prov.name}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900 to-transparent" />
                    {prov.verified && (
                      <div className="absolute top-3 right-3 glass px-2 py-0.5 rounded-full flex items-center gap-1.5">
                        <Shield size={10} className="text-emerald-400" />
                        <span className="text-[10px] text-emerald-300">Verified</span>
                      </div>
                    )}
                    <button onClick={e => { e.stopPropagation(); toggle(prov.id, 'provider', prov); }}
                      className="absolute top-3 left-3 w-7 h-7 glass rounded-full flex items-center justify-center hover:bg-red-500/20">
                      <Heart size={12} className={favd ? 'fill-red-400 text-red-400' : 'text-[var(--text-muted)]'} />
                    </button>
                    <div className="absolute bottom-3 left-4">
                      <StarRating rating={prov.rating} reviews={prov.jobs} size={11} />
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3" onClick={() => handleDetail(prov)}>
                      <img src={prov.img} alt={prov.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--text)] text-sm">{prov.name}</p>
                        <p className="text-xs text-[var(--text)]/40 truncate">{prov.specialty}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-[var(--text)]/30">from</p>
                        <p className="font-bold text-[var(--text)] text-sm">{fmt(prov.price)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[var(--text)]/35 mb-4">
                      <span className="flex items-center gap-1"><MapPin size={10}/>{prov.loc}</span>
                      <span>{prov.jobs.toLocaleString()} jobs</span>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => handleCall(prov)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--bg-card)] hover:bg-emerald-500/20 border border-white/8 transition-all">
                        <Phone size={12}/> Call
                      </button>
                      <button onClick={() => handleChat(prov)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--bg-card)] hover:bg-blue-500/20 border border-white/8 transition-all">
                        <MessageCircle size={12}/> Chat
                      </button>
                      <button onClick={() => setBooking({ name:`${prov.name} — ${prov.specialty}`, price: prov.price })}
                        className="flex-1 flex items-center justify-center py-2 rounded-xl text-xs font-medium text-[var(--text)] bg-emerald-600 hover:bg-emerald-500 transition-all">
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-14 grid sm:grid-cols-3 gap-4">
          {[
            { icon:'✅', title:'Verified Providers', desc:'Every provider is ID-verified and background checked.' },
            { icon:'💬', title:'Chat Before Booking', desc:'Discuss your requirements before committing.' },
            { icon:'🔒', title:'Secure Payments',    desc:'Pay only after the job is done to your satisfaction.' },
          ].map((item, i) => (
            <div key={i} className="glass rounded-2xl p-5 text-center">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-[var(--text)] mb-2">{item.title}</h3>
              <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {booking && <BookingModal service={booking} onClose={() => setBooking(null)} />}
    </div>
  );
}
