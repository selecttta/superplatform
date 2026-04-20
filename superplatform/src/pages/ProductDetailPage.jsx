import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Star, Heart, ShoppingCart, MessageCircle,
    Share2, UserPlus, UserCheck, ShieldCheck, Package, Send, Loader2,
    MapPin, Phone, Clock, Tag, Lock
} from 'lucide-react';
import PaymentModal from '../components/common/PaymentModal';
import { useCartStore } from '../store/cartStore';
import { useFavStore } from '../store/favStore';
import { useAuthStore } from '../store/authStore';
import { useReviews } from '../hooks/useReviews';
import { useEscrow } from '../hooks/useEscrow';
import { supabase } from '../lib/supabase';
import { fmt, disc } from '../utils/helpers';
import toast from 'react-hot-toast';

// ─── Stars ───────────────────────────────────────────────────────────────────
function Stars({ rating, size = 12 }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={size} className={i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--text)]/15'} />
            ))}
        </div>
    );
}

// ─── Spec table ──────────────────────────────────────────────────────────────
const SPECS = (p) => [
    { label: 'Brand', value: (p.name || p.title || '').split(' ')[0] },
    { label: 'Category', value: p.cat || p.category || p.category_id || 'General' },
    { label: 'Condition', value: p.condition === 'used' ? 'Used' : p.condition === 'refurbished' ? 'Refurbished' : 'Brand New' },
    { label: 'Warranty', value: p.condition === 'used' || p.condition === 'refurbished' ? 'Sold as-is (no warranty)' : '12 months' },
    { label: 'Delivery', value: 'Free - 2-4 business days' },
    { label: 'Returns', value: p.condition === 'used' ? '48-hour dispute window' : '7-day return policy' },
    { label: 'In Stock', value: 'Yes' },
    { label: 'Sold By', value: p.sellerName || p.seller || 'SuperPlatform Shop' },
];

const SELLER = (p) => ({
    name: p.sellerName || 'SuperPlatform Shop',
    verified: true,
    memberSince: '2023',
    totalSales: 1842,
    responseRate: 98,
    rating: 4.9,
});

