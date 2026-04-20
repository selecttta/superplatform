import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Image, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS, BOOKING_STATUS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt, fmtDate, initials } from '../../utils/helpers';

const StatusBadge = ({ status, st }) => {
  const s = BOOKING_STATUS[status?.toUpperCase()] || { label: status || '—', color: COLORS.textMuted };
  return (
    <View style={[st.statusBadge, { backgroundColor: s.color + '20' }]}>
      <Text style={[st.statusText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
};

// ── List menu items (appear in both guest and logged-in) ──────────────────────
const MENU_ITEMS = [
  { icon: 'message-circle', label: 'Messages', key: 'messages', color: '#3b82f6', desc: 'Chat with providers & sellers' },
  { icon: 'package', label: 'Your Orders', key: 'orders', color: COLORS.brand, desc: 'Track & manage your orders' },
  { icon: 'calendar', label: 'Your Bookings', key: 'bookings', color: '#10b981', desc: 'View all service bookings' },
  { icon: 'star', label: 'Your Reviews', key: 'reviews', color: '#f59e0b', desc: 'Reviews you have submitted' },
  { icon: 'heart', label: 'Saved Items', key: 'saved', color: '#ec4899', desc: 'Wishlist & bookmarked services' },
];

// ── Icon-shortcut items (shown as 4-column icon grid when logged in) ──────────
const ICON_SHORTCUTS = [
  { icon: 'settings', label: 'Settings', key: 'settings', color: COLORS.textMuted },
  { icon: 'headphones', label: 'Support', key: 'support', color: '#8b5cf6' },
  { icon: 'map-pin', label: 'Address', key: 'address', color: '#10b981' },
  { icon: 'users', label: 'Following', key: 'follow', color: '#3b82f6' },
];

// ── Guest full menu (includes all items as a single list) ─────────────────────
const GUEST_MENU = [
  ...MENU_ITEMS,
  { icon: 'credit-card', label: 'Credit Balance', key: 'credit', color: '#06b6d4', desc: 'Your SP Wallet balance' },
  { icon: 'tag', label: 'Vouchers', key: 'vouchers', color: '#ec4899', desc: 'Coupons & special offers' },
  { icon: 'settings', label: 'Settings', key: 'settings', color: COLORS.textMuted, desc: 'App preferences & profile' },
  { icon: 'headphones', label: 'Customer Support', key: 'support', color: '#8b5cf6', desc: 'Help, FAQs & contact us' },
  { icon: 'users', label: 'Follow Sellers', key: 'follow', color: '#3b82f6', desc: 'Sellers & providers you follow' },
  { icon: 'map-pin', label: 'Saved Addresses', key: 'address', color: '#10b981', desc: 'Your delivery addresses' },
];

export default function CustomerDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const st = useStyles(colors);
  const { user, profile, signOut } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [txns, setTxns] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');

  const loadData = async () => {
    if (!user) return;
    try {
      const [bRes, oRes, tRes] = await Promise.all([
        supabase.from('bookings')
          .select('*, provider:profiles!bookings_provider_id_fkey(full_name, avatar_url)')
          .eq('customer_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('orders')
          .select('*, items:order_items(*)')
          .eq('customer_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('wallet_transactions')
          .select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
      ]);
      setBookings(bRes.data || []);
      setOrders(oRes.data || []);
      setTxns(tRes.data || []);
    } catch { }
  };

  useEffect(() => { loadData(); }, [user]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleNav = (key) => {
    switch (key) {
      case 'messages': navigation.navigate('ChatList'); break;
      case 'orders': setActiveTab('orders'); break;
      case 'bookings': setActiveTab('bookings'); break;
      case 'reviews': Alert.alert('Reviews', 'Your submitted reviews will appear here.'); break;
      case 'saved': Alert.alert('Saved Items', 'Your wishlist & bookmarks will appear here.'); break;
      case 'credit':
      case 'wallet': setActiveTab('wallet'); break;
      case 'vouchers': Alert.alert('Vouchers', 'No active vouchers right now. Check back for special deals!'); break;
      case 'settings': navigation.navigate('Profile'); break;
      case 'support':
        Alert.alert('Customer Support', 'WhatsApp: +233 20 000 0000\nEmail: support@superplatformgh.com', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'WhatsApp', onPress: () => Linking.openURL('https://wa.me/233200000000') },
        ]);
        break;
      case 'follow': Alert.alert('Following', 'Sellers and providers you follow will appear here.'); break;
      case 'address': Alert.alert('Saved Addresses', 'Address book feature coming soon.'); break;
      default: break;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // GUEST VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={st.screen}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={st.guestHeader}>
            <View style={st.guestAvatarCircle}>
              <Feather name="user" size={32} color={colors.textMuted} />
            </View>
            <Text style={st.guestTitle}>My Account</Text>
          </View>

          {/* Get full experience banner */}
          <View style={st.guestBanner}>
            <Text style={st.guestBannerEmoji}>🌟</Text>
            <Text style={st.guestBannerTitle}>Get the Full Experience</Text>
            <Text style={st.guestBannerSub}>
              Sign in to view your orders, track bookings, earn rewards, and access all features.
            </Text>
            <View style={st.guestBtns}>
              <TouchableOpacity
                style={st.signInBtn}
                onPress={() => navigation.navigate('AuthModal')}
              >
                <Feather name="log-in" size={15} color="#fff" />
                <Text style={st.signInBtnTxt}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={st.joinBtn}
                onPress={() => navigation.navigate('AuthModal')}
              >
                <Text style={st.joinBtnTxt}>Join Free →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Full menu list (greyed out / locked look) */}
          <Text style={st.menuSectionLabel}>Account Features</Text>
          <View style={st.menuCard}>
            {GUEST_MENU.map((item, i) => (
              <TouchableOpacity
                key={item.key}
                style={[st.menuRow, i < GUEST_MENU.length - 1 && st.menuRowBorder]}
                onPress={() => navigation.navigate('AuthModal')}
                activeOpacity={0.7}
              >
                <View style={[st.menuIconWrap, { backgroundColor: item.color + '18' }]}>
                  <Feather name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.menuLabel}>{item.label}</Text>
                  <Text style={st.menuDesc}>{item.desc}</Text>
                </View>
                <View style={st.lockIcon}>
                  <Feather name="lock" size={12} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGGED-IN VIEW
  // ─────────────────────────────────────────────────────────────────────────
  const walletBalance = profile?.wallet_balance || 0;
  const voucherCount = 2; // placeholder — swap with real DB data

  return (
    <SafeAreaView style={st.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {/* ── Profile header ── */}
        <View style={st.profileHeader}>
          {/* Avatar */}
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={st.avatar} />
            : (
              <View style={st.avatarFallback}>
                <Text style={st.avatarInitials}>{initials(profile?.full_name)}</Text>
              </View>
            )
          }

          {/* Name + email */}
          <View style={{ flex: 1 }}>
            <Text style={st.profileName}>{profile?.full_name || 'Customer'}</Text>
            <Text style={st.profileEmail}>{profile?.email}</Text>
            <View style={st.customerBadge}>
              <Text style={st.customerBadgeTxt}>✦ Customer</Text>
            </View>
          </View>

          {/* Top-right icon shortcuts: Settings · Support · Address · Following */}
          <View style={st.topIcons}>
            {ICON_SHORTCUTS.map(item => (
              <TouchableOpacity
                key={item.key}
                style={[st.topIconBtn, { backgroundColor: item.color + '15' }]}
                onPress={() => handleNav(item.key)}
              >
                <Feather name={item.icon} size={15} color={item.color} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Credit Balance + Vouchers stats row (numbers, not list) ── */}
        <View style={st.statsBar}>
          <TouchableOpacity style={st.statItem} onPress={() => handleNav('wallet')}>
            <Text style={st.statNum}>{fmt(walletBalance)}</Text>
            <Text style={st.statLbl}>Credit Balance</Text>
          </TouchableOpacity>
          <View style={st.statDivider} />
          <TouchableOpacity style={st.statItem} onPress={() => handleNav('vouchers')}>
            <Text style={st.statNum}>{voucherCount}</Text>
            <Text style={st.statLbl}>Vouchers</Text>
          </TouchableOpacity>
          <View style={st.statDivider} />
          <TouchableOpacity style={st.statItem} onPress={() => handleNav('orders')}>
            <Text style={st.statNum}>{orders.length}</Text>
            <Text style={st.statLbl}>Orders</Text>
          </TouchableOpacity>
          <View style={st.statDivider} />
          <TouchableOpacity style={st.statItem} onPress={() => handleNav('bookings')}>
            <Text style={st.statNum}>{bookings.length}</Text>
            <Text style={st.statLbl}>Bookings</Text>
          </TouchableOpacity>
        </View>

        {/* ── Wallet quick actions ── */}
        <View style={st.walletCard}>
          <View>
            <Text style={st.walletLabel}>SP Wallet Balance</Text>
            <Text style={st.walletAmount}>{fmt(walletBalance)}</Text>
          </View>
          <View style={st.walletBtns}>
            <TouchableOpacity style={st.walletBtn}>
              <Feather name="plus-circle" size={13} color={colors.brand} />
              <Text style={st.walletBtnTxt}>Top Up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.walletBtn, { borderColor: 'rgba(255,255,255,0.08)' }]}>
              <Feather name="arrow-up-right" size={13} color={colors.textMuted} />
              <Text style={st.walletBtnTxt}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Activity tabs ── */}
        <Text style={st.menuSectionLabel}>My Activity</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}
          contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 8 }}>
          {[
            { key: 'orders', label: '📦 Orders', count: orders.length },
            { key: 'bookings', label: '📋 Bookings', count: bookings.length },
            { key: 'wallet', label: '💰 Wallet', count: txns.length },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[st.tabChip, activeTab === t.key && st.tabChipActive]}
            >
              <Text style={[st.tabChipTxt, activeTab === t.key && st.tabChipTxtActive]}>
                {t.label}
              </Text>
              {t.count > 0 && (
                <View style={[st.tabCount, activeTab === t.key && { backgroundColor: '#fff3' }]}>
                  <Text style={[st.tabCountTxt, activeTab === t.key && { color: '#fff' }]}>{t.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={st.tabContent}>
          {/* ORDERS */}
          {activeTab === 'orders' && (
            orders.length === 0
              ? <Text style={st.emptyTxt}>No orders yet. Start shopping! 🛍️</Text>
              : orders.map(o => (
                <View key={o.id} style={st.activityCard}>
                  <View style={st.activityIconWrap}>
                    <Feather name="package" size={18} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.activityTitle}>Order #{(o.id || '').slice(-6).toUpperCase()}</Text>
                    <Text style={st.activitySub}>{o.items?.length || 0} item{o.items?.length !== 1 ? 's' : ''} · {fmtDate(o.created_at)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <StatusBadge st={st} status={o.status} />
                    <Text style={st.activityAmt}>{fmt(o.total)}</Text>
                  </View>
                </View>
              ))
          )}

          {/* BOOKINGS */}
          {activeTab === 'bookings' && (
            bookings.length === 0
              ? <Text style={st.emptyTxt}>No bookings yet. Book a service to get started!</Text>
              : bookings.map(b => (
                <View key={b.id} style={st.activityCard}>
                  <View style={[st.activityIconWrap, { backgroundColor: '#10b98120' }]}>
                    <Feather name="calendar" size={18} color="#10b981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.activityTitle}>{b.service_name || 'Service Booking'}</Text>
                    <Text style={st.activitySub}>{b.provider?.full_name} · {fmtDate(b.created_at)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <StatusBadge st={st} status={b.status} />
                    <Text style={st.activityAmt}>{fmt(b.amount)}</Text>
                  </View>
                </View>
              ))
          )}

          {/* WALLET */}
          {activeTab === 'wallet' && (
            txns.length === 0
              ? <Text style={st.emptyTxt}>No wallet transactions yet.</Text>
              : txns.map(t => (
                <View key={t.id} style={st.txnRow}>
                  <View style={[st.txnIcon, { backgroundColor: t.amount > 0 ? '#10b98120' : '#ef444420' }]}>
                    <Feather
                      name={t.amount > 0 ? 'arrow-down-left' : 'arrow-up-right'}
                      size={16}
                      color={t.amount > 0 ? '#10b981' : '#ef4444'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.activityTitle}>{t.description || t.type}</Text>
                    <Text style={st.activitySub}>{fmtDate(t.created_at)}</Text>
                  </View>
                  <Text style={[st.activityAmt, { color: t.amount > 0 ? '#10b981' : '#ef4444' }]}>
                    {t.amount > 0 ? '+' : ''}{fmt(t.amount)}
                  </Text>
                </View>
              ))
          )}
        </View>

        {/* ── Account menu list ── */}
        <Text style={st.menuSectionLabel}>Account</Text>
        <View style={st.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.key}
              style={[st.menuRow, i < MENU_ITEMS.length - 1 && st.menuRowBorder]}
              onPress={() => handleNav(item.key)}
              activeOpacity={0.7}
            >
              <View style={[st.menuIconWrap, { backgroundColor: item.color + '18' }]}>
                <Feather name={item.icon} size={18} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.menuLabel}>{item.label}</Text>
                <Text style={st.menuDesc}>{item.desc}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity
          style={st.signOutBtn}
          onPress={() => Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: signOut },
          ])}
        >
          <Feather name="log-out" size={16} color="#ef4444" />
          <Text style={st.signOutTxt}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.dark },

    // ── Guest styles ──────────────────────────────────────────────────────────
    guestHeader: { alignItems: 'center', paddingTop: 30, paddingBottom: 10 },
    guestAvatarCircle: { width: 74, height: 74, borderRadius: 37, backgroundColor: colors.dark3, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    guestTitle: { fontSize: 22, fontWeight: '800', color: colors.text },

    guestBanner: { marginHorizontal: 14, marginTop: 12, backgroundColor: colors.dark3, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.brand + '30', marginBottom: 20 },
    guestBannerEmoji: { fontSize: 36, marginBottom: 8 },
    guestBannerTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
    guestBannerSub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
    guestBtns: { flexDirection: 'row', gap: 10, width: '100%' },
    signInBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.brand, borderRadius: 13, paddingVertical: 12 },
    signInBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
    joinBtn: { flex: 1, backgroundColor: colors.dark4, borderRadius: 13, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    joinBtnTxt: { color: colors.text, fontWeight: '700', fontSize: 14 },

    lockIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },

    // ── Logged-in profile header ──────────────────────────────────────────────
    profileHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14, gap: 12 },
    avatar: { width: 58, height: 58, borderRadius: 29, flexShrink: 0 },
    avatarFallback: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    avatarInitials: { fontSize: 20, fontWeight: '800', color: '#fff' },
    profileName: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 2 },
    profileEmail: { fontSize: 12, color: colors.textMuted, marginBottom: 5 },
    customerBadge: { backgroundColor: colors.brand + '20', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
    customerBadgeTxt: { color: colors.brand, fontSize: 10, fontWeight: '700' },

    // Top-right icon row
    topIcons: { flexDirection: 'row', gap: 6, flexShrink: 0 },
    topIconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    // ── Stats bar ─────────────────────────────────────────────────────────────
    statsBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.dark3, marginHorizontal: 14, marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    statItem: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    statNum: { fontSize: 17, fontWeight: '900', color: colors.text, marginBottom: 3 },
    statLbl: { fontSize: 9, fontWeight: '600', color: colors.textMuted, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.4 },
    statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.07)' },

    // ── Wallet ────────────────────────────────────────────────────────────────
    walletCard: { marginHorizontal: 14, marginBottom: 14, backgroundColor: colors.dark3, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.brand + '30' },
    walletLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    walletAmount: { fontSize: 22, fontWeight: '800', color: colors.text },
    walletBtns: { flexDirection: 'row', gap: 8 },
    walletBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.dark4, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: colors.brand + '30' },
    walletBtnTxt: { fontSize: 11, fontWeight: '600', color: colors.textMuted },

    // ── Activity tabs ─────────────────────────────────────────────────────────
    tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.dark3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    tabChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
    tabChipTxt: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    tabChipTxtActive: { color: '#fff' },
    tabCount: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
    tabCountTxt: { fontSize: 10, fontWeight: '700', color: colors.textMuted },

    tabContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
    activityCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.dark3, borderRadius: 14, padding: 13, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    activityIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brand + '18', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    activityTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 3 },
    activitySub: { fontSize: 11, color: colors.textMuted },
    activityAmt: { fontSize: 13, fontWeight: '800', color: colors.text },

    txnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    txnIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

    // ── Menu section ─────────────────────────────────────────────────────────
    menuSectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 16, marginTop: 14, marginBottom: 8 },
    menuCard: { marginHorizontal: 14, backgroundColor: colors.dark3, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 10 },
    menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
    menuRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    menuIconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    menuLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
    menuDesc: { fontSize: 11, color: colors.textMuted },

    // ── Status badge ──────────────────────────────────────────────────────────
    statusBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
    statusText: { fontSize: 10, fontWeight: '700' },

    // ── Sign out ──────────────────────────────────────────────────────────────
    signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 14, paddingVertical: 15, borderRadius: 14, backgroundColor: '#ef444412', borderWidth: 1, borderColor: '#ef444425' },
    signOutTxt: { fontSize: 14, fontWeight: '700', color: '#ef4444' },

    emptyTxt: { textAlign: 'center', color: colors.textMuted, paddingVertical: 28, fontSize: 14 },
  });

}