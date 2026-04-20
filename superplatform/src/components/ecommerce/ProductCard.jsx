import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star, ShoppingCart, Eye } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useFavStore } from '../../store/favStore';
import { fmt, disc } from '../../utils/helpers';
import toast from 'react-hot-toast';

const BADGE_COLORS = {
  HOT: 'bg-red-500 text-[var(--text)]',
  SALE: 'bg-brand-500 text-[var(--text)]',
  NEW: 'bg-emerald-500 text-[var(--text)]',
  LOCAL: 'bg-violet-500 text-[var(--text)]',
  LUXURY: 'bg-yellow-500 text-dark-900',
};

export default function ProductCard({ product: p }) {
  const navigate = useNavigate();
  const addItem = useCartStore(s => s.addItem || s.add);
  const { toggle, isFav } = useFavStore();
  const fav = isFav(p.id, 'product');
  const savings = disc(p.price, p.original);

  const openDetail = () => navigate(`/product/${p.id}`, { state: { product: p } });

  const handleCart = (e) => {
    e.stopPropagation();
    if (addItem) { addItem(p); toast.success('Added to cart!', { icon: '🛒' }); }
  };

  const handleFav = (e) => {
    e.stopPropagation();
    toggle(p.id, 'product', p);
  };

  return (
    <div
      className="card group relative cursor-pointer hover:border-white/12 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 transition-all duration-300"
      onClick={openDetail}
    >
      {/* Badge */}
      {p.badge && (
        <div className={`absolute top-2 left-2 z-10 badge text-xs ${BADGE_COLORS[p.badge] || 'bg-gray-600 text-[var(--text)]'}`}>
          {p.badge}
        </div>
      )}

      {/* Fav */}
      <button onClick={handleFav}
        className="absolute top-2 right-2 z-10 w-8 h-8 glass rounded-full flex items-center justify-center transition-all hover:bg-white/15">
        <Heart size={13} className={fav ? 'fill-red-500 text-red-500' : 'text-[var(--text-muted)]'} />
      </button>

      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[var(--bg-card)]">
        <img src={p.img} alt={p.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button onClick={handleCart}
            className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-[var(--text)] shadow-lg hover:bg-brand-600 transition-colors">
            <ShoppingCart size={15} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openDetail(); }}
            className="w-10 h-10 glass rounded-full flex items-center justify-center text-[var(--text)] hover:bg-white/20 transition-colors">
            <Eye size={15} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[11px] font-medium text-brand-500 mb-1">{p.cat}</p>
        <h3 className="text-sm font-semibold text-[var(--text)] line-clamp-2 leading-tight mb-2">{p.name}</h3>
        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} size={10} className={n <= Math.round(p.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--text)]/15'} />
          ))}
          <span className="text-[11px] text-[var(--text)]/35 ml-1">({p.reviews})</span>
        </div>
        {/* Price */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-[var(--text)]">{fmt(p.price)}</span>
            {p.original && <span className="text-xs text-[var(--text)]/25 line-through ml-1.5">{fmt(p.original)}</span>}
          </div>
          {savings > 0 && <span className="text-[11px] font-semibold text-emerald-400">-{savings}%</span>}
        </div>
      </div>
    </div>
  );
}
