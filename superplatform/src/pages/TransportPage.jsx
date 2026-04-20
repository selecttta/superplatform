import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Phone, Car, Package, Bus, X, Check,
         MessageCircle, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CategorySlider from '../components/common/CategorySlider';
import PaymentModal from '../components/common/PaymentModal';
import StarRating from '../components/common/StarRating';
import { CATEGORIES } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { fmt } from '../utils/helpers';
import toast from 'react-hot-toast';

const cat = CATEGORIES.find(c => c.id === 'transport');

const RIDE_TYPES = [
  { id:'standard', label:'Standard',  icon:'🚗', desc:'Comfortable sedan', priceKm:3.5,  eta:'3–5 min' },
  { id:'premium',  label:'Premium',   icon:'🚙', desc:'Luxury vehicle',    priceKm:6,    eta:'5–8 min' },
  { id:'delivery', label:'Delivery',  icon:'📦', desc:'Package delivery',  priceKm:4,    eta:'10–15 min' },
  { id:'charter',  label:'Charter',   icon:'🚌', desc:'Full vehicle hire', priceKm:null, eta:'On request', flat:500 },
];

export default function TransportPage() {
  const navigate  = useNavigate();
  const [pickup,    setPickup]    = useState('');
  const [dropoff,   setDropoff]   = useState('');
  const [rideType,  setRideType]  = useState('standard');
  const [searching, setSearching] = useState(false);
  const [drivers,   setDrivers]   = useState([]);
  const [booked,    setBooked]    = useState(null);
  const [payOpen,   setPayOpen]   = useState(false);
  const [rideStatus, setRideStatus] = useState('');

  const [allProviders, setAllProviders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from('provider_profiles')
          .select('*')
          .eq('status', 'active')
          .eq('category', 'transport');
        if (data) {
          setAllProviders(data.map(p => ({
            ...p,
            name: p.full_name || p.business_name,
            rating: p.rating || 0,
            trips: p.jobs_completed || 0,
            car: p.business_name || 'Standard Vehicle', // Fallbacks since car details vary
            color: 'Silver',
            plate: 'GH ' + Math.floor(1000 + Math.random()*9000), // Mock plate for UI
            eta: Math.floor(Math.random()*10 + 2) + ' min',
            price: Math.floor(Math.random()*50 + 20),
            img: p.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
            specialty: p.specialty || 'Standard Rides',
            verified: true
          })));
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    })();
  }, []);

  const selected = RIDE_TYPES.find(r => r.id === rideType);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!pickup || !dropoff) { toast.error('Please fill in pickup and destination'); return; }
    setSearching(true);
    await new Promise(r => setTimeout(r, 1800));
    setDrivers(allProviders.slice(0, 4)); // Show top 4
    setSearching(false);
    // Scroll to results
    setTimeout(() => document.getElementById('driver-results')?.scrollIntoView({ behavior:'smooth', block:'start' }), 100);
  };

  const handleBook = (driver) => {
    setBooked(driver);
    setRideStatus('searching');
    setTimeout(() => {
      setRideStatus('arriving');
      toast.success(`${driver.name} is on the way!`, { icon:'🚗' });
    }, 2000);
  };

  const startRide = () => {
    setRideStatus('in_ride');
    setTimeout(() => setRideStatus('completed'), 8000);
  };

  const handleCall = (driver) => {
    toast.success(`Calling ${driver.name}…`);
    const a = document.createElement('a');
    a.href = `tel:${driver.phone || '+233240000000'}`;
    a.click();
  };

  const handleChat = (provider) => {
    navigate('/chat', { state: { providerId: provider.user_id || provider.id, providerName: provider.name } });
  };

  const handleProviderClick = (provider) => {
    navigate(`/provider/${provider.id}`, { state: { provider, type: 'driver' } });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">

      {/* ── Slider ──────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <CategorySlider slides={cat?.slides || []} ctaLabel="Book a Ride" onCta={() => {}} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">

          {/* ── LEFT: booking form ────────────────────────────── */}
          <div>
            <h2 className="heading-lg mb-2">Book a Ride</h2>
            <p className="text-muted mb-6">GPS-tracked, safe drivers across Greater Accra.</p>

            {/* Ride type selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              {RIDE_TYPES.map(rt => (
                <button key={rt.id} onClick={() => setRideType(rt.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${rideType === rt.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/8 bg-[var(--bg-card)] hover:border-white/20'}`}>
                  <div className="text-2xl mb-1">{rt.icon}</div>
                  <p className={`text-xs font-semibold ${rideType === rt.id ? 'text-blue-300' : 'text-[var(--text-muted)]'}`}>{rt.label}</p>
                  <p className="text-[10px] text-[var(--text)]/35 mt-0.5">{rt.eta}</p>
                </button>
              ))}
            </div>

            {/* Location inputs */}
            <form onSubmit={handleSearch} className="space-y-3 mb-6">
              <div>
                <label className="label">Pickup Location</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <input value={pickup} onChange={e => setPickup(e.target.value)}
                    className="input pl-9" placeholder="Your current location" required />
                </div>
              </div>
              <div>
                <label className="label">Destination</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand-500 shrink-0" />
                  <input value={dropoff} onChange={e => setDropoff(e.target.value)}
                    className="input pl-9" placeholder="Where are you going?" required />
                </div>
              </div>
              <button type="submit" disabled={searching} className="btn btn-lg w-full text-[var(--text)] font-bold"
                style={{background:'#3b82f6', boxShadow:'0 8px 24px #3b82f640'}}>
                {searching ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    Finding drivers…
                  </span>
                ) : <span className="flex items-center gap-2"><Navigation size={16}/> Find Drivers</span>}
              </button>
            </form>

            {/* ── Search results driver cards ────────────────── */}
            {drivers.length > 0 && !booked && (
              <div id="driver-results" style={{animation:'fadeUp .4s ease'}}>
                <h3 className="font-semibold text-[var(--text)] mb-3">Available Drivers Near You</h3>
                <div className="space-y-3">
                  {drivers.map(driver => (
                    <div key={driver.id} className="card p-4 flex items-center gap-4 hover:border-blue-500/30 transition-all cursor-pointer"
                      onClick={() => handleProviderClick(driver)}>
                      <img src={driver.img} alt={driver.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-[var(--text)] text-sm">{driver.name}</p>
                          <StarRating rating={driver.rating} size={10} />
                        </div>
                        <p className="text-xs text-muted">{driver.car} · {driver.color} · {driver.plate}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-[var(--text)]/45 flex items-center gap-1"><Clock size={10}/>{driver.eta}</span>
                          <span className="text-xs font-bold text-brand-400">{fmt(driver.price)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={e => { e.stopPropagation(); handleCall(driver); }}
                          className="w-8 h-8 glass rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-emerald-500/20 transition-all">
                          <Phone size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleChat(driver); }}
                          className="w-8 h-8 glass rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-blue-500/20 transition-all">
                          <MessageCircle size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleBook(driver); }}
                          className="btn btn-sm text-[var(--text)] shrink-0 rounded-xl" style={{background:'#3b82f6'}}>
                          Book
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking status card */}
            {booked && (
              <div className="card p-6" style={{animation:'fadeUp .4s ease'}}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Car size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text)]">
                      {rideStatus === 'searching'  && 'Connecting to driver…'}
                      {rideStatus === 'arriving'   && `${booked.name} is arriving!`}
                      {rideStatus === 'in_ride'    && 'Ride in progress'}
                      {rideStatus === 'completed'  && 'Ride completed 🎉'}
                    </p>
                    <p className="text-xs text-muted">{booked.car} · {booked.plate}</p>
                  </div>
                  {rideStatus === 'searching' && <div className="ml-auto w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                  {rideStatus === 'completed' && <div className="ml-auto w-7 h-7 bg-emerald-500/20 rounded-full flex items-center justify-center"><Check size={14} className="text-emerald-400"/></div>}
                </div>

                <div className="space-y-2 text-sm mb-5">
                  {[
                    { k:'Driver',         v: booked.name },
                    { k:'Vehicle',        v: `${booked.car} (${booked.color})` },
                    { k:'Plate',          v: booked.plate },
                    { k:'ETA',            v: booked.eta },
                    { k:'Estimated Fare', v: fmt(booked.price) },
                  ].map(row => (
                    <div key={row.k} className="flex justify-between">
                      <span className="text-muted">{row.k}</span>
                      <span className="text-[var(--text)] font-medium font-mono text-xs">{row.v}</span>
                    </div>
                  ))}
                </div>

                {rideStatus === 'arriving' && (
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => handleCall(booked)} className="flex-1 btn-secondary text-sm gap-1.5"><Phone size={13}/> Call</button>
                    <button onClick={() => handleChat(booked)} className="flex-1 btn-secondary text-sm gap-1.5"><MessageCircle size={13}/> Chat</button>
                    <button onClick={startRide} className="flex-1 btn text-[var(--text)] text-sm" style={{background:'#3b82f6'}}>Start Ride</button>
                  </div>
                )}
                {rideStatus === 'completed' && (
                  <button onClick={() => setPayOpen(true)} className="btn-primary w-full">Pay {fmt(booked.price)}</button>
                )}
                {rideStatus !== 'in_ride' && rideStatus !== 'completed' && (
                  <button onClick={() => { setBooked(null); setDrivers([]); setRideStatus(''); }}
                    className="btn-danger w-full text-sm mt-2 flex items-center justify-center gap-1.5">
                    <X size={13}/> Cancel Ride
                  </button>
                )}
              </div>
            )}

            {/* Quick options */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { label:'Send a Parcel', icon:'📦', sub:'Same-day delivery' },
                { label:'Charter a Bus', icon:'🚌', sub:'Groups & events' },
              ].map(item => (
                <div key={item.label} className="card p-4 text-center hover:border-blue-500/30 cursor-pointer transition-all hover:-translate-y-0.5"
                  onClick={() => handleSearch({ preventDefault: ()=>{} })}>
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <p className="font-semibold text-[var(--text)] text-sm">{item.label}</p>
                  <p className="text-xs text-muted mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Map ────────────────────────────────────── */}
          <div className="hidden lg:block">
            <div className="rounded-2xl overflow-hidden h-[520px] relative sticky top-24">
              <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1000&q=80" alt="Map"
                className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 bg-[var(--bg)]/40" />
              <div className="absolute inset-0 flex flex-col justify-between p-6">
                <div className="glass rounded-xl p-3 self-start">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Live GPS Tracking</p>
                  <p className="text-sm font-semibold text-[var(--text)]">Greater Accra Region</p>
                </div>
                {booked && rideStatus === 'arriving' && (
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="dot-online" />
                      <p className="text-sm font-semibold text-[var(--text)]">{booked.name} — {booked.eta} away</p>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{width:'65%', animation:'pulse 2s infinite'}} />
                    </div>
                  </div>
                )}
                {!booked && (
                  <div className="glass rounded-xl p-4 text-center">
                    <MapPin size={24} className="text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-[var(--text)] font-medium">GPS Map Integration</p>
                    <p className="text-xs text-muted mt-1">Add Google Maps API key for live tracking</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            TRANSPORT PROVIDER CARDS — BELOW THE MAP/FORM
        ═══════════════════════════════════════════════════════ */}
        <div className="mt-14" style={{animation:'fadeUp .5s ease'}}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="heading-md sm:heading-lg mb-1 break-words">🚗 Available Transport Providers</h2>
              <p className="text-muted text-sm">Verified drivers & logistics providers near you</p>
            </div>
            <button className="btn btn-ghost btn-sm text-[var(--text-muted)] hover:text-[var(--text)]">
              View All <ChevronRight size={14} />
            </button>
          </div>

          {loading ? (
             <div className="py-20 flex justify-center text-blue-400"><Loader2 size={32} className="animate-spin" /></div>
          ) : allProviders.length === 0 ? (
             <div className="py-20 text-center text-[var(--text-muted)] border border-white/5 rounded-3xl">No transparent providers available yet.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {allProviders.map(prov => (
                <div
                  key={prov.id}
                  onClick={() => handleProviderClick(prov)}
                  className="card card-hover cursor-pointer group"
                  style={{animation:`fadeUp .4s ${Math.random() * 0.2}s ease both`}}
                >
                  {/* Provider banner */}
                  <div className="relative h-36 bg-gradient-to-br from-blue-900/60 to-dark-800 overflow-hidden">
                    <img src={prov.img} alt={prov.name}
                      className="w-full h-full object-cover object-top opacity-40 group-hover:opacity-60 transition-opacity duration-300 scale-110 group-hover:scale-100 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-800 to-transparent" />
                    {prov.verified && (
                      <div className="absolute top-3 right-3 glass px-2 py-0.5 rounded-full flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        <span className="text-[10px] text-emerald-300">Verified</span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3">
                      <StarRating rating={prov.rating} reviews={prov.trips} size={11} />
                    </div>
                  </div>

                  {/* Provider info */}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={prov.img} alt={prov.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-[var(--border)] shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text)] text-sm truncate">{prov.name}</p>
                        <p className="text-xs text-[var(--text)]/40 truncate">{prov.specialty}</p>
                      </div>
                      <div className="ml-auto text-right shrink-0">
                        <p className="text-xs text-[var(--text)]/35">from</p>
                        <p className="font-bold text-[var(--text)] text-sm">{fmt(prov.price)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[var(--text)]/40 mb-4">
                      <span className="flex items-center gap-1"><Car size={10}/> {prov.car}</span>
                      <span className="flex items-center gap-1"><Clock size={10}/> {prov.eta}</span>
                      <span>{prov.trips.toLocaleString()} trips</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleCall(prov)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--bg-card)] hover:bg-emerald-500/20 transition-all border border-white/8">
                        <Phone size={12} /> Call
                      </button>
                      <button onClick={() => handleChat(prov)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--bg-card)] hover:bg-blue-500/20 transition-all border border-white/8">
                        <MessageCircle size={12} /> Chat
                      </button>
                      <button onClick={() => handleProviderClick(prov)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-[var(--text)] bg-blue-600 hover:bg-blue-500 transition-all">
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Payment modal */}
      {payOpen && (
        <PaymentModal
          amount={booked?.price || 0}
          title="Ride Payment"
          onSuccess={() => { setBooked(null); setDrivers([]); setRideStatus(''); toast.success('Payment done! Thanks for riding.'); }}
          onClose={() => setPayOpen(false)}
        />
      )}
    </div>
  );
}
