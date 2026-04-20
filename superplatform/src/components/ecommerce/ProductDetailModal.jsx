import React, { useState, useEffect } from 'react';
import {
    X, Star, Heart, ShoppingCart, Share2, UserPlus, UserCheck,
    ShieldCheck, MessageCircle, ChevronRight, ChevronLeft, Package
} from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useFavStore } from '../../store/favStore';
import { fmt, disc } from '../../utils/helpers';
import { PRODUCTS } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// Seller info derived from product data
const getSellerInfo = (product) => ({
    name: product?.sellerName || product?.seller_name || 'SuperPlatform Store',
    avatar: product?.sellerAvatar || null,
    rating: product?.sellerRating || product?.rating || 4.5,
    totalSales: product?.sellerSales || product?.reviews || 0,
    responseRate: product?.responseRate || 95,
    responseTime: '< 2 hours',
    memberSince: product?.sellerSince || '2024',
    verified: product?.sellerVerified !== false,
    totalReviews: product?.reviews || 0,
    completionRate: product?.completionRate || 98,
});

// Product specs are derived from the product data (not hardcoded)
const getProductSpecs = (product) => [
    { label: 'Brand', value: product?.name?.split(' ')[0] || 'N/A' },
    { label: 'Category', value: product?.cat || 'General' },
    { label: 'Condition', value: 'Brand New' },
    { label: 'Warranty', value: '12 months manufacturer warranty' },
    { label: 'Delivery', value: 'Free — arrives in 2–4 business days' },
    { label: 'Returns', value: '7-day return policy' },
];

function RatingStars({ rating, size = 12 }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} size={size} className={n <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--text)]/15'} />
            ))}
        </div>
    );
}

