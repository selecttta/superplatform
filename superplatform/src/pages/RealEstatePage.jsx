import React, { useState, useEffect } from 'react';
import { MapPin, Bed, Bath, Maximize, Heart, Phone, MessageCircle, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CategorySlider from '../components/common/CategorySlider';
import { CATEGORIES } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { fmt } from '../utils/helpers';

const cat = CATEGORIES.find(c => c.id === 'real-estate');
const BADGE_COLORS = { FEATURED:'bg-blue-500', HOT:'bg-red-500', LUXURY:'bg-yellow-500 text-dark-900', NEW:'bg-emerald-500' };

function currency(prop) {
  const num = Number(String(prop.price).replace(/,/g,''));
  return `GH₵${num.toLocaleString()}`;
}

export default function RealEstatePage() {
  const [type,     setType]     = useState('All');
  const [propType, setPropType] = useState('All');
  const [search,   setSearch]   = useState('');
  const [favs,     setFavs]     = useState([]);
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from('properties')
          .select('*, profiles!properties_agent_id_fkey(full_name, phone)')
          .eq('status', 'active');
        if (data) {
          setProperties(data.map(p => ({
            ...p,
            name: p.title,
            img: p.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500&q=80',
            badge: p.is_featured ? 'FEATURED' : null,
            type: p.type === 'lease' ? 'Rent' : 'Sale',
            propType: 'House', // Default fallback
            location: p.address || p.city || 'Ghana',
            beds: p.bedrooms,
            baths: p.bathrooms,
            sqft: p.size_sqm ? p.size_sqm * 10 : null,
            agentName: p.profiles?.full_name || 'Agent',
            phone: p.profiles?.phone
          })));
        }
      } catch (e) {
        console.error('Error loading properties', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Real interactions ─────────────────────────────────────────────────────
  const handleCall = (prop) => {
    const a = document.createElement('a');
    a.href = `tel:${prop.phone || '+233240000000'}`;
    a.click();
  };
  const handleChat   = (prop) => navigate('/chat', { state: { providerId: prop.agent_id || prop.id, providerName: prop.agentName || prop.name } });
  const handleDetail = (prop) => navigate(`/provider/${prop.id}`, { state: { provider: { ...prop, name: prop.name, img: prop.img, price: Number(String(prop.price).replace(/,/g,'')), specialty: prop.type + ' Property', phone: prop.phone }, type: 'real-estate' } });

  const filtered = properties.filter(p =>
    (type === 'All' || p.type === type) &&
    (propType === 'All' || (p.propType || 'House') === propType) &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || (p.location || '').toLowerCase().includes(search.toLowerCase()))
  );

  const toggleFav = (id) => setFavs(f => f.includes(id) ? f.filter(i => i !== id) : [...f, id]);

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <CategorySlider slides={cat?.slides || []} ctaLabel="Find Property" onCta={() => {}} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Search + Filters */}
        <div className="card p-4 mb-8 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={14}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input pl-10 text-sm" placeholder="Location, area or property name…" />
          </div>
          <select value={type} onChange={e => setType(e.target.value)} className="input text-sm sm:w-36">
            <option value="All">All Types</option>
            <option value="Rent">For Rent</option>
            <option value="Sale">For Sale</option>
          </select>
          <select value={propType} onChange={e => setPropType(e.target.value)} className="input text-sm sm:w-40">
            <option value="All">All Properties</option>
            <option>House</option>
            <option>Apartment</option>
            <option>Commercial</option>
            <option>Land</option>
          </select>
        </div>

        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-muted">{filtered.length} propert{filtered.length !== 1 ? 'ies' : 'y'} found</p>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center text-brand-400">
             <Loader2 size={32} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted">
            <Search size={36} className="mx-auto mb-3 opacity-20"/>
            <p>No properties match your search.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(prop => (
              <div key={prop.id}
                className="card overflow-hidden hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                onClick={() => handleDetail(prop)}>
                <div className="relative h-52">
                  <img src={prop.img} alt={prop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {prop.badge && (
                    <div className={`absolute top-3 left-3 badge text-[var(--text)] text-xs ${BADGE_COLORS[prop.badge] || 'bg-gray-500'}`}>{prop.badge}</div>
                  )}
                  <div className={`absolute top-3 right-10 badge text-[var(--text)] text-xs ${prop.type === 'Rent' ? 'bg-blue-500' : 'bg-violet-500'}`}>{prop.type}</div>
                  <button onClick={e => { e.stopPropagation(); toggleFav(prop.id); }}
                    className="absolute top-2.5 right-2.5 w-8 h-8 glass rounded-full flex items-center justify-center">
                    <Heart size={13} className={favs.includes(prop.id) ? 'fill-red-500 text-red-500' : 'text-[var(--text-muted)]'} />
                  </button>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-[var(--text)] mb-1">{prop.name}</h3>
                  <div className="flex items-center gap-1 mb-3">
                    <MapPin size={12} className="text-muted shrink-0"/>
                    <span className="text-sm text-muted">{prop.location}</span>
                  </div>
                  <div className="flex items-center gap-4 mb-4 text-xs text-muted">
                    {prop.beds > 0 && <div className="flex items-center gap-1"><Bed size={12}/>{prop.beds} Beds</div>}
                    {prop.baths > 0 && <div className="flex items-center gap-1"><Bath size={12}/>{prop.baths} Baths</div>}
                    {prop.sqft > 0 && <div className="flex items-center gap-1"><Maximize size={12}/>{(prop.sqft||0).toLocaleString()} sqft</div>}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-[var(--text)]">{currency(prop)}</span>
                      <span className="text-sm text-muted">{prop.unit || (prop.type === 'Rent' ? '/mo' : '')}</span>
                    </div>
                    {/* ── FIXED: real call & chat actions ── */}
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleCall(prop)}
                        className="w-9 h-9 glass rounded-xl flex items-center justify-center text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        title="Call agent">
                        <Phone size={14}/>
                      </button>
                      <button onClick={() => handleChat(prop)}
                        className="w-9 h-9 bg-violet-500/20 rounded-xl flex items-center justify-center text-violet-300 hover:bg-violet-500/30 transition-all"
                        title="Chat with agent">
                        <MessageCircle size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