// ─── Review Form ─────────────────────────────────────────────────────────────
function ReviewForm({ targetId, targetType }) {
    const { user } = useAuthStore();
    const { addReview, loading } = useReviews(targetId, targetType);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    if (!user) return (
        <p className="text-center text-[var(--text)]/30 text-sm py-6">
            <a href="/login" className="text-brand-400 hover:underline">Sign in</a> to leave a review
        </p>
    );
    if (submitted) return (
        <div className="card p-4 text-center text-emerald-400 text-sm">Thanks for your review!</div>
    );

    const submit = async () => {
        if (!rating) { toast.error('Please select a rating'); return; }
        const ok = await addReview({ rating, comment: comment.trim() });
        if (ok) setSubmitted(true);
    };

    return (
        <div className="card p-5 space-y-4">
            <h4 className="font-semibold text-[var(--text)] text-sm">Write a Review</h4>
            <div>
                <p className="text-xs text-[var(--text)]/40 mb-2">Your rating</p>
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setRating(n)} className="focus:outline-none">
                            <Star size={20} className={n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--text)]/20 hover:text-yellow-400/50'} />
                        </button>
                    ))}
                    <span className="text-xs text-[var(--text)]/40 self-center ml-2">
                        {rating > 0 ? rating + ' star' + (rating > 1 ? 's' : '') : 'Select rating'}
                    </span>
                </div>
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
                className="input min-h-[80px] resize-y text-sm"
                placeholder="Share your experience with this product..." maxLength={500} />
            <button onClick={submit} disabled={loading}
                className="btn-primary btn-sm gap-2 w-full">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Submit Review
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { addItem } = useCartStore();
    const { toggle, isFav } = useFavStore();

    const [product, setProduct] = useState(location.state?.product || null);
    const [related, setRelated] = useState([]);
    const [loadingInfo, setLoadingInfo] = useState(!location.state?.product);

    useEffect(() => {
        if (!product && id) {
            (async () => {
                const { data } = await supabase.from('products').select('*').eq('id', id).single();
                if (data) {
                    setProduct({
                        ...data,
                        name: data.title,
                        img: data.images?.[0] || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80',
                        original: data.compare_at_price,
                        cat: data.category_id || 'Product',
                    });
                }
                setLoadingInfo(false);
            })();
        }
    }, [id, product]);

    useEffect(() => {
        const isUsed = !!(product?.isUsed || product?.condition === 'used' || product?.condition === 'refurbished' || (product && !product.is_new));
        if (product && !isUsed) {
            (async () => {
                const { data } = await supabase.from('products')
                    .select('*')
                    .eq('category_id', product.cat || product.category_id)
                    .neq('id', product.id)
                    .limit(6);
                if (data) {
                    setRelated(data.map(p => ({
                        ...p,
                        name: p.title,
                        img: p.images?.[0] || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80',
                        price: p.price,
                        cat: p.category_id,
                        rating: p.rating || 0
                    })));
                }
            })();
        }
    }, [product]);

    const isUsed = !!(product?.isUsed || product?.condition === 'used' || product?.condition === 'refurbished' || (product && !product.is_new && product.condition !== 'new'));
    const displayName = product?.name || product?.title || 'Item';
    const displayImg = product?.img || product?.images?.[0];
    const displayOriginal = product?.original || product?.original_price || product?.compare_at_price;

    const [imgIdx, setImgIdx] = useState(0);
    const [tab, setTab] = useState('overview');
    const [following, setFollowing] = useState(false);
    const [payOpen, setPayOpen] = useState(false);
    const [payDone, setPayDone] = useState(false);

    const { createEscrowOrder, loading: escrowLoading, calculateBreakdown } = useEscrow();
    const escrowBreakdown = isUsed ? calculateBreakdown(product?.price || 0) : null;

    const { reviews, loading: revLoading } = useReviews(product?.id, 'product');

    // Scroll to top on mount
    useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

    if (loadingInfo) {
        return <div className="min-h-screen bg-[var(--bg)] pt-20 flex items-center justify-center text-brand-400"><Loader2 className="animate-spin" size={48} /></div>;
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-[var(--bg)] pt-20 flex items-center justify-center">
                <div className="text-center">
                    <Package size={48} className="mx-auto mb-4 text-[var(--text)]/20" />
                    <h2 className="heading-md mb-2">Product not found</h2>
                    <button onClick={() => navigate('/ecommerce')} className="btn-primary mt-4">Back to Shop</button>
                </div>
            </div>
        );
    }

    const fav = isFav(product.id, 'product');
    const savings = disc(product.price, displayOriginal);
    const seller = SELLER({ ...product, sellerName: product.seller || product.sellerName });
    const images = product.images?.length ? product.images : [displayImg];
    const specs = SPECS(product);

    const handleCart = () => {
        if (addItem) { addItem({ ...product, name: displayName, img: displayImg }); toast.success('Added to cart!'); }
    };

    const handleBuyNow = () => {
        if (isUsed) {
            setPayOpen(true);
        } else {
            handleCart();
            toast.success('Added to cart! Proceed to checkout.');
        }
    };

    const handlePaymentSuccess = async (paymentResult) => {
        if (isUsed) {
            const ref = paymentResult?.reference || ('manual-' + Date.now());
            await createEscrowOrder({
                productId: product.id,
                amount: product.price,
                paymentRef: ref,
            });
        }
        setPayOpen(false);
        setPayDone(true);
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] pt-16">
            {/* Back */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 mb-2">
                <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm gap-2 text-[var(--text-muted)]">
                    <ChevronLeft size={16} /> Back
                </button>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
                <div className="grid lg:grid-cols-5 gap-8">

                    {/* LEFT (3 cols) */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* Image gallery */}
                        <div>
                            <div className="relative rounded-2xl overflow-hidden bg-[var(--bg-card)] mb-3 h-72 md:h-96">
                                {product.badge && (
                                    <div className={'absolute top-3 left-3 z-10 badge text-xs ' + (product.badge === 'HOT' ? 'bg-red-500 text-[var(--text)]' : product.badge === 'SALE' ? 'bg-brand-500 text-[var(--text)]' : product.badge === 'NEW' ? 'bg-emerald-500 text-[var(--text)]' : 'bg-violet-500 text-[var(--text)]')}>
                                        {product.badge}
                                    </div>
                                )}
                                <button onClick={() => toggle(product.id, 'product', product)}
                                    className="absolute top-3 right-3 z-10 w-9 h-9 glass rounded-full flex items-center justify-center hover:bg-white/15 transition-all">
                                    <Heart size={15} className={fav ? 'fill-red-500 text-red-500' : 'text-[var(--text-muted)]'} />
                                </button>
                                <img src={images[imgIdx]} alt={displayName} className="w-full h-full object-cover" />
                                {images.length > 1 && (
                                    <>
                                        <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 glass rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 glass rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
                                            <ChevronRight size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                            {images.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                                    {images.map((img, i) => (
                                        <button key={i} onClick={() => setImgIdx(i)}
                                            className={'w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ' + (i === imgIdx ? 'border-brand-500' : 'border-transparent opacity-50 hover:opacity-100')}>
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product title */}
                        <div>
                            <p className="text-xs text-brand-400 font-semibold uppercase tracking-widest mb-1">{product.cat || product.category || product.category_id}</p>
                            <h1 className="font-display font-black text-2xl md:text-3xl text-[var(--text)] leading-tight mb-3">{displayName}</h1>
                            <div className="flex items-center gap-3 flex-wrap">
                                <Stars rating={product.rating || 0} />
                                <span className="text-yellow-400 font-semibold text-sm">{product.rating || 0}</span>
                                <span className="text-[var(--text)]/35 text-sm">({product.reviews || product.total_reviews || 0} reviews)</span>
                                {savings > 0 && <span className="badge bg-emerald-500/20 text-emerald-400 text-xs font-bold">-{savings}% OFF</span>}
                                {isUsed && (
                                    <span className={'badge text-xs border ' + (product.condition === 'refurbished' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-orange-500/20 text-orange-300 border-orange-500/30')}>
                                        {product.condition === 'refurbished' ? 'Refurbished' : 'Used Item'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Seller card */}
                        {isUsed ? (
                            <div className="card p-4 border-orange-500/20">
                                <p className="text-xs text-[var(--text)]/40 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Tag size={11} /> Individual Seller</p>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center font-bold text-orange-400 text-lg shrink-0">
                                        {(product.seller || 'S')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-[var(--text)]">{product.seller || 'Individual Seller'}</p>
                                        {product.location && (
                                            <p className="text-xs text-[var(--text)]/40 flex items-center gap-1 mt-0.5"><MapPin size={10} /> {product.location}</p>
                                        )}
                                        {product.created_at && (
                                            <p className="text-xs text-[var(--text)]/30 flex items-center gap-1 mt-0.5"><Clock size={10} /> Listed {new Date(product.created_at).toLocaleDateString()}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => navigate('/chat')}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-white/20 transition-all">
                                        <MessageCircle size={14} /> Chat Seller
                                    </button>
                                    {product.seller_phone && (
                                        <a href={'tel:' + product.seller_phone}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm text-emerald-400 hover:bg-emerald-500/20 transition-all">
                                            <Phone size={14} /> Call Seller
                                        </a>
                                    )}
                                </div>
                                <div className="mt-3 text-xs text-[var(--text)]/30 bg-orange-500/5 border border-orange-500/15 rounded-xl p-2.5">
                                    Pay through SuperPlatform for buyer protection. Do not pay outside the platform.
                                </div>
                            </div>
                        ) : (
                            <div className="card p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-11 h-11 rounded-xl bg-brand-500/20 flex items-center justify-center font-bold text-brand-400 text-lg shrink-0">
                                        {seller.name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-semibold text-[var(--text)]">{seller.name}</p>
                                            {seller.verified && <ShieldCheck size={13} className="text-emerald-400" />}
                                        </div>
                                        <p className="text-xs text-[var(--text)]/40">Member since {seller.memberSince}</p>
                                    </div>
                                    <button onClick={() => { setFollowing(f => !f); toast.success(following ? 'Unfollowed' : 'Now following!'); }}
                                        className={'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ' + (following ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'bg-white/8 text-[var(--text-muted)] hover:bg-white/12')}>
                                        {following ? <UserCheck size={12} /> : <UserPlus size={12} />}
                                        {following ? 'Following' : 'Follow'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'Sales', val: seller.totalSales.toLocaleString(), color: 'text-[var(--text)]' },
                                        { label: 'Response', val: seller.responseRate + '%', color: 'text-emerald-400' },
                                        { label: 'Rating', val: seller.rating + '/5', color: 'text-yellow-400' },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-[var(--bg-card)]/80 rounded-xl p-2.5 text-center">
                                            <p className={'text-xs font-bold ' + s.color}>{s.val}</p>
                                            <p className="text-[10px] text-[var(--text)]/35 mt-0.5">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {['overview', 'specifications', 'reviews', 'related'].map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ' + (tab === t ? 'bg-brand-500 text-[var(--text)]' : 'glass text-[var(--text)]/55 hover:text-[var(--text)]')}>
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* Overview */}
                        {tab === 'overview' && (
                            <div className="space-y-4" style={{ animation: 'fadeUp .3s ease' }}>
                                <div className="card p-5">
                                    <h3 className="font-semibold text-[var(--text)] mb-3">Product Overview</h3>
                                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                                        <strong className="text-[var(--text)]">{displayName}</strong> is a {isUsed ? (product.condition || 'used') : 'brand new'} {(product.cat || product.category || 'product').toLowerCase()} item
                                        available on SuperPlatform. {isUsed ? 'Listed by an individual seller and verified by our admin team.' : 'Verified by our quality team and backed by our buyer protection guarantee. Ships from Accra, Ghana.'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        {specs.slice(0, 4).map((s, i) => (
                                            <div key={i} className="bg-[var(--bg-card)]/50 rounded-xl p-3">
                                                <p className="text-[10px] text-[var(--text)]/35 uppercase tracking-wide mb-0.5">{s.label}</p>
                                                <p className="text-xs font-semibold text-[var(--text)]">{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Specifications */}
                        {tab === 'specifications' && (
                            <div className="card overflow-hidden" style={{ animation: 'fadeUp .3s ease' }}>
                                <div className="px-5 py-3 border-b border-[var(--border)]">
                                    <h3 className="font-semibold text-[var(--text)]">Specifications</h3>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {specs.map((s, i) => (
                                        <div key={i} className="flex items-center gap-4 px-5 py-3">
                                            <span className="text-xs text-[var(--text)]/40 w-28 shrink-0">{s.label}</span>
                                            <span className="text-xs font-medium text-[var(--text)]">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reviews */}
                        {tab === 'reviews' && (
                            <div className="space-y-4" style={{ animation: 'fadeUp .3s ease' }}>
                                <div className="card p-5 flex items-center gap-5">
                                    <div className="text-center shrink-0">
                                        <p className="font-display text-4xl font-black text-[var(--text)]">{product.rating || 0}</p>
                                        <Stars rating={product.rating || 0} size={14} />
                                        <p className="text-xs text-[var(--text)]/35 mt-1">{product.reviews || product.total_reviews || 0} reviews</p>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        {[5, 4, 3, 2, 1].map(n => (
                                            <div key={n} className="flex items-center gap-2">
                                                <span className="text-xs text-[var(--text)]/40 w-2">{n}</span>
                                                <div className="flex-1 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                                                    <div className="h-full bg-yellow-400 rounded-full"
                                                        style={{ width: n >= 4 ? (n * 16 + '%') : (n * 6 + '%') }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {revLoading ? (
                                    <div className="text-center py-8 text-[var(--text)]/30 text-sm">Loading reviews...</div>
                                ) : reviews.length === 0 ? (
                                    <div className="text-center py-8 text-[var(--text)]/30 text-sm">No reviews yet. Be the first!</div>
                                ) : (
                                    reviews.map((r, i) => (
                                        <div key={i} className="card p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                                                    {(r.reviewer || r.profiles?.full_name || 'A')[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-[var(--text)]">{r.profiles?.full_name || r.reviewer || 'Anonymous'}</p>
                                                        {r.verified && <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-md">Verified</span>}
                                                    </div>
                                                    <Stars rating={r.rating} size={10} />
                                                </div>
                                                <span className="text-xs text-[var(--text)]/25 shrink-0">{r.date || (r.created_at || '').slice(0, 10)}</span>
                                            </div>
                                            <p className="text-sm text-[var(--text-muted)] leading-relaxed">{r.comment}</p>
                                        </div>
                                    ))
                                )}

                                <ReviewForm targetId={product.id} targetType="product" />
                            </div>
                        )}

                        {/* Related */}
                        {tab === 'related' && (
                            <div style={{ animation: 'fadeUp .3s ease' }}>
                                <p className="text-sm text-[var(--text)]/40 mb-4">Products in <strong className="text-[var(--text)]">{product.cat || product.category || product.category_id}</strong></p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {related.map(p => (
                                        <div key={p.id} className="card overflow-hidden cursor-pointer group hover:-translate-y-0.5 transition-all duration-300"
                                            onClick={() => { window.scrollTo(0,0); navigate('/product/' + p.id, { state: { product: p } });}}>
                                            <div className="aspect-square bg-[var(--bg-card)] overflow-hidden">
                                                <img src={p.img || p.images?.[0]} alt={p.name || p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            </div>
                                            <div className="p-3">
                                                <p className="text-xs font-medium text-[var(--text)] line-clamp-2 mb-1">{p.name || p.title}</p>
                                                <Stars rating={p.rating || 0} size={10} />
                                                <p className="font-bold text-brand-400 text-sm mt-1">{fmt(p.price)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT (2 cols) - sticky panel */}
                    <div className="lg:col-span-2">
                        <div className="card p-6 lg:sticky lg:top-24 space-y-5">
                            {/* Price */}
                            <div>
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className={'font-display text-3xl font-black ' + (isUsed ? 'text-orange-400' : 'text-[var(--text)]')}>{fmt(product.price)}</span>
                                    {displayOriginal > product.price && <span className="text-[var(--text)]/30 line-through">{fmt(displayOriginal)}</span>}
                                </div>
                                {savings > 0 && <p className="text-emerald-400 text-sm font-semibold">You save {fmt(displayOriginal - product.price)} ({savings}%)</p>}
                                <p className="text-xs text-[var(--text)]/40 mt-1">
                                    {isUsed ? (product.condition === 'refurbished' ? 'Refurbished - Individual Seller' : 'Used Item - Individual Seller') : 'In Stock - Free Delivery'}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3">
                                {isUsed ? (
                                    <>
                                        {payDone ? (
                                            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 text-center">
                                                <p className="text-emerald-400 font-bold mb-1">Purchase Secured!</p>
                                                <p className="text-xs text-[var(--text-muted)]">Payment held in escrow. Seller will ship your item. Confirm receipt to release payment.</p>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleBuyNow}
                                                disabled={escrowLoading}
                                                className="btn btn-primary w-full btn-lg gap-2 bg-orange-500 hover:bg-orange-400 border-orange-500"
                                            >
                                                <Lock size={15} /> Buy Now - Secure Escrow
                                            </button>
                                        )}
                                        {escrowBreakdown && !payDone && (
                                            <div className="glass rounded-xl p-3 text-xs space-y-1">
                                                <p className="text-[var(--text)]/40 font-medium">Escrow Breakdown</p>
                                                <div className="flex justify-between text-[var(--text)]/30">
                                                    <span>You pay</span><span className="text-[var(--text)]">{fmt(escrowBreakdown.price)}</span>
                                                </div>
                                                <div className="flex justify-between text-[var(--text)]/30">
                                                    <span>Seller receives</span>
                                                    <span className="text-emerald-400">{fmt(escrowBreakdown.sellerAmount)}</span>
                                                </div>
                                                <p className="text-[var(--text)]/20 mt-1">Funds held until you confirm delivery</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <button onClick={handleCart} className="btn btn-primary w-full btn-lg gap-2">
                                        <ShoppingCart size={16} /> Add to Cart
                                    </button>
                                )}
                                <button onClick={() => toggle(product.id, 'product', product)}
                                    className={'w-full py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ' + (fav ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text)]')}>
                                    <Heart size={15} className={fav ? 'fill-red-500' : ''} />
                                    {fav ? 'Saved to Wishlist' : 'Save to Wishlist'}
                                </button>
                                <button onClick={() => navigate('/chat')} className="w-full py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:border-white/20 transition-all flex items-center justify-center gap-2">
                                    <MessageCircle size={15} /> Chat with Seller
                                </button>
                                <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!'); }} className="w-full py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:border-white/20 transition-all flex items-center justify-center gap-2">
                                    <Share2 size={15} /> Share
                                </button>
                            </div>

                            <div className="divider" />

                            {/* Trust */}
                            <div className="space-y-3">
                                {[
                                    { icon: 'LOCK', text: 'Pay securely - Paystack & escrow protected' },
                                    { icon: 'CHECK', text: 'Verified seller - admin approved listing' },
                                    { icon: 'STAR', text: (product.rating || 0) + ' rating from customers' },
                                    { icon: 'RTN', text: isUsed ? '48-hour dispute window' : '7-day free returns' },
                                    { icon: 'SHIP', text: 'Free delivery to all Accra locations' },
                                ].map((t, i) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                        <div className="w-4 h-4 shrink-0 text-brand-400 flex items-center justify-center">
                                            <ShieldCheck size={14} />
                                        </div>
                                        <p className="text-xs text-[var(--text)]/45 leading-relaxed">{t.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Payment Modal for used items (escrow) */}
            {payOpen && isUsed && (
                <PaymentModal
                    amount={product.price}
                    title={'Buy: ' + displayName + ' (Secure Escrow)'}
                    onSuccess={handlePaymentSuccess}
                    onClose={() => setPayOpen(false)}
                />
            )}
        </div>
    );
}