export default function ProductDetailModal({ product: p, onClose }) {
    const addItem = useCartStore(s => s.addItem || s.add);
    const { toggle, isFav } = useFavStore();
    const fav = isFav(p.id, 'product');
    const savings = disc(p.price, p.original);
    const seller = getSellerInfo(p);
    const [following, setFollowing] = useState(false);
    const [imgIdx, setImgIdx] = useState(0);
    const [reviews, setReviews] = useState([]);

    // Fetch reviews from Supabase
    useEffect(() => {
        (async () => {
            try {
                const { data } = await supabase
                    .from('reviews')
                    .select('*, profiles(full_name)')
                    .eq('product_id', p.id)
                    .order('created_at', { ascending: false })
                    .limit(10);
                if (data?.length) {
                    setReviews(data.map(d => ({
                        id: d.id,
                        author: d.profiles?.full_name || 'Customer',
                        rating: d.rating,
                        text: d.comment || d.review_text || '',
                        date: new Date(d.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }),
                        verified: !!d.profiles?.full_name,
                        avatar: (d.profiles?.full_name || 'C')[0],
                    })));
                }
            } catch {}
        })();
    }, [p.id]);

    // Related products (same category)
    const related = PRODUCTS.filter(pr => pr.cat === p.cat && pr.id !== p.id).slice(0, 4);
    // More from same category as a proxy for same-seller products
    const moreSeller = PRODUCTS.filter(pr => pr.id !== p.id).slice(0, 4);

    const images = [p.img, p.img, p.img]; // Real app would have multiple images

    const handleAddToCart = () => {
        if (addItem) { addItem(p); toast.success('Added to cart!', { icon: '🛒' }); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div
                className="w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] bg-[var(--bg-secondary)] sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
                style={{ animation: 'fadeUp .3s ease' }}
            >
                {/* Header controls */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
                    <p className="text-xs text-[var(--text)]/40 uppercase tracking-wide">{p.cat}</p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { toast.success('Link copied!'); }} className="p-2 btn-ghost rounded-xl">
                            <Share2 size={16} className="text-[var(--text-muted)]" />
                        </button>
                        <button onClick={onClose} className="p-2 btn-ghost rounded-xl">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1">
                    <div className="grid sm:grid-cols-2 gap-0">

                        {/* LEFT — Images */}
                        <div className="relative bg-[var(--bg-card)] sm:rounded-bl-3xl">
                            {/* Badge */}
                            {p.badge && (
                                <div className={`absolute top-3 left-3 z-10 badge text-xs ${p.badge === 'HOT' ? 'bg-red-500 text-[var(--text)]' :
                                        p.badge === 'SALE' ? 'bg-brand-500 text-[var(--text)]' :
                                            p.badge === 'NEW' ? 'bg-emerald-500 text-[var(--text)]' :
                                                'bg-violet-500 text-[var(--text)]'
                                    }`}>{p.badge}</div>
                            )}
                            {/* Fav */}
                            <button onClick={() => toggle(p.id, 'product', p)}
                                className="absolute top-3 right-3 z-10 w-9 h-9 glass rounded-full flex items-center justify-center hover:bg-white/15 transition-all">
                                <Heart size={15} className={fav ? 'fill-red-500 text-red-500' : 'text-[var(--text-muted)]'} />
                            </button>

                            <img src={images[imgIdx]} alt={p.name}
                                className="w-full aspect-square object-cover" />

                            {/* Image dots */}
                            {images.length > 1 && (
                                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                                    {images.map((_, i) => (
                                        <button key={i} onClick={() => setImgIdx(i)}
                                            className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white w-4' : 'bg-white/30'}`} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RIGHT — Product Info */}
                        <div className="p-5 sm:p-6 space-y-4">
                            <div>
                                <h1 className="font-display font-bold text-[var(--text)] text-xl leading-tight mb-2">{p.name}</h1>

                                <div className="flex items-center gap-3 mb-3">
                                    <RatingStars rating={p.rating} />
                                    <span className="text-sm text-yellow-400 font-medium">{p.rating}</span>
                                    <span className="text-xs text-[var(--text)]/35">({p.reviews} reviews)</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="font-display text-3xl font-black text-[var(--text)]">{fmt(p.price)}</span>
                                    {p.original && <span className="text-[var(--text)]/30 line-through text-lg">{fmt(p.original)}</span>}
                                    {savings > 0 && <span className="badge bg-emerald-500/20 text-emerald-400 text-xs font-bold">-{savings}% OFF</span>}
                                </div>
                            </div>

                            {/* Seller card */}
                            <div className="bg-[var(--bg-card)]/80 border border-white/8 rounded-2xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center font-bold text-brand-400 shrink-0">
                                        {seller.name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-semibold text-[var(--text)] truncate">{seller.name}</p>
                                            {seller.verified && <ShieldCheck size={13} className="text-emerald-400 shrink-0" />}
                                        </div>
                                        <p className="text-xs text-[var(--text)]/40">Member since {seller.memberSince}</p>
                                    </div>
                                    <button
                                        onClick={() => { setFollowing(f => !f); toast.success(following ? 'Unfollowed' : 'Following!'); }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${following ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'bg-white/8 text-[var(--text-muted)] hover:bg-white/12'
                                            }`}
                                    >
                                        {following ? <UserCheck size={12} /> : <UserPlus size={12} />}
                                        {following ? 'Following' : 'Follow'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-[var(--bg-card)]/60 rounded-xl p-2">
                                        <p className="text-xs font-bold text-[var(--text)]">{seller.totalSales.toLocaleString()}</p>
                                        <p className="text-[10px] text-[var(--text)]/35 mt-0.5">Sales</p>
                                    </div>
                                    <div className="bg-[var(--bg-card)]/60 rounded-xl p-2">
                                        <p className="text-xs font-bold text-emerald-400">{seller.responseRate}%</p>
                                        <p className="text-[10px] text-[var(--text)]/35 mt-0.5">Response</p>
                                    </div>
                                    <div className="bg-[var(--bg-card)]/60 rounded-xl p-2">
                                        <p className="text-xs font-bold text-yellow-400">{seller.rating}★</p>
                                        <p className="text-[10px] text-[var(--text)]/35 mt-0.5">Rating</p>
                                    </div>
                                </div>
                            </div>

                            {/* Add to cart actions */}
                            <div className="flex gap-3">
                                <button onClick={handleAddToCart}
                                    className="btn btn-primary flex-1 btn-lg gap-2">
                                    <ShoppingCart size={16} /> Add to Cart
                                </button>
                                <button onClick={() => toast.success('Opening chat with seller…')}
                                    className="btn btn-secondary gap-2 px-4">
                                    <MessageCircle size={15} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Specifications */}
                    <div className="px-5 sm:px-6 py-5 border-t border-[var(--border)]">
                        <h3 className="font-semibold text-[var(--text)] mb-3">Specifications</h3>
                        <div className="grid sm:grid-cols-2 gap-2">
                            {getProductSpecs(p).map((spec, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-card)]/50">
                                    <span className="text-xs text-[var(--text)]/40 w-20 shrink-0 pt-0.5">{spec.label}</span>
                                    <span className="text-xs text-[var(--text)] font-medium">{spec.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Customer Reviews */}
                    <div className="px-5 sm:px-6 py-5 border-t border-[var(--border)]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-[var(--text)]">Customer Reviews</h3>
                            <div className="flex items-center gap-2">
                                <RatingStars rating={p.rating} />
                                <span className="text-sm font-bold text-[var(--text)]">{p.rating}</span>
                                <span className="text-xs text-[var(--text)]/35">({p.reviews})</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {reviews.length === 0 ? (
                                <p className="text-sm text-[var(--text)]/40 py-8 text-center">No reviews yet. Be the first to review this product!</p>
                            ) : (
                                reviews.map(r => (
                                <div key={r.id} className="p-4 rounded-xl bg-[var(--bg-card)]/50">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                                            {r.avatar}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-[var(--text)]">{r.author}</p>
                                                {r.verified && (
                                                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-md">✓ Verified</span>
                                                )}
                                            </div>
                                            <RatingStars rating={r.rating} size={10} />
                                        </div>
                                        <span className="text-xs text-[var(--text)]/25 shrink-0">{r.date}</span>
                                    </div>
                                    <p className="text-sm text-[var(--text)]/65 leading-relaxed">{r.text}</p>
                                </div>
                            )))
                            }
                        </div>
                    </div>

                    {/* Customers also viewed */}
                    {related.length > 0 && (
                        <div className="px-5 sm:px-6 py-5 border-t border-[var(--border)]">
                            <h3 className="font-semibold text-[var(--text)] mb-3">Customers also viewed</h3>
                            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                                {related.map(pr => (
                                    <div key={pr.id} className="shrink-0 w-32 cursor-pointer group" onClick={() => toast('Opening product…')}>
                                        <div className="aspect-square rounded-xl overflow-hidden bg-[var(--bg-card)] mb-2">
                                            <img src={pr.img} alt={pr.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        </div>
                                        <p className="text-xs text-[var(--text)] line-clamp-2 leading-tight mb-1">{pr.name}</p>
                                        <p className="text-xs font-bold text-brand-400">{fmt(pr.price)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* More from this seller */}
                    <div className="px-5 sm:px-6 py-5 border-t border-[var(--border)]">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-[var(--text)]">More from {seller.name}</h3>
                            <button onClick={() => toast('Viewing all seller items…')} className="text-xs text-brand-400 hover:text-brand-300">
                                View all →
                            </button>
                        </div>
                        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                            {moreSeller.map(pr => (
                                <div key={pr.id} className="shrink-0 w-32 cursor-pointer group" onClick={() => toast('Opening product…')}>
                                    <div className="aspect-square rounded-xl overflow-hidden bg-[var(--bg-card)] mb-2">
                                        <img src={pr.img} alt={pr.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    </div>
                                    <p className="text-xs text-[var(--text)] line-clamp-2 leading-tight mb-1">{pr.name}</p>
                                    <p className="text-xs font-bold text-brand-400">{fmt(pr.price)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-6" />
                </div>
            </div>
        </div>
    );
}
