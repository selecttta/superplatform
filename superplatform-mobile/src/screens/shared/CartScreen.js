import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { COLORS, PRODUCTS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt } from '../../utils/helpers';
import PaymentSheet from '../../components/payment/PaymentSheet';

// Shuffle helper for varied recommendations
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

// Mini product card for recommendation rows
function MiniProductCard({ item, onPress, s }) {
  const discount = item.original ? Math.round((1 - item.price / item.original) * 100) : 0;
  return (
    <TouchableOpacity style={s.miniCard} onPress={() => onPress(item)} activeOpacity={0.85}>
      <Image source={{ uri: item.img }} style={s.miniImg} resizeMode="cover" />
      {item.badge && (
        <View style={[s.miniBadge, {
          backgroundColor: item.badge === 'HOT' ? '#ef4444' :
            item.badge === 'NEW' ? '#10b981' :
              item.badge === 'SALE' ? COLORS.brand : '#8b5cf6',
        }]}>
          <Text style={s.miniBadgeTxt}>{item.badge}</Text>
        </View>
      )}
      <View style={s.miniInfo}>
        <Text style={s.miniName} numberOfLines={2}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          <Feather name="star" size={10} color="#f59e0b" />
          <Text style={s.miniRating}>{item.rating}</Text>
        </View>
        <Text style={s.miniPrice}>{fmt(item.price)}</Text>
        {discount > 0 && <Text style={s.miniDiscount}>-{discount}% OFF</Text>}
      </View>
      <TouchableOpacity
        style={s.miniAddBtn}
        onPress={(e) => { e.stopPropagation?.(); onPress(item); }}
      >
        <Feather name="plus" size={14} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// Section header component
function SectionHeader({ icon, title, onSeeAll, s }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{icon} {title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={s.seeAll}>See all →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function CartScreen({ navigation }) {
  const { items, removeItem, updateQty, total, count } = useCartStore();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const s = useStyles(colors);
  const [payment, setPayment] = useState(null);

  // Recommendation data derived from PRODUCTS
  const recentlyViewed = shuffle(PRODUCTS).slice(0, 6);
  const customersAlsoViewed = shuffle(PRODUCTS).slice(0, 6);
  const recommended = PRODUCTS.filter(p => p.badge === 'HOT' || p.badge === 'NEW').slice(0, 6);

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const checkout = () => {
    if (!user) {
      // Directly go to login — no alert dialog
      navigation.navigate('AuthModal');
      return;
    }
    setPayment({ name: `Cart Checkout (${count()} items)`, price: total() });
  };

  return (
    <SafeAreaView style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>My Cart</Text>
        {count() > 0 && <Text style={s.countBadge}>{count()} items</Text>}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: items.length > 0 ? 140 : 0 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>🛒</Text>
            <Text style={s.emptyTitle}>Your cart is empty</Text>
            <Text style={s.emptyText}>Browse products and add items to get started</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Ecommerce')} style={s.shopBtn}>
              <Text style={s.shopBtnText}>Start Shopping →</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.item}>
            <Image
              source={{ uri: item.img || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200' }}
              style={s.itemImg}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
              <Text style={s.itemPrice}>{fmt(item.price)}</Text>
              <View style={s.qtyRow}>
                <TouchableOpacity
                  onPress={() => item.qty === 1 ? removeItem(item.id) : updateQty(item.id, item.qty - 1)}
                  style={s.qtyBtn}
                >
                  <Feather name={item.qty === 1 ? 'trash-2' : 'minus'} size={13} color={item.qty === 1 ? '#ef4444' : colors.text} />
                </TouchableOpacity>
                <Text style={s.qtyText}>{item.qty}</Text>
                <TouchableOpacity onPress={() => updateQty(item.id, item.qty + 1)} style={s.qtyBtn}>
                  <Feather name="plus" size={13} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <Text style={s.lineTotal}>{fmt(item.price * item.qty)}</Text>
              <TouchableOpacity onPress={() => removeItem(item.id)}>
                <Feather name="x" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={() => (
          <>
            {/* Order summary (only when cart has items) */}
            {items.length > 0 && (
              <View style={s.summaryCard}>
                <Text style={s.summaryTitle}>Order Summary</Text>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Subtotal ({count()} items)</Text>
                  <Text style={s.summaryValue}>{fmt(total())}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Delivery</Text>
                  <Text style={[s.summaryValue, { color: '#10b981' }]}>Free</Text>
                </View>
                <View style={[s.summaryRow, s.summaryTotal]}>
                  <Text style={s.totalLabel}>Total</Text>
                  <Text style={s.totalAmt}>{fmt(total())}</Text>
                </View>
                <View style={s.trustRow}>
                  {['🔒 Secure Payment', '🚚 Free Delivery', '🔄 7-Day Returns'].map((t, i) => (
                    <View key={i} style={s.trustChip}>
                      <Text style={s.trustTxt}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── Recently Viewed ── */}
            <View style={s.sectionWrap}>
              <SectionHeader s={s} icon="🕐" title="Recently Viewed" onSeeAll={() => navigation.navigate('Ecommerce')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
                {recentlyViewed.map(p => (
                  <MiniProductCard s={s} key={p.id} item={p} onPress={handleProductPress} />
                ))}
              </ScrollView>
            </View>

            {/* ── Customers Also Viewed ── */}
            <View style={s.sectionWrap}>
              <SectionHeader s={s} icon="👥" title="Customers Also Viewed" onSeeAll={() => navigation.navigate('Ecommerce')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
                {customersAlsoViewed.map(p => (
                  <MiniProductCard s={s} key={p.id} item={p} onPress={handleProductPress} />
                ))}
              </ScrollView>
            </View>

            {/* ── Recommended for You ── */}
            <View style={s.sectionWrap}>
              <SectionHeader s={s} icon="✨" title="Recommended for You" onSeeAll={() => navigation.navigate('Ecommerce')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
                {recommended.map(p => (
                  <MiniProductCard s={s} key={p.id} item={p} onPress={handleProductPress} />
                ))}
              </ScrollView>
            </View>

            <View style={{ height: 120 }} />
          </>
        )}
      />

      {/* Sticky checkout bar (only when cart has items) */}
      {items.length > 0 && (
        <View style={s.checkoutBar}>
          <View>
            <Text style={s.checkoutHelper}>
              {user ? `${count()} items ready` : 'Sign in to checkout'}
            </Text>
            <Text style={s.totalDisplayAmt}>{fmt(total())}</Text>
          </View>
          <TouchableOpacity onPress={checkout} style={s.checkoutBtn} activeOpacity={0.85}>
            <Feather name="credit-card" size={16} color="#fff" />
            <Text style={s.checkoutText}>
              {user ? 'Checkout →' : 'Sign In & Checkout →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {payment && (
        <PaymentSheet
          visible
          amount={payment.price}
          title={payment.name}
          onSuccess={() => {
            setPayment(null);
            useCartStore.getState().clearCart?.();
            Alert.alert('✅ Order Confirmed!', 'Your payment was successful. Your items are on the way!');
            navigation.goBack();
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

    // Header
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    title: { fontSize: 20, fontWeight: '800', color: colors.text, flex: 1 },
    countBadge: { backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
    countBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

    // Empty state
    empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
    emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    shopBtn: { backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28 },
    shopBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    // Cart items
    item: { flexDirection: 'row', gap: 12, backgroundColor: colors.dark3, borderRadius: 16, padding: 13, marginHorizontal: 14, marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    itemImg: { width: 74, height: 74, borderRadius: 12, resizeMode: 'cover' },
    itemName: { fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 18 },
    itemPrice: { fontSize: 13, fontWeight: '800', color: colors.brand },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    qtyBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.dark4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    qtyText: { fontSize: 15, fontWeight: '700', color: colors.text, minWidth: 20, textAlign: 'center' },
    lineTotal: { fontSize: 15, fontWeight: '800', color: colors.text },

    // Order summary card
    summaryCard: { margin: 14, marginTop: 14, backgroundColor: colors.dark3, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    summaryTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 12 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    summaryLabel: { fontSize: 13, color: colors.textMuted },
    summaryValue: { fontSize: 13, fontWeight: '600', color: colors.text },
    summaryTotal: { borderBottomWidth: 0, marginTop: 6 },
    totalLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
    totalAmt: { fontSize: 20, fontWeight: '900', color: colors.text },
    trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    trustChip: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    trustTxt: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },

    // Sections
    sectionWrap: { marginTop: 16 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    seeAll: { fontSize: 12, fontWeight: '600', color: colors.brand },

    // Mini product card
    miniCard: { width: 140, backgroundColor: colors.dark3, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    miniImg: { width: '100%', height: 110 },
    miniBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
    miniBadgeTxt: { color: '#fff', fontSize: 8, fontWeight: '800' },
    miniInfo: { padding: 9, paddingBottom: 4 },
    miniName: { fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4, lineHeight: 15 },
    miniRating: { fontSize: 10, color: colors.textMuted },
    miniPrice: { fontSize: 13, fontWeight: '800', color: colors.text },
    miniDiscount: { fontSize: 9, fontWeight: '700', color: '#10b981', marginTop: 2 },
    miniAddBtn: { position: 'absolute', bottom: 9, right: 9, width: 26, height: 26, borderRadius: 8, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },

    // Checkout bar
    checkoutBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 28, backgroundColor: colors.dark2, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
    checkoutHelper: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
    totalDisplayAmt: { fontSize: 20, fontWeight: '900', color: colors.text },
    checkoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 20 },
    checkoutText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  });

}