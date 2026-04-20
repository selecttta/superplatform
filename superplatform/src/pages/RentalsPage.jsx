import React, { useState, useEffect } from 'react';
import { Fuel, Users, Settings, MapPin, Phone, MessageCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CategorySlider from '../components/common/CategorySlider';
import PaymentModal from '../components/common/PaymentModal';
import { CATEGORIES } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { fmt } from '../utils/helpers';

const cat = CATEGORIES.find(c => c.id === 'rentals');

const TABS = [
  { id: 'vehicles', label: '🚗 Cars' },
  { id: 'venues', label: '🎪 Event Spaces' },
  { id: 'equipment', label: '🔨 Equipment' },
];

export default function RentalsPage() {
  const [tab, setTab] = useState('vehicles');
  const [payData, setPayData] = useState(null);
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from('rentals')
          .select('*, profiles!rentals_owner_id_fkey(full_name, phone)')
          .eq('status', 'active');
        if (data) setItems(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCall = (item) => {
    const phone = item.profiles?.phone || '+233241000000';
    const a = document.createElement('a');
    a.href = `tel:${phone}`;
    a.click();
  };
  const handleChat = (item) => navigate('/chat', { state: { providerId: item.owner_id, providerName: item.profiles?.full_name || 'Owner' } });
  
  const handleDetail = (item) => {
    let specialty = item.unit || '/day';
    if (item.category === 'vehicles') {
      specialty = `${item.fuel_type || 'Petrol'} · ${item.seats || 4} seats · ${item.transmission || 'Auto'}`;
    } else if (item.category === 'venues') {
      specialty = `Up to ${item.capacity || 50} guests`;
    }
    
    navigate(`/provider/${item.id}`, {
      state: {
        provider: {
          id: item.id, name: item.title, img: item.images?.[0] || '', price: item.price,
          specialty, phone: item.profiles?.phone, rating: 0, jobs: 0, loc: item.location || item.city || 'Ghana', verified: true,
        },
        type: 'rental',
      }
    });
  };

  const filtered = items.filter(i => (i.category || 'vehicles') === tab);

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <CategorySlider slides={cat?.slides || []} ctaLabel="Browse Rentals" onCta={() => {}} />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-3 mb-8">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${tab === t.id ? 'bg-cyan-500 text-[var(--text)]' : 'glass text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 flex justify-center text-cyan-400">
             <Loader2 size={32} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-[var(--text-muted)] border border-[var(--border)] rounded-3xl border-dashed">
            <p>No {TABS.find(t=>t.id===tab)?.label.split(' ')[1]} available yet.</p>
          </div>
        ) : (
          <>
            {/* CARS */}
            {tab === 'vehicles' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map(car => (
                  <div key={car.id}
                    className={`card overflow-hidden transition-all duration-300 cursor-pointer ${car.stock_quantity !== 0 ? 'hover:-translate-y-1 hover:border-cyan-500/30' : 'opacity-55'}`}
                    onClick={() => car.stock_quantity !== 0 && handleDetail(car)}>
                    <div className="relative h-44">
                      <img src={car.images?.[0] || 'https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=400&q=80'} alt={car.title} className="w-full h-full object-cover" />
                      <div className={`absolute top-2 left-2 badge text-[var(--text)] text-xs ${car.stock_quantity !== 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>{car.stock_quantity !== 0 ? 'Available' : 'Booked'}</div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-[var(--text)] mb-3">{car.title}</h3>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[{icon:<Fuel size={11}/>,val:car.fuel_type || 'Petrol'},{icon:<Users size={11}/>,val:`${car.seats || 4} seats`},{icon:<Settings size={11}/>,val:car.transmission || 'Automatic'}].map((spec,i)=>(
                          <div key={i} className="flex items-center gap-1 text-xs text-muted">{spec.icon}{spec.val}</div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
                        <div><span className="font-bold text-[var(--text)]">{fmt(car.price)}</span><span className="text-xs text-muted">{car.unit || '/day'}</span></div>
                        {car.stock_quantity !== 0 && (
                          <div className="flex gap-2">
                            <button onClick={() => handleCall(car)}
                              className="w-8 h-8 glass rounded-xl flex items-center justify-center text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
                              <Phone size={13}/>
                            </button>
                            <button onClick={() => handleChat(car)}
                              className="w-8 h-8 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-300 hover:bg-cyan-500/30 transition-all">
                              <MessageCircle size={13}/>
                            </button>
                            <button onClick={() => setPayData({ amount: car.price, title: `${car.title} — 1 day rental` })}
                              className="btn btn-sm text-[var(--text)]" style={{background:'#06b6d4'}}>Rent</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VENUES */}
            {tab === 'venues' && (
              <div className="grid sm:grid-cols-2 gap-6">
                {filtered.map(v => (
                  <div key={v.id} className="card overflow-hidden hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                    onClick={() => handleDetail(v)}>
                    <div className="h-52 overflow-hidden">
                      <img src={v.images?.[0] || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=500&q=80'} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-[var(--text)] mb-2">{v.title}</h3>
                      <div className="flex items-center gap-1 mb-1 text-xs text-muted"><MapPin size={10}/>{v.location || v.city || 'Ghana'}</div>
                      <p className="text-xs text-muted mb-4">Capacity: up to <span className="text-[var(--text)] font-medium">{v.capacity || 50} guests</span></p>
                      <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
                        <div><span className="font-bold text-[var(--text)]">{fmt(v.price)}</span><span className="text-xs text-muted">{v.unit || '/event'}</span></div>
                        <div className="flex gap-2">
                          <button onClick={() => handleCall(v)}
                            className="w-8 h-8 glass rounded-xl flex items-center justify-center text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
                            <Phone size={13}/>
                          </button>
                          <button onClick={() => handleChat(v)}
                            className="w-8 h-8 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-300 hover:bg-cyan-500/30 transition-all">
                            <MessageCircle size={13}/>
                          </button>
                          <button onClick={() => setPayData({ amount: v.price, title: `${v.title} venue booking` })}
                            className="btn text-[var(--text)] btn-sm" style={{background:'#06b6d4'}}>Book</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* EQUIPMENT */}
            {tab === 'equipment' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filtered.map((eq) => (
                  <div key={eq.id} className="card-hover p-5 cursor-pointer group"
                    onClick={() => handleDetail(eq)}>
                    <span className="text-4xl mb-3 block">🔨</span>
                    <h3 className="font-medium text-[var(--text)] text-sm mb-1">{eq.title}</h3>
                    <p className="text-xs font-bold text-cyan-400 mb-4">{fmt(eq.price)}<span className="text-[var(--text)]/30 font-normal">{eq.unit || '/day'}</span></p>
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleCall(eq)}
                        className="w-8 h-8 glass rounded-xl flex items-center justify-center text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
                        <Phone size={13}/>
                      </button>
                      <button onClick={() => handleChat(eq)}
                        className="w-8 h-8 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-300 hover:bg-cyan-500/30 transition-all">
                        <MessageCircle size={13}/>
                      </button>
                      <button onClick={() => setPayData({ amount: eq.price, title: `${eq.title} rental` })}
                        className="flex-1 btn text-[var(--text)] text-xs" style={{background:'#06b6d4'}}>Rent</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {payData && <PaymentModal amount={payData.amount} title={payData.title} onClose={() => setPayData(null)} onSuccess={() => setPayData(null)} />}
    </div>
  );
}
