import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Search, X, Minus, Plus, ArrowRight, Filter, ChevronDown, Tag, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CategorySlider from '../components/common/CategorySlider';
import ProductCard from '../components/ecommerce/ProductCard';
import UsedItemCard from '../components/ecommerce/UsedItemCard';
import PaymentModal from '../components/common/PaymentModal';
import { CATEGORIES } from '../lib/constants';
import { useCartStore } from '../store/cartStore';
import { supabase } from '../lib/supabase';
import { fmt } from '../utils/helpers';
import toast from 'react-hot-toast';

const cat = CATEGORIES.find(c => c.id === 'ecommerce');
const NEW_CATS = ['All', 'Electronics', 'Fashion', 'Gaming', 'Computers', 'Home'];
const USED_CATS = ['All', 'Phones', 'Laptops', 'TVs', 'Electronics', 'Shoes', 'Furniture', 'Other'];
const CONDITIONS = ['All', 'New', 'Used', 'Refurbished'];
const SORTS = ['Popular', 'Price: Low to High', 'Price: High to Low', 'Newest', 'Top Rated'];

const mapProduct = p => ({
  ...p,
  id: p.id,
  name: p.title,
  price: Number(p.price) || 0,
  original: Number(p.compare_at_price) || 0,
  img: p.images?.[0] || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80',
  cat: p.category_id || 'Product',
  rating: p.rating || 0,
  reviews: p.reviews_count || 0,
  badge: p.is_new ? 'NEW' : null,
});

