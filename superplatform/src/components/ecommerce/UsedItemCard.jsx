import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star, MapPin, MessageCircle, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useFavStore } from '../../store/favStore';
import { fmt, disc } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CONDITION_COLORS = {
    used: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    refurbished: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    new: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const CONDITION_LABELS = {
    used: 'USED',
    refurbished: 'REFURB',
    new: 'NEW',
};

export default function UsedItemCard({ item: p }) {
    const navigate = useNavigate();
    const cart = useCartStore();
    const { toggle, isFav } = useFavStore();
    const fav = isFav(p.id, 'product');
    const savings = p.original_price ? disc(p.price, p.original_price) : 0;

    const handleCart = (e) => {
        e.stopPropagation();
        cart.add({ id: p.id, name: p.title, price: p.price, image: p.images?.[0] });
        toast.success('Added to cart! 🛒');
    };

    const handleFav = (e) => {
        e.stopPropagation();
        toggle(p.id, 'product', { ...p, name: p.title, img: p.images?.[0] });
    };

    const handleChat = (e) => {
        e.stopPropagation();
        navigate('/chat');
    };

    const openDetail = () => navigate(`/product/${p.id}`, { state: { product: { ...p, name: p.title, img: p.images?.[0], isUsed: true } } });

    return (
        <div
            className="card group relative cursor-pointer hover:border-orange-500/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 transition-all duration-300"
            onClick={openDetail}
        >
            {/* Condition badge */}
            <div className={`absolute top-2 left-2 z-10 badge text-[9px] font-bold border ${CONDITION_COLORS[p.condition] || CONDITION_COLORS.used}`}>
                {CONDITION_LABELS[p.condition] || 'USED'}
            </div>

            {/* Discount badge */}
            {savings > 0 && (
                <div className="absolute top-2 right-10 z-10 badge bg-red-500 text-[var(--text)] text-[9px]">
                    -{savings}%
                </div>
            )}

            {/* Fav */}
            <button onClick={handleFav}
                className="absolute top-2 right-2 z-10 w-7 h-7 glass rounded-full flex items-center justify-center transition-all hover:bg-white/15">
                <Heart size={12} className={fav ? 'fill-red-500 text-red-500' : 'text-[var(--text-muted)]'} />
            </button>

            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-[var(--bg-card)]">
                <img
                    src={p.images?.[0]}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-300 flex items-end gap-2 p-2 opacity-0 group-hover:opacity-100">
                    <button onClick={handleCart}
                        className="flex-1 flex items-center justify-center gap-1 bg-brand-500 rounded-lg py-2 text-[var(--text)] text-xs font-bold hover:bg-brand-600 transition-colors">
                        <ShoppingBag size={12} /> Buy
                    </button>
                    <button onClick={handleChat}
                        className="w-9 h-9 glass rounded-lg flex items-center justify-center text-[var(--text)] hover:bg-white/25 transition-colors">
                        <MessageCircle size={13} />
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="p-3">
                {/* Seller */}
                <p className="text-[10px] text-orange-400/80 font-medium mb-0.5 flex items-center gap-1">
                    👤 {p.seller || 'Individual Seller'}
                </p>
                <h3 className="text-sm font-semibold text-[var(--text)] line-clamp-2 leading-tight mb-1.5">{p.title}</h3>

                {/* Rating */}
                {p.rating > 0 && (
                    <div className="flex items-center gap-1 mb-1.5">
                        <Star size={9} className="fill-yellow-400 text-yellow-400" />
                        <span className="text-[10px] text-[var(--text-muted)]">{p.rating}</span>
                        <span className="text-[10px] text-[var(--text)]/25">({p.total_reviews || 0})</span>
                    </div>
                )}

                {/* Location */}
                {p.location && (
                    <p className="text-[10px] text-[var(--text)]/30 flex items-center gap-0.5 mb-2">
                        <MapPin size={9} /> {p.location}
                    </p>
                )}

                {/* Price */}
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-sm font-bold text-orange-400">{fmt(p.price)}</span>
                        {p.original_price && (
                            <span className="text-[10px] text-[var(--text)]/25 line-through ml-1.5">{fmt(p.original_price)}</span>
                        )}
                    </div>
                    {savings > 0 && <span className="text-[10px] font-semibold text-emerald-400">-{savings}%</span>}
                </div>
            </div>
        </div>
    );
}
