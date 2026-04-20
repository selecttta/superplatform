import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Animated, Dimensions, RefreshControl,
  TextInput, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import {
  CATEGORIES, COLORS, PRODUCTS, DOCTORS, PROPERTIES,
  HOME_SERVICES, HEADER_CATEGORIES,
} from '../../lib/constants';
import { fmt } from '../../utils/helpers';
import { useTheme } from '../../contexts/ThemeContext';

// ── Time-based greeting ───────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const { width: W } = Dimensions.get('window');

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(hours) {
  const endRef = useRef(null);
  const [left, setLeft] = useState({ h: hours, m: 0, s: 0 });
  useEffect(() => {
    endRef.current = Date.now() + hours * 3600_000;
    const t = setInterval(() => {
      const diff = Math.max(0, endRef.current - Date.now());
      setLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(t);
  }, [hours]);
  return left;
}

// ── Hero Slider ───────────────────────────────────────────────────────────────
const HERO_SLIDES = [
  { img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80', title: 'Everything in One App', sub: 'Transport, health, shopping & more.' },
  { img: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=900&q=80', title: 'Book a Ride', sub: 'GPS-tracked drivers across Greater Accra.' },
  { img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&q=80', title: 'Consult a Doctor', sub: 'Video consultations from your phone.' },
  { img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=80', title: 'Shop Everything', sub: 'New & second-hand from local sellers.' },
  { img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=80', title: 'Find Your Home', sub: 'Rent, buy or list property in Ghana.' },
];

function HeroSlider({ onSlidePress, st, colors }) {
  const [cur, setCur] = useState(0);
  const slideX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setInterval(() => {
      setCur(c => {
        const next = (c + 1) % HERO_SLIDES.length;
        slideX.setValue(W);
        Animated.spring(slideX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
        return next;
      });
    }, 4500);
    return () => clearInterval(t);
  }, []);
  const slide = HERO_SLIDES[cur];
  return (
    <View style={st.hero}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: slideX }] }]}>
        <Image source={{ uri: slide.img }} style={st.heroImg} resizeMode="cover" />
      </Animated.View>
      <View style={st.heroOverlay} />
      <TouchableOpacity style={st.heroContent} activeOpacity={0.9} onPress={() => onSlidePress?.(cur)}>
        <Text style={st.heroTitle}>{slide.title}</Text>
        <Text style={st.heroSub}>{slide.sub}</Text>
        <View style={st.heroCta}>
          <Text style={st.heroCtaTxt}>Explore now</Text>
          <Feather name="arrow-right" size={13} color="#fff" />
        </View>
      </TouchableOpacity>
      <View style={st.heroDots}>
        {HERO_SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => setCur(i)}>
            <View style={[st.dot, i === cur && st.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Notification Dropdown Modal ───────────────────────────────────────────────
function NotifModal({ visible, notifs, onClose, onNotifPress, onViewAll, st }) {
  const unreadCount = notifs.filter(n => !n.is_read).length;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={st.notifBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={st.notifPanel}>
          <View style={st.notifHeader}>
            <Text style={st.notifTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={st.notifBadge}>
                <Text style={st.notifBadgeTxt}>{unreadCount} new</Text>
              </View>
            )}
          </View>
          {notifs.map(n => (
            <TouchableOpacity key={n.id} onPress={() => onNotifPress(n)}
              style={[st.notifItem, !n.is_read && st.notifItemUnread]}>
              <View style={[st.notifDotIndicator, { backgroundColor: n.is_read ? 'rgba(255,255,255,0.15)' : COLORS.brand }]} />
              <View style={{ flex: 1 }}>
                <Text style={[st.notifItemTitle, { color: n.is_read ? 'rgba(255,255,255,0.55)' : COLORS.text }]} numberOfLines={1}>{n.title}</Text>
                <Text style={st.notifItemBody} numberOfLines={1}>{n.body}</Text>
              </View>
              <Text style={st.notifItemTime}>{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={st.notifFooter} onPress={onViewAll}>
            <Text style={st.notifViewAll}>View all notifications →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionRow({ title, sub, onSeeAll, st }) {
  return (
    <View style={st.sectionRow}>
      <View>
        {sub && <Text style={st.sectionSub}>{sub}</Text>}
        <Text style={st.sectionTitle}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={st.seeAll}>See all →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── HomeScreen ────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { profile, user } = useAuthStore();
      
  const { colors, isDark, toggleTheme } = useTheme();
  const st = useStyles(colors);
  
const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [activeCat, setActiveCat] = useState('all');
  const countdown = useCountdown(5);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const go = (screen, params) => navigation.navigate(screen, params);

  const pad = n => String(n).padStart(2, '0');

  // Fetch real notifications from Supabase
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (data) setNotifs(data);
      } catch {}
    })();
  }, [user]);

  const handleNotifPress = async (notif) => {
    // Mark as read in DB
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    } catch {}
    setNotifOpen(false);
    navigation.navigate('Notifications');
  };

  const handleCategoryPress = (cat) => {
    setActiveCat(cat.id);
    if (cat.screen) go(cat.screen);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  };

  const SLIDE_SCREENS = ['Ecommerce', 'Transport', 'Health', 'Ecommerce', 'RealEstate'];

  // Flash deals = products with original price (discounted)
  const flashDeals = PRODUCTS.filter(p => p.original).slice(0, 4);
  // Trending = first 4 products
  const trending = PRODUCTS.slice(0, 4);

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User';

  return (
    <SafeAreaView style={st.screen}>
      {/* ── Header Container (curved bottom) ── */}
      <View style={st.headerContainer}>
        {/* Row 1: Profile + Notification */}
        <View style={st.profileRow}>
          <View style={st.profileLeft}>
            <View style={st.avatarWrap}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={st.avatarImg} />
              ) : (
                <Feather name="user" size={20} color={COLORS.textMuted} />
              )}
            </View>
            <View style={st.greetingWrap}>
              {user ? (
                <>
                  <Text style={st.greetingSmall}>Welcome</Text>
                  <Text style={st.greetingName} numberOfLines={1}>{displayName}</Text>
                </>
              ) : (
                <>
                  <Text style={st.greetingSmall}>{getGreeting()}</Text>
                  <Text style={st.greetingName} numberOfLines={1}>Welcome to SuperPlatform GH</Text>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity style={st.notifBtn} onPress={() => setNotifOpen(true)}>
            <Feather name="bell" size={20} color={colors.text} />
            {unreadCount > 0 && (
              <View style={st.notifCountBadge}>
                <Text style={st.notifCountTxt}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Row 2: Pill Search Bar */}
        <View style={st.searchBar}>
          <Feather name="search" size={18} color={COLORS.textMuted} style={{ marginLeft: 16 }} />
          <TextInput
            style={st.searchInput}
            placeholder="Search here..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => { if (search.trim()) go('Search', { query: search }); }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 14 }}>
              <Feather name="x" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notification dropdown modal */}
      <NotifModal
        visible={notifOpen}
        notifs={notifs}
        onClose={() => setNotifOpen(false)}
        onNotifPress={handleNotifPress}
        onViewAll={() => { setNotifOpen(false); go('Notifications'); }}
        st={st}
      />

      {/* Content area — categories float above, ScrollView fills behind */}
      <View style={{ flex: 1 }}>
        {/* Category Scroll — absolutely positioned, floating above content */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.catScrollContent}
          style={st.catScroll}
        >
          {HEADER_CATEGORIES.map(cat => {
            const isActive = activeCat === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={st.catItem}
                onPress={() => handleCategoryPress(cat)}
                activeOpacity={0.7}
              >
                <View style={[
                  st.catCircle,
                  cat.isAll && st.catCircleAll,
                  isActive && { borderWidth: 2.5, borderColor: cat.color },
                ]}>
                  {cat.isAll ? (
                    <Feather name="menu" size={22} color="#fff" />
                  ) : (
                    <Image source={{ uri: cat.img }} style={st.catCircleImg} />
                  )}
                </View>
                <Text style={[
                  st.catLabel,
                  isActive && { color: cat.color, fontWeight: '700' },
                ]} numberOfLines={1}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Main scrollable content — fills right after header */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />}
        >
        {/* Hero slider */}
        <HeroSlider onSlidePress={(i) => go(SLIDE_SCREENS[i] || 'Ecommerce')} st={st} colors={colors} />

        {/* Wallet — logged-in only */}
        {user && profile && (
          <TouchableOpacity style={st.walletCard}
            onPress={() => navigation.getParent()?.navigate('AccountTab') || go('Account')}
            activeOpacity={0.85}>
            <View>
              <Text style={st.walletLabel}>SP Wallet Balance</Text>
              <Text style={st.walletAmount}>{fmt(profile.wallet_balance || 0)}</Text>
            </View>
            <View style={st.walletActions}>
              <View style={st.walletBtn}>
                <Feather name="plus-circle" size={14} color={COLORS.brand} />
                <Text style={st.walletBtnText}>Top Up</Text>
              </View>
              <View style={[st.walletBtn, { borderColor: 'rgba(255,255,255,0.08)' }]}>
                <Feather name="arrow-up-right" size={14} color={COLORS.textMuted} />
                <Text style={st.walletBtnText}>Send</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Guest sign-in prompt */}
        {!user && (
          <View style={st.guestPrompt}>
            <Text style={st.guestTitle}>Get the full experience</Text>
            <Text style={st.guestSub}>Sign in to book services, chat with providers, and track orders.</Text>
            <View style={st.guestBtns}>
              <TouchableOpacity style={st.signInBtn} onPress={() => go('AuthModal')}>
                <Text style={st.signInBtnText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.registerBtn} onPress={() => go('AuthModal')}>
                <Text style={st.registerBtnText}>Join Free →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}



        {/* ── Flash Deals ── */}
        <SectionRow st={st}           title="Flash Deals"
          sub="⚡ Limited Time"
          onSeeAll={() => go('Ecommerce')}
        />
        {/* Countdown timer */}
        <View style={st.countdownRow}>
          <Text style={st.countdownLabel}>Ends in:</Text>
          {[pad(countdown.h), pad(countdown.m), pad(countdown.s)].map((v, i) => (
            <React.Fragment key={i}>
              <View style={st.countdownBox}><Text style={st.countdownVal}>{v}</Text></View>
              {i < 2 && <Text style={st.countdownColon}>:</Text>}
            </React.Fragment>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
          {flashDeals.map(p => (
            <TouchableOpacity key={p.id} style={st.productCard} onPress={() => go('Ecommerce')}>
              <Image source={{ uri: p.img }} style={st.productImg} />
              {p.badge && (
                <View style={[st.productBadge, { backgroundColor: p.badge === 'HOT' ? '#ef4444' : p.badge === 'NEW' ? '#10b981' : '#f97316' }]}>
                  <Text style={st.productBadgeTxt}>{p.badge}</Text>
                </View>
              )}
              <View style={st.productInfo}>
                <Text style={st.productName} numberOfLines={2}>{p.name}</Text>
                <View style={st.productPriceRow}>
                  <Text style={st.productPrice}>{fmt(p.price)}</Text>
                  {p.original && <Text style={st.productOriginal}>{fmt(p.original)}</Text>}
                </View>
                {p.original && (
                  <Text style={st.productDiscount}>
                    {Math.round((1 - p.price / p.original) * 100)}% OFF
                  </Text>
                )}
                <View style={st.ratingRow}>
                  <Feather name="star" size={11} color="#f59e0b" />
                  <Text style={st.ratingTxt}>{p.rating} ({p.reviews})</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Top Doctors ── */}
        <SectionRow st={st} title="Top Doctors" onSeeAll={() => go('Health')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
          {DOCTORS.map(doc => (
            <TouchableOpacity key={doc.id} style={st.doctorCard} onPress={() => go('Health')}>
              <Image source={{ uri: doc.img }} style={st.doctorImg} />
              <View style={st.doctorInfo}>
                {doc.badge && (
                  <View style={[st.docBadge, { backgroundColor: COLORS.health + '20' }]}>
                    <Text style={[st.docBadgeTxt, { color: COLORS.health }]}>{doc.badge}</Text>
                  </View>
                )}
                <Text style={st.doctorName} numberOfLines={1}>{doc.name}</Text>
                <Text style={st.doctorSpecialty}>{doc.specialty}</Text>
                <View style={st.ratingRow}>
                  <Feather name="star" size={11} color="#f59e0b" />
                  <Text style={st.ratingTxt}>{doc.rating}</Text>
                </View>
                <Text style={st.doctorPrice}>{fmt(doc.price)}<Text style={st.doctorPriceSub}>/session</Text></Text>
                <View style={[st.availBadge, { backgroundColor: '#10b98120' }]}>
                  <Feather name="clock" size={10} color="#10b981" />
                  <Text style={[st.availTxt, { color: '#10b981' }]}>{doc.avail}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Home Services ── */}
        <SectionRow st={st} title="Home Services" sub="On Demand" onSeeAll={() => go('HomeServices')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
          {HOME_SERVICES.map(svc => (
            <TouchableOpacity key={svc.id} style={st.serviceCard} onPress={() => go('HomeServices')}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{svc.icon}</Text>
              <Text style={st.serviceName}>{svc.name}</Text>
              <Text style={st.serviceDesc} numberOfLines={2}>{svc.desc}</Text>
              <Text style={st.servicePrice}>From {fmt(svc.price)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Featured Properties ── */}
        <SectionRow st={st} title="Featured Properties" onSeeAll={() => go('RealEstate')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
          {PROPERTIES.map(p => (
            <TouchableOpacity key={p.id} style={st.propCard} onPress={() => go('RealEstate')}>
              <View style={st.propImgWrap}>
                <Image source={{ uri: p.img }} style={st.propImg} />
                {p.badge && (
                  <View style={[st.propBadge, { backgroundColor: p.badge === 'HOT' ? '#ef4444' : p.badge === 'LUXURY' ? '#f59e0b' : COLORS.brand }]}>
                    <Text style={st.propBadgeTxt}>{p.badge}</Text>
                  </View>
                )}
                <View style={[st.propTypeBadge, { backgroundColor: p.type === 'Rent' ? '#3b82f6' : '#8b5cf6' }]}>
                  <Text style={st.propBadgeTxt}>{p.type}</Text>
                </View>
              </View>
              <View style={st.propInfo}>
                <Text style={st.propName} numberOfLines={1}>{p.name}</Text>
                <View style={st.propLocationRow}>
                  <Feather name="map-pin" size={10} color={COLORS.textMuted} />
                  <Text style={st.propLocation} numberOfLines={1}>{p.location}</Text>
                </View>
                <View style={st.propFooter}>
                  <Text style={st.propPrice}>{`GH₵${p.price}`}<Text style={st.propUnit}>{p.unit}</Text></Text>
                  {p.beds > 0 && <Text style={st.propMeta}>{p.beds}bd · {p.baths}ba</Text>}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Trending Now ── */}
        <SectionRow st={st} title="Trending Now" sub="🔥 Most Popular" onSeeAll={() => go('Ecommerce')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
          {trending.map(p => (
            <TouchableOpacity key={p.id} style={st.productCard} onPress={() => go('Ecommerce')}>
              <Image source={{ uri: p.img }} style={st.productImg} />
              {p.isNew && (
                <View style={[st.productBadge, { backgroundColor: '#10b981' }]}>
                  <Text style={st.productBadgeTxt}>NEW</Text>
                </View>
              )}
              <View style={st.productInfo}>
                <Text style={st.productName} numberOfLines={2}>{p.name}</Text>
                <View style={st.productPriceRow}>
                  <Text style={st.productPrice}>{fmt(p.price)}</Text>
                  {p.original && <Text style={st.productOriginal}>{fmt(p.original)}</Text>}
                </View>
                <View style={st.ratingRow}>
                  <Feather name="star" size={11} color="#f59e0b" />
                  <Text style={st.ratingTxt}>{p.rating} ({p.reviews})</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>


        {/* Why Us */}
        <View style={st.whyUsWrap}>
          {[
            { icon: 'shield', color: COLORS.brand, title: 'Verified Providers', desc: 'Every provider is background-checked by our admin team.' },
            { icon: 'zap', color: '#10b981', title: 'Instant Booking', desc: 'Book rides, appointments & services in seconds.' },
            { icon: 'smartphone', color: '#3b82f6', title: 'Ghana Payments', desc: 'MTN MoMo, Vodafone Cash, AirtelTigo & cards.' },
          ].map((item, i) => (
            <View key={i} style={st.whyCard}>
              <View style={[st.whyIcon, { backgroundColor: item.color + '20' }]}>
                <Feather name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={st.whyTitle}>{item.title}</Text>
              <Text style={st.whyDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      </View>

      {/* Floating theme toggle */}
      <TouchableOpacity
        style={[st.themeFab, { backgroundColor: colors.dark3, borderColor: colors.border }]}
        onPress={toggleTheme}
        activeOpacity={0.8}
      >
        <Feather name={isDark ? 'moon' : 'sun'} size={18} color={colors.brand} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark },

  // Floating theme FAB
  themeFab: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 50,
  },

  // Header container — curved bottom
  headerContainer: {
    backgroundColor: colors.dark3,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 14,
    paddingBottom: 38,
    marginHorizontal: 0,
    zIndex: 1,
  },
  // Profile row
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  profileLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.dark4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.brand + '50',
  },
  avatarImg: { width: 42, height: 42, borderRadius: 21 },
  greetingWrap: { flex: 1 },
  greetingSmall: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginBottom: 1 },
  greetingName: { fontSize: 15, fontWeight: '800', color: colors.text },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.dark4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  notifCountBadge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifCountTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  // Search bar (pill)
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark4,
    borderRadius: 25,
    height: 48,
    marginHorizontal: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, paddingHorizontal: 12, height: '100%' },
  // Category scroll — overlaps header bottom
  catScroll: {
    position: 'absolute',
    top: -30,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  catScrollContent: { paddingHorizontal: 16, gap: 14 },
  catItem: { alignItems: 'center', width: 68 },
  catCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dark4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.10)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  catCircleAll: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  catCircleImg: { width: 56, height: 56, borderRadius: 28 },
  catLabel: { fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' },

  // Notification Modal
  notifBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 12 },
  notifPanel: { width: 300, backgroundColor: colors.dark3, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  notifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  notifTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  notifBadge: { backgroundColor: colors.brand + '25', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  notifBadgeTxt: { color: colors.brand, fontSize: 10, fontWeight: '700' },
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  notifItemUnread: { backgroundColor: colors.brand + '08' },
  notifDotIndicator: { width: 7, height: 7, borderRadius: 3.5, marginTop: 5, flexShrink: 0 },
  notifItemTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  notifItemBody: { fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 16 },
  notifItemTime: { fontSize: 10, color: 'rgba(255,255,255,0.25)', marginLeft: 4, flexShrink: 0 },
  notifFooter: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  notifViewAll: { color: colors.brand, fontSize: 12, fontWeight: '600' },

  // Hero
  hero: { marginHorizontal: 12, marginTop: 14, marginBottom: 14, borderRadius: 20, overflow: 'hidden', height: 200 },
  heroImg: { ...StyleSheet.absoluteFillObject },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  heroContent: { position: 'absolute', bottom: 38, left: 18, right: 18 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 5, lineHeight: 26 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 12 },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.brand, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  heroCtaTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  heroDots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { width: 18, backgroundColor: colors.brand, borderRadius: 3 },

  // Wallet
  walletCard: { marginHorizontal: 12, marginBottom: 14, backgroundColor: colors.dark3, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.brand + '30' },
  walletLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.8 },
  walletAmount: { fontSize: 20, fontWeight: '800', color: colors.text },
  walletActions: { flexDirection: 'row', gap: 8 },
  walletBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.dark4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  walletBtnText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },

  // Guest
  guestPrompt: { marginHorizontal: 12, marginBottom: 10, backgroundColor: colors.dark3, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  guestTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 3 },
  guestSub: { fontSize: 11, color: colors.textMuted, lineHeight: 15, marginBottom: 8 },
  guestBtns: { flexDirection: 'row', gap: 10 },
  signInBtn: { flex: 1, backgroundColor: colors.brand, borderRadius: 11, paddingVertical: 10, alignItems: 'center' },
  signInBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  registerBtn: { flex: 1, backgroundColor: colors.dark4, borderRadius: 11, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  registerBtnText: { color: colors.text, fontWeight: '700', fontSize: 13 },

  // Section headers
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 18, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  sectionSub: { fontSize: 10, fontWeight: '600', color: colors.brand, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  seeAll: { color: colors.brand, fontSize: 12, fontWeight: '600' },



  // Countdown
  countdownRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, gap: 6 },
  countdownLabel: { fontSize: 12, color: colors.textMuted, marginRight: 2 },
  countdownBox: { backgroundColor: colors.brand, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, minWidth: 28, alignItems: 'center' },
  countdownVal: { color: '#fff', fontWeight: '700', fontSize: 12, fontVariant: ['tabular-nums'] },
  countdownColon: { color: colors.brand, fontSize: 14, fontWeight: '700' },

  // Product cards
  productCard: { width: 160, backgroundColor: colors.dark3, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  productImg: { width: '100%', height: 120, resizeMode: 'cover' },
  productBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  productBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  productInfo: { padding: 10 },
  productName: { fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 5, lineHeight: 16 },
  productPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  productPrice: { fontSize: 13, fontWeight: '800', color: colors.text },
  productOriginal: { fontSize: 11, color: colors.textMuted, textDecorationLine: 'line-through' },
  productDiscount: { fontSize: 10, fontWeight: '700', color: '#10b981', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingTxt: { fontSize: 11, color: colors.textMuted },

  // Doctor cards
  doctorCard: { width: 150, backgroundColor: colors.dark3, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  doctorImg: { width: '100%', height: 110, resizeMode: 'cover' },
  doctorInfo: { padding: 10 },
  docBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 5 },
  docBadgeTxt: { fontSize: 9, fontWeight: '700' },
  doctorName: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 2 },
  doctorSpecialty: { fontSize: 10, color: colors.health, fontWeight: '600', marginBottom: 4 },
  doctorPrice: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 4 },
  doctorPriceSub: { fontSize: 10, fontWeight: '400', color: colors.textMuted },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 },
  availTxt: { fontSize: 10, fontWeight: '600' },

  // Home service cards
  serviceCard: { width: 140, backgroundColor: colors.dark3, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  serviceName: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 },
  serviceDesc: { fontSize: 11, color: colors.textMuted, lineHeight: 15, marginBottom: 6 },
  servicePrice: { fontSize: 12, fontWeight: '700', color: colors.brand },

  // Property cards
  propCard: { width: 230, backgroundColor: colors.dark3, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  propImgWrap: { position: 'relative' },
  propImg: { width: '100%', height: 130, resizeMode: 'cover' },
  propBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  propTypeBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  propBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  propInfo: { padding: 12 },
  propName: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 },
  propLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  propLocation: { fontSize: 11, color: colors.textMuted, flex: 1 },
  propFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  propPrice: { fontSize: 14, fontWeight: '800', color: colors.text },
  propUnit: { fontSize: 10, fontWeight: '400', color: colors.textMuted },
  propMeta: { fontSize: 11, color: colors.textMuted },


  // Why us
  whyUsWrap: { paddingHorizontal: 12, marginTop: 6, gap: 10 },
  whyCard: { backgroundColor: colors.dark3, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  whyIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  whyTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  whyDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
});

}