export default function EcommercePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState('All');
  const [condition, setCondition] = useState('All'); // All / New / Used / Refurbished
  const [sort, setSort] = useState('Popular');
  const [cartOpen, setCartOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('all'); // all | new | used

  const { items, removeItem, updateQty, total, count, clearCart } = useCartStore();

  // Load all products from Supabase
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, profiles!products_seller_id_fkey(full_name, location)')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });
        if (!error && data) {
          setAllProducts(data.map(p => ({
            ...p,
            seller: p.profiles?.full_name || 'Seller',
            location: p.profiles?.location || 'Ghana',
          })));
        }
      } catch (err) { console.error('Failed to load products:', err); }
      setLoading(false);
    })();
  }, []);

  // Split into new and used
  const rawUsed = useMemo(() => allProducts.filter(p => !p.is_new && p.condition !== 'new'), [allProducts]);
  const rawNew = useMemo(() => allProducts.filter(p => p.is_new || p.condition === 'new'), [allProducts]);

  // Filter new products
  const filteredNew = useMemo(() => {
    if (condition === 'Used' || condition === 'Refurbished') return [];
    let list = rawNew.map(mapProduct).filter(p => {
      const matchCat = selCat === 'All' || p.cat === selCat || p.category_id === selCat;
      const matchQ = (p.name || '').toLowerCase().includes(search.toLowerCase());
      return matchCat && matchQ;
    });
    if (sort === 'Price: Low to High') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'Price: High to Low') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'Top Rated') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [search, selCat, sort, condition, rawNew]);

  // Filter used items
  const filteredUsed = useMemo(() => {
    if (condition === 'New') return [];
    let list = rawUsed.filter(p => {
      const matchCat = selCat === 'All' || p.category_id === selCat;
      const matchSearch = (p.title || '').toLowerCase().includes(search.toLowerCase());
      const matchCond = condition === 'All' || p.condition === condition.toLowerCase()
        || (condition === 'Used' && p.condition === 'used')
        || (condition === 'Refurbished' && p.condition === 'refurbished');
      return matchCat && matchSearch && matchCond;
    });
    if (sort === 'Price: Low to High') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'Price: High to Low') list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [search, selCat, sort, condition, rawUsed]);

  const showNew = condition !== 'Used' && condition !== 'Refurbished';
  const showUsed = condition !== 'New';

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      {/* Slider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <CategorySlider slides={cat.slides} ctaLabel="Shop Now" onCta={() => { }} />
      </div>

      {/* Search + Cart + Sell bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0 basis-full sm:basis-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input pl-10" placeholder="Search products, brands, used items…" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text)]/30 hover:text-[var(--text)]"><X size={14} /></button>}
          </div>
          {/* Sell button */}
          <button onClick={() => navigate('/sell')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-500/40 bg-orange-500/10 text-orange-300 text-sm font-medium hover:bg-orange-500/20 transition-all whitespace-nowrap">
            <Tag size={15} /> Sell Item
          </button>
          <button onClick={() => setCartOpen(true)} className="btn-primary relative px-4 py-2.5 gap-2 text-sm">
            <ShoppingBag size={16} />
            <span className="hidden sm:inline">Cart</span>
            {count() > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">{count()}</span>}
          </button>
        </div>

        {/* Condition filter — most important filter */}
        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide pb-1">
          {CONDITIONS.map(c => (
            <button key={c} onClick={() => setCondition(c)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${condition === c
                ? c === 'Used' || c === 'Refurbished'
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                  : 'bg-brand-500 text-[var(--text)] border-brand-500'
                : 'glass text-[var(--text)]/55 hover:text-[var(--text)] border-transparent'
                }`}>
              {c === 'Used' ? 'Used' : c === 'Refurbished' ? 'Refurbished' : c === 'New' ? 'New' : 'All Items'}
            </button>
          ))}
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="ml-auto bg-[var(--bg-card)] text-[var(--text-muted)] text-sm px-3 py-1.5 rounded-full border border-[var(--border)] cursor-pointer">
            {SORTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
          {(showUsed && !showNew ? USED_CATS : NEW_CATS).map(c => (
            <button key={c} onClick={() => setSelCat(c)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${selCat === c ? 'bg-white/15 text-[var(--text)]' : 'glass text-[var(--text)]/40 hover:text-[var(--text-muted)]'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 space-y-12">

        {/* ── Used / Second-Hand Section ── */}
        {showUsed && filteredUsed.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Tag size={15} className="text-orange-400" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-[var(--text)] text-lg">Second-Hand Deals</h2>
                  <p className="text-xs text-[var(--text)]/40">Verified pre-owned items from individual sellers</p>
                </div>
                <span className="badge bg-orange-500/15 text-orange-300 text-[10px]">Admin Verified</span>
              </div>
              <button onClick={() => setCondition('Used')} className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                See all used →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredUsed.map(p => <UsedItemCard key={p.id} item={p} />)}
            </div>
          </div>
        )}

        {/* ── New Products Section ── */}
        {showNew && filteredNew.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-500/20 rounded-xl flex items-center justify-center">
                  <Sparkles size={15} className="text-brand-400" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-[var(--text)] text-lg">New Products</h2>
                  <p className="text-xs text-[var(--text)]/40">Brand new from verified store vendors</p>
                </div>
              </div>
              <p className="text-sm text-muted">{filteredNew.length} products</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredNew.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredNew.length === 0 && filteredUsed.length === 0 && (
          <div className="py-24 text-center text-muted">
            <Search size={36} className="mx-auto mb-3 opacity-20" />
            <p>No products found{search ? ` for "${search}"` : ''}</p>
            <button onClick={() => { setSearch(''); setCondition('All'); setSelCat('All'); }}
              className="btn-ghost text-sm mt-4">Clear filters</button>
          </div>
        )}

        {/* Sell banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-900/40 to-dark-800 border border-orange-500/20 p-8">
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 text-center sm:text-left">
              <span className="badge bg-orange-500/20 text-orange-300 text-xs mb-3 inline-block">Individual Sellers Welcome</span>
              <h3 className="text-xl font-bold text-[var(--text)] mb-2">Have something to sell?</h3>
              <p className="text-[var(--text-muted)] text-sm">List your used phone, laptop, shoes, furniture or anything else. Reach thousands of buyers. Admin-verified listings for buyer safety.</p>
            </div>
            <button onClick={() => navigate('/sell')}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-[var(--text)] font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-orange-500/25 whitespace-nowrap">
              <Tag size={16} /> Sell Your Item
            </button>
          </div>
        </div>
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="w-full max-w-md glass-dark border-l border-[var(--border)] flex flex-col overflow-y-auto" style={{ animation: 'slideIn .3s ease' }}>
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="heading-sm">Shopping Cart {count() > 0 && <span className="badge-orange ml-2">{count()}</span>}</h2>
              <button onClick={() => setCartOpen(false)} className="p-2 btn-ghost rounded-xl"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {items.length === 0 ? (
                <div className="py-20 text-center text-muted">
                  <ShoppingBag size={40} className="mx-auto mb-3 opacity-20" />
                  <p>Your cart is empty</p>
                  <button onClick={() => setCartOpen(false)} className="btn-primary btn-sm mt-4">Start Shopping</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)]">
                      <img src={item.img || item.image} alt={item.name} className="w-14 h-14 object-cover rounded-lg shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text)] line-clamp-1">{item.name}</p>
                        <p className="text-xs text-brand-400 font-bold">{fmt(item.price)}</p>
                        {item.condition && item.condition !== 'new' && (
                          <span className="text-[10px] text-orange-400 capitalize">{item.condition}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 glass rounded-lg flex items-center justify-center text-[var(--text)] hover:bg-[var(--bg-input)]"><Minus size={12} /></button>
                        <span className="w-6 text-center text-sm text-[var(--text)] font-medium">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 glass rounded-lg flex items-center justify-center text-[var(--text)] hover:bg-[var(--bg-input)]"><Plus size={12} /></button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="p-1 text-[var(--text)]/25 hover:text-red-400 transition-colors"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {items.length > 0 && (
              <div className="p-5 border-t border-[var(--border)] space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Subtotal ({count()} items)</span>
                  <span className="text-[var(--text)] font-semibold">{fmt(total())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Delivery</span>
                  <span className="text-emerald-400 font-medium">Free</span>
                </div>
                <div className="divider" />
                <div className="flex justify-between">
                  <span className="font-bold text-[var(--text)]">Total</span>
                  <span className="font-display text-xl font-bold text-[var(--text)]">{fmt(total())}</span>
                </div>
                <button onClick={() => { setCartOpen(false); setPayOpen(true); }} className="btn-primary w-full btn-lg">
                  Checkout — {fmt(total())} <ArrowRight size={16} />
                </button>
                <button onClick={() => { clearCart(); toast('Cart cleared'); }} className="btn-ghost w-full text-sm text-muted">Clear Cart</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment modal */}
      {payOpen && (
        <PaymentModal
          amount={total()}
          title={`${count()} item(s) from SuperPlatform Shop`}
          onSuccess={() => { clearCart(); toast.success('Order placed! 🎉'); }}
          onClose={() => setPayOpen(false)}
        />
      )}
    </div>
  );
}
