import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Dimensions, Linking, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { COLORS, PRODUCTS, requireAuth } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt } from '../../utils/helpers';
import { supabase } from '../../lib/supabase';
import PaymentSheet from '../../components/payment/PaymentSheet';

const { width: W } = Dimensions.get('window');

// ── Stars ────────────────────────────────────────────────────────────────────
function Stars({ rating, size = 12 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Feather
          key={n}
          name="star"
          size={size}
          color={n <= Math.round(rating) ? '#f59e0b' : 'rgba(255,255,255,0.12)'}
        />
      ))}
    </View>
  );
}

// ── Spec row ──────────────────────────────────────────────────────────────────
function SpecRow({ label, value, last, s }) {
  return (
    <View style={[s.specRow, !last && s.specRowBorder]}>
      <Text style={s.specLabel}>{label}</Text>
      <Text style={s.specValue}>{value}</Text>
    </View>
  );
}

// ── Discount % helper ─────────────────────────────────────────────────────────
function disc(price, original) {
  if (!original || original <= price) return 0;
  return Math.round((1 - price / original) * 100);
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params || {};
  const { user } = useAuthStore();
      
  const { colors } = useTheme();
  const s = useStyles(colors);
  
const { addItem } = useCartStore();
  const [imgIdx, setImgIdx] = useState(0);
  const [tab, setTab] = useState('overview');
  const [payment, setPayment] = useState(null);
  const [addedToCart, setAdded] = useState(false);
  const [wishlist, setWishlist] = useState(false);
  const [following, setFollowing] = useState(false);
  const [productReviews, setProductReviews] = useState([]);

  // Fetch reviews from Supabase
  useEffect(() => {
    if (!product?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('reviews')
          .select('*, profiles(full_name)')
          .eq('product_id', product.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (data?.length) {
          setProductReviews(data.map(d => ({
            name: d.profiles?.full_name || 'Customer',
            rating: d.rating,
            date: new Date(d.created_at).toLocaleDateString(),
            comment: d.comment || d.review_text || '',
            verified: !!d.profiles?.full_name,
          })));
        }
      } catch {}
    })();
  }, [product?.id]);

  if (!product) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.center}>
          <Feather name="alert-circle" size={40} color={colors.textMuted} />
          <Text style={s.emptyTitle}>Product not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn2}>
            <Text style={{ color: colors.brand, fontWeight: '700' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = product.images?.length ? product.images : product.img ? [product.img, product.img] : ['https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80'];
  const savings = disc(product.price, product.original);
  const sellerName = product.seller_name || product.providerName || 'SuperPlatform Shop';

  // Related products (same category, different item)
  const related = PRODUCTS.filter(p => p.cat === product.cat && p.id !== product.id).slice(0, 6);

  const specs = [
    { label: 'Brand', value: product.name?.split(' ')[0] || 'N/A' },
    { label: 'Category', value: product.cat || 'General' },
    { label: 'Condition', value: 'Brand New' },
    { label: 'Warranty', value: '12 months' },
    { label: 'Delivery', value: 'Free — 2–4 business days' },
    { label: 'Returns', value: '7-day return policy' },
    { label: 'In Stock', value: '✅ Yes' },
    { label: 'Sold By', value: sellerName },
  ];

  const handleAddToCart = () => {
    addItem({ id: product.id, name: product.name || product.title, price: product.price, img: images[0] });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    requireAuth(user, navigation, () =>
      setPayment({ name: product.name || product.title, price: product.price })
    );
  };

  const handleChat = () => {
    requireAuth(user, navigation, () =>
      navigation.navigate('ChatDetail', {
        providerId: product.seller_id || product.id,
        name: sellerName,
      })
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out ${product.name} on SuperPlatform — ${fmt(product.price)}` });
    } catch { }
  };

  const TABS = ['overview', 'specs', 'reviews', 'related'];

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Image Gallery ── */}
        <View style={s.gallery}>
          <Image source={{ uri: images[imgIdx] }} style={s.mainImg} resizeMode="cover" />

          {/* Back button */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Wishlist + Share */}
          <View style={s.topRight}>
            <TouchableOpacity onPress={() => setWishlist(v => !v)} style={s.topRightBtn}>
              <Feather name="heart" size={16} color={wishlist ? '#ef4444' : '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={s.topRightBtn}>
              <Feather name="share-2" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Badge */}
          {product.badge && (
            <View style={[s.badgeOverlay, {
              backgroundColor: product.badge === 'HOT' ? '#ef4444' :
                product.badge === 'NEW' ? '#10b981' :
                  product.badge === 'SALE' ? colors.brand : '#8b5cf6'
            }]}>
              <Text style={s.badgeOverlayTxt}>{product.badge}</Text>
            </View>
          )}

          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              <TouchableOpacity onPress={() => setImgIdx(i => (i - 1 + images.length) % images.length)} style={s.arrowLeft}>
                <Feather name="chevron-left" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setImgIdx(i => (i + 1) % images.length)} style={s.arrowRight}>
                <Feather name="chevron-right" size={20} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          {/* Dots */}
          {images.length > 1 && (
            <View style={s.dots}>
              {images.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setImgIdx(i)}>
                  <View style={[s.dot, i === imgIdx && s.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.thumbRow}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
            {images.map((img, i) => (
              <TouchableOpacity key={i} onPress={() => setImgIdx(i)}>
                <Image source={{ uri: img }} style={[s.thumb, i === imgIdx && s.thumbActive]} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={s.body}>

          {/* ── Title Block ── */}
          {product.cat && (
            <Text style={s.catLabel}>{product.cat}</Text>
          )}
          <Text style={s.name}>{product.name || product.title}</Text>

          {/* Price + Discount */}
          <View style={s.priceRow}>
            <Text style={s.price}>{fmt(product.price)}</Text>
            {product.original && product.original > product.price && (
              <Text style={s.originalPrice}>{fmt(product.original)}</Text>
            )}
            {savings > 0 && (
              <View style={s.discountPill}>
                <Text style={s.discountTxt}>-{savings}% OFF</Text>
              </View>
            )}
          </View>
          {savings > 0 && (
            <Text style={s.savingsLabel}>You save {fmt(product.original - product.price)}</Text>
          )}

          {/* Rating row */}
          {product.rating > 0 && (
            <View style={s.ratingRow}>
              <Stars rating={product.rating} size={13} />
              <Text style={s.ratingNum}>{product.rating}</Text>
              <Text style={s.reviewCount}>({product.reviews?.toLocaleString() || 0} reviews)</Text>
            </View>
          )}

          {/* In Stock + Delivery */}
          <View style={s.infoChips}>
            <View style={s.chip}>
              <Feather name="check-circle" size={12} color="#10b981" />
              <Text style={[s.chipTxt, { color: '#10b981' }]}>In Stock</Text>
            </View>
            <View style={s.chip}>
              <Feather name="truck" size={12} color={colors.textMuted} />
              <Text style={s.chipTxt}>Free Delivery</Text>
            </View>
            {product.isNew && (
              <View style={[s.chip, { borderColor: '#10b98140' }]}>
                <Text style={[s.chipTxt, { color: '#10b981' }]}>New Arrival</Text>
              </View>
            )}
          </View>

          {/* ── Seller Card ── */}
          <View style={s.sellerCard}>
            <View style={s.sellerLeft}>
              <View style={s.sellerAvatar}>
                <Text style={{ fontSize: 20 }}>🏪</Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={s.sellerName}>{sellerName}</Text>
                  <Feather name="shield" size={12} color="#10b981" />
                </View>
                <Text style={s.sellerSub}>Verified Seller · Member since Jan 2023</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setFollowing(v => !v)}
              style={[s.followBtn, following && { backgroundColor: colors.brand + '20', borderColor: colors.brand + '50' }]}
            >
              <Feather name={following ? 'user-check' : 'user-plus'} size={12} color={following ? colors.brand : colors.textMuted} />
              <Text style={[s.followTxt, following && { color: colors.brand }]}>{following ? 'Following' : 'Follow'}</Text>
            </TouchableOpacity>
          </View>

          {/* Seller stats */}
          <View style={s.sellerStats}>
            {[
              { label: 'Sales', value: '1,240', color: colors.text },
              { label: 'Response', value: '97%', color: '#10b981' },
              { label: 'Rating', value: '4.8★', color: '#f59e0b' },
            ].map((item, i) => (
              <View key={i} style={s.statBox}>
                <Text style={[s.statVal, { color: item.color }]}>{item.value}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Tabs ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {TABS.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[s.tabBtn, tab === t && s.tabBtnActive]}
              >
                <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <View style={s.tabContent}>
              <View style={s.overviewCard}>
                <Text style={s.overviewHeading}>Product Overview</Text>
                <Text style={s.overviewDesc}>
                  The <Text style={{ color: colors.text, fontWeight: '700' }}>{product.name}</Text> is a premium {product.cat?.toLowerCase() || ''} product available exclusively on SuperPlatform. Verified by our quality team and backed by our buyer protection guarantee. Ships from Accra, Ghana.
                </Text>
                {/* 4 quick specs */}
                <View style={s.quickSpecGrid}>
                  {specs.slice(0, 4).map((spec, i) => (
                    <View key={i} style={s.quickSpecBox}>
                      <Text style={s.quickSpecLabel}>{spec.label}</Text>
                      <Text style={s.quickSpecValue}>{spec.value}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Trust badges */}
              <View style={s.trustCard}>
                {[
                  { icon: '🔒', text: 'Pay securely — Paystack protected' },
                  { icon: '✅', text: 'Verified seller · background checked' },
                  { icon: '⭐', text: `${product.rating} rating from ${product.reviews?.toLocaleString()}+ customers` },
                  { icon: '🔄', text: '7-day free returns if not satisfied' },
                  { icon: '🚚', text: 'Free delivery to all Accra locations' },
                ].map((item, i) => (
                  <View key={i} style={s.trustRow}>
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                    <Text style={s.trustTxt}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── SPECS ── */}
          {tab === 'specs' && (
            <View style={s.tabContent}>
              <View style={s.specsCard}>
                <Text style={s.overviewHeading}>Specifications</Text>
                {specs.map((spec, i) => (
                  <SpecRow s={s} key={i} label={spec.label} value={spec.value} last={i === specs.length - 1} />
                ))}
              </View>
            </View>
          )}

          {/* ── REVIEWS ── */}
          {tab === 'reviews' && (
            <View style={s.tabContent}>
              {/* Rating summary */}
              <View style={s.reviewSummary}>
                <View style={s.reviewBigScore}>
                  <Text style={s.bigRating}>{product.rating}</Text>
                  <Stars rating={product.rating} size={14} />
                  <Text style={s.reviewCount}>{product.reviews?.toLocaleString()} reviews</Text>
                </View>
                <View style={s.ratingBars}>
                  {[5, 4, 3, 2, 1].map(n => (
                    <View key={n} style={s.ratingBarRow}>
                      <Text style={s.ratingBarNum}>{n}</Text>
                      <View style={s.ratingBarTrack}>
                        <View style={[s.ratingBarFill, { width: `${n >= 4 ? n * 16 : n * 6}%`, backgroundColor: '#f59e0b' }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Reviews from Supabase */}
              {productReviews.length === 0 ? (
                <View style={s.reviewCard}>
                  <Text style={s.reviewComment}>No reviews yet. Be the first to review this product!</Text>
                </View>
              ) : (
                productReviews.map((r, i) => (
                <View key={i} style={s.reviewCard}>
                  <View style={s.reviewCardTop}>
                    <View style={s.reviewerAvatar}>
                      <Text style={s.reviewerInitial}>{r.name[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.reviewerName}>{r.name}</Text>
                        {r.verified && (
                          <View style={s.verifiedPill}>
                            <Text style={s.verifiedTxt}>✓ Verified</Text>
                          </View>
                        )}
                      </View>
                      <Stars rating={r.rating} size={10} />
                    </View>
                    <Text style={s.reviewDate}>{r.date}</Text>
                  </View>
                  <Text style={s.reviewComment}>{r.comment}</Text>
                </View>
                ))
              )}

              {/* Write review prompt */}
              {!user ? (
                <View style={s.loginPrompt}>
                  <Text style={s.loginPromptTxt}>
                    <Text style={{ color: colors.brand, fontWeight: '700' }} onPress={() => navigation.navigate('AuthModal')}>Sign in</Text> to leave a review
                  </Text>
                </View>
              ) : (
                <View style={s.writeReviewCard}>
                  <Text style={s.writeReviewTitle}>Write a Review</Text>
                  <Text style={s.writeReviewSub}>Share your experience with this product</Text>
                  <TouchableOpacity style={s.writeReviewBtn}>
                    <Feather name="edit-2" size={14} color="#fff" />
                    <Text style={s.writeReviewBtnTxt}>Write Review</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ── RELATED ── */}
          {tab === 'related' && (
            <View style={s.tabContent}>
              <Text style={s.relatedHeader}>
                More in <Text style={{ color: colors.text, fontWeight: '700' }}>{product.cat}</Text>
              </Text>
              {related.length === 0 ? (
                <Text style={s.relatedEmpty}>No related products found.</Text>
              ) : (
                <View style={s.relatedGrid}>
                  {related.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={s.relatedCard}
                      onPress={() => navigation.replace('ProductDetail', { product: p })}
                    >
                      <Image source={{ uri: p.img }} style={s.relatedImg} resizeMode="cover" />
                      <View style={{ padding: 8 }}>
                        <Text style={s.relatedName} numberOfLines={2}>{p.name}</Text>
                        <Stars rating={p.rating} size={10} />
                        <Text style={s.relatedPrice}>{fmt(p.price)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={{ height: 110 }} />
        </View>
      </ScrollView>

      {/* ── Bottom Action Bar ── */}
      <View style={s.bottomBar}>
        <TouchableOpacity onPress={handleChat} style={s.chatBtn}>
          <Feather name="message-circle" size={18} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleAddToCart}
          style={[s.cartBtn, addedToCart && { backgroundColor: '#10b981' }]}
        >
          <Feather name={addedToCart ? 'check' : 'shopping-cart'} size={16} color="#fff" />
          <Text style={s.cartBtnText}>{addedToCart ? 'Added!' : 'Add to Cart'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleBuyNow} style={s.buyBtn}>
          <Text style={s.buyBtnText}>Buy Now</Text>
        </TouchableOpacity>
      </View>

      {payment && (
        <PaymentSheet
          visible
          amount={payment.price}
          title={payment.name}
          onSuccess={() => {
            setPayment(null);
            Alert.alert('✅ Order Placed!', 'Your payment was successful. Your item is on its way!');
          }}
          onClose={() => setPayment(null)}
        />
      )}
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  backBtn2: { marginTop: 20, padding: 12 },

  // Gallery
  gallery: { position: 'relative' },
  mainImg: { width: W, height: 300 },
  backBtn: { position: 'absolute', top: 48, left: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  topRight: { position: 'absolute', top: 48, right: 14, flexDirection: 'column', gap: 8 },
  topRightBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  badgeOverlay: { position: 'absolute', top: 48, left: 60, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  badgeOverlayTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  arrowLeft: { position: 'absolute', left: 12, top: '50%', marginTop: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  arrowRight: { position: 'absolute', right: 12, top: '50%', marginTop: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 18, backgroundColor: '#fff', borderRadius: 3 },
  thumbRow: { backgroundColor: colors.dark2 },
  thumb: { width: 58, height: 58, borderRadius: 10, opacity: 0.55 },
  thumbActive: { opacity: 1, borderWidth: 2, borderColor: colors.brand },

  // Body
  body: { padding: 18 },
  catLabel: { fontSize: 11, fontWeight: '700', color: colors.brand, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  name: { fontSize: 22, fontWeight: '900', color: colors.text, lineHeight: 28, marginBottom: 12 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  price: { fontSize: 27, fontWeight: '900', color: colors.text },
  originalPrice: { fontSize: 16, color: colors.textMuted, textDecorationLine: 'line-through' },
  discountPill: { backgroundColor: '#10b98122', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  discountTxt: { color: '#10b981', fontSize: 11, fontWeight: '800' },
  savingsLabel: { fontSize: 12, color: '#10b981', fontWeight: '600', marginBottom: 10 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  ratingNum: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },
  reviewCount: { fontSize: 12, color: colors.textMuted },

  infoChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.dark3, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  chipTxt: { fontSize: 11, fontWeight: '600', color: colors.textMuted },

  // Seller
  sellerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.dark3, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  sellerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sellerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.dark4, alignItems: 'center', justifyContent: 'center' },
  sellerName: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  sellerSub: { fontSize: 10, color: colors.textMuted },
  followBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.dark4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  followTxt: { fontSize: 11, fontWeight: '600', color: colors.textMuted },

  sellerStats: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: colors.dark3, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statVal: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, color: colors.textMuted },

  // Tabs
  tabScroll: { marginBottom: 14 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.dark3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  tabBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabTxt: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTxtActive: { color: '#fff' },
  tabContent: { gap: 12 },

  // Overview
  overviewCard: { backgroundColor: colors.dark3, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  overviewHeading: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 10 },
  overviewDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 14 },
  quickSpecGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickSpecBox: { width: '47%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10 },
  quickSpecLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  quickSpecValue: { fontSize: 12, fontWeight: '700', color: colors.text },

  trustCard: { backgroundColor: colors.dark3, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  trustRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  trustTxt: { fontSize: 12, color: colors.textMuted, flex: 1, lineHeight: 17 },

  // Specs
  specsCard: { backgroundColor: colors.dark3, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 16 },
  specRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  specRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  specLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', width: 100 },
  specValue: { fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 },

  // Reviews
  reviewSummary: { backgroundColor: colors.dark3, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  reviewBigScore: { alignItems: 'center', gap: 4 },
  bigRating: { fontSize: 36, fontWeight: '900', color: colors.text },
  ratingBars: { flex: 1, gap: 5 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingBarNum: { fontSize: 10, color: colors.textMuted, width: 8 },
  ratingBarTrack: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  ratingBarFill: { height: '100%', borderRadius: 3 },
  reviewCard: { backgroundColor: colors.dark3, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  reviewCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  reviewerAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brand + '25', alignItems: 'center', justifyContent: 'center' },
  reviewerInitial: { fontSize: 14, fontWeight: '800', color: colors.brand },
  reviewerName: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 3 },
  reviewDate: { fontSize: 10, color: colors.textMuted },
  verifiedPill: { backgroundColor: '#10b98118', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  verifiedTxt: { fontSize: 9, color: '#10b981', fontWeight: '700' },
  reviewComment: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },

  loginPrompt: { backgroundColor: colors.dark3, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  loginPromptTxt: { fontSize: 13, color: colors.textMuted },
  writeReviewCard: { backgroundColor: colors.dark3, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 6 },
  writeReviewTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  writeReviewSub: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  writeReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start' },
  writeReviewBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Related
  relatedHeader: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  relatedEmpty: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  relatedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  relatedCard: { width: '47%', backgroundColor: colors.dark3, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  relatedImg: { width: '100%', height: 110 },
  relatedName: { fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4, lineHeight: 15 },
  relatedPrice: { fontSize: 12, fontWeight: '800', color: colors.brand, marginTop: 4 },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 24, backgroundColor: colors.dark2, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  chatBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#3b82f620', alignItems: 'center', justifyContent: 'center' },
  cartBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.dark3, borderRadius: 14, paddingVertical: 13, borderWidth: 1, borderColor: colors.brand + '50' },
  cartBtnText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  buyBtn: { flex: 1.4, backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  buyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

}