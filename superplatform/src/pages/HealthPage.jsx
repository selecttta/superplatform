import React, { useState, useEffect } from 'react';
import { Search, Video, Phone, Clock, MessageCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CategorySlider from '../components/common/CategorySlider';
import BookingModal from '../components/common/BookingModal';
import StarRating from '../components/common/StarRating';
import { CATEGORIES } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { fmt } from '../utils/helpers';

const cat = CATEGORIES.find(c => c.id === 'health');
const TABS = ['Doctors', 'Lab Tests', 'Pharmacy', 'Mental Health'];

export default function HealthPage() {
  const [tab, setTab] = useState('Doctors');
  const [search, setSearch] = useState('');
  const [booking, setBooking] = useState(null);
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [docsRes, srvRes] = await Promise.all([
          supabase.from('provider_profiles').select('*').eq('category', 'health').eq('status', 'active'),
          supabase.from('services').select('*').eq('status', 'active')
        ]);
        
        if (docsRes.data) {
          setDoctors(docsRes.data.map(d => ({
            ...d,
            name: d.full_name || d.business_name || 'Doctor',
            specialty: d.specialty || 'General Practitioner',
            img: d.avatar_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&q=80',
            rating: d.rating || 0,
            reviews: d.jobs_completed || 0,
            avail: 'Available Today',
            price: Math.floor(Math.random() * 100 + 50) // Mock price if not available
          })));
        }
        
        if (srvRes.data) {
          setServices(srvRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredDocs = doctors.filter(d =>
    (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.specialty || '').toLowerCase().includes(search.toLowerCase())
  );

  const getServicesForTab = () => {
    if (tab === 'Lab Tests') return services.filter(s => s.category_id?.includes('lab') || s.title?.toLowerCase().includes('test') || s.title?.toLowerCase().includes('lab'));
    if (tab === 'Pharmacy') return services.filter(s => s.category_id?.includes('pharmacy') || s.title?.toLowerCase().includes('tablet') || s.title?.toLowerCase().includes('mg'));
    if (tab === 'Mental Health') return services.filter(s => s.category_id?.includes('mental') || s.title?.toLowerCase().includes('therapy') || s.title?.toLowerCase().includes('counsel'));
    return [];
  };

  // ── Real interactions ──────────────────────────────────────────────────────
  const handleCall = (doc) => {
    const a = document.createElement('a');
    a.href = `tel:${doc.phone || '+233240000000'}`;
    a.click();
  };
  const handleChat = (doc) => navigate('/chat', { state: { providerId: doc.user_id || doc.id, providerName: doc.name } });
  const handleDetail = (doc) => navigate(`/provider/${doc.id}`, { state: { provider: { ...doc, specialty: doc.specialty, img: doc.img }, type: 'health' } });

  const activeServices = getServicesForTab();

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <CategorySlider slides={cat?.slides || []} ctaLabel="Consult Now" onCta={() => setTab('Doctors')} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all ${tab === t ? 'bg-red-500 text-[var(--text)] shadow-lg shadow-red-500/25' : 'glass text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
              {t}
            </button>
          ))}
        </div>

        {(tab === 'Doctors' || tab === 'Pharmacy') && (
          <div className="relative mb-6 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={15}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input pl-10" placeholder={`Search ${tab.toLowerCase()}…`} />
          </div>
        )}

        {loading ? (
          <div className="py-20 flex justify-center text-red-500">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : (
          <>
            {/* DOCTORS — fully clickable cards */}
            {tab === 'Doctors' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDocs.map(doc => (
                  <div key={doc.id} className="card overflow-hidden group card-hover cursor-pointer"
                    onClick={() => handleDetail(doc)}>
                    <div className="relative h-40 bg-[var(--bg-card)] overflow-hidden">
                      <img src={doc.img} alt={doc.name}
                        className="w-full h-full object-cover object-top opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-dark-800 to-transparent" />
                      {doc.badge && (
                        <div className="absolute top-3 right-3 badge badge-red text-[10px]">{doc.badge}</div>
                      )}
                      <div className="absolute bottom-3 left-4">
                        <StarRating rating={doc.rating} reviews={doc.reviews} size={11} />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-[var(--text)] mb-0.5">{doc.name}</h3>
                      <p className="text-sm text-red-400 mb-3">{doc.specialty}</p>
                      <div className="flex items-center justify-between mb-4 text-sm">
                        <div className="flex items-center gap-1 text-muted"><Clock size={12}/> <span className="text-emerald-400 font-medium">{doc.avail}</span></div>
                        <span className="font-bold text-[var(--text)]">{fmt(doc.price)}<span className="text-xs text-muted font-normal">/session</span></span>
                      </div>
                      {/* Buttons — stop propagation so card click doesn't re-trigger */}
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleCall(doc)}
                          className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--bg-card)] hover:bg-emerald-500/20 border border-white/8 transition-all">
                          <Phone size={11}/> Call
                        </button>
                        <button onClick={() => handleChat(doc)}
                          className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--bg-card)] hover:bg-blue-500/20 border border-white/8 transition-all">
                          <MessageCircle size={11}/> Chat
                        </button>
                        <button onClick={() => setBooking({ ...doc, type:'doctor' })}
                          className="flex-1 btn text-[var(--text)] text-xs gap-1" style={{background:'#ef4444'}}>
                          <Video size={12}/> Book
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredDocs.length === 0 && (
                  <div className="col-span-3 py-20 text-center text-muted">
                    <Search size={36} className="mx-auto mb-3 opacity-20"/>
                    <p>No doctors match your search.</p>
                  </div>
                )}
              </div>
            )}

            {/* LAB TESTS & MENTAL HEALTH */}
            {(tab === 'Lab Tests' || tab === 'Mental Health') && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeServices.map((t, i) => (
                  <div key={i} className="card-hover p-5 flex items-center gap-4">
                    <span className="text-3xl shrink-0">{tab === 'Lab Tests' ? '🔬' : '🧠'}</span>
                    <div className="flex-1">
                      <h3 className="font-medium text-[var(--text)] text-sm">{t.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted flex items-center gap-1"><Clock size={10}/>{t.duration_minutes || 60}m</span>
                        <span className="text-xs font-bold text-brand-400">{fmt(t.price)}</span>
                      </div>
                    </div>
                    <button onClick={() => setBooking({ name: t.title, price: t.price })}
                      className="btn text-[var(--text)] btn-sm shrink-0" style={{background:'#ef4444'}}>Book</button>
                  </div>
                ))}
                {activeServices.length === 0 && (
                  <div className="col-span-full py-20 text-center text-muted border border-[var(--border)] border-dashed rounded-3xl">
                    <p>No {tab.toLowerCase()} available.</p>
                  </div>
                )}
              </div>
            )}

            {/* PHARMACY */}
            {tab === 'Pharmacy' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeServices.filter(s => search === '' || s.title?.toLowerCase().includes(search.toLowerCase())).map((med, i) => (
                  <div key={i} className="card-hover p-4 text-center">
                    <div className="text-3xl mb-2">💊</div>
                    <p className="text-sm font-medium text-[var(--text)] mb-1">{med.title}</p>
                    <p className="text-xs text-emerald-400 mb-3">In stock - {fmt(med.price)}</p>
                    <button onClick={() => setBooking({ name: med.title, price: med.price })}
                      className="w-full py-1.5 btn text-[var(--text)] text-xs" style={{background:'#ef4444'}}>Order</button>
                  </div>
                ))}
                {activeServices.length === 0 && (
                  <div className="col-span-full py-20 text-center text-muted border border-[var(--border)] border-dashed rounded-3xl">
                    <p>No medicines available matching "{search}".</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {booking && <BookingModal service={booking} onClose={() => setBooking(null)} />}
    </div>
  );
}
