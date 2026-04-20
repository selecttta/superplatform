import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  CATEGORIES, COLORS, PRODUCTS, DOCTORS,
  PROPERTIES, HOME_SERVICES,
} from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt } from '../../utils/helpers';

const { width: W } = Dimensions.get('window');

// ── Layout ───────────────────────────────────────────────────────────────────
// Sidebar:Panel = 1:3 ratio  —  panel is 3× wider than categories
const GAP = 8;
const PANEL_W = Math.floor(W * 3 / 4);   // 75% of screen for items
const CARD_W = Math.floor((PANEL_W - GAP * 4) / 3);


// ── Items per category ────────────────────────────────────────────────────────
function getCategoryItems(catId) {
  switch (catId) {
    case 'ecommerce':
      return PRODUCTS.map(p => ({
        id: p.id, name: p.name, img: p.img,
        badge: p.badge, screen: 'Ecommerce', product: p,
      }));
    case 'health':
      return DOCTORS.map(d => ({
        id: d.id, name: d.name, img: d.img,
        badge: d.badge, screen: 'Health',
      }));
    case 'real-estate':
      return PROPERTIES.map(p => ({
        id: p.id, name: p.name, img: p.img,
        badge: p.type, screen: 'RealEstate',
      }));
    case 'home-services':
      return HOME_SERVICES.map(s => ({
        id: s.id, name: s.name, img: null,
        badge: null, emoji: s.icon, screen: 'HomeServices',
      }));
    case 'transport':
      return [
        { id: 't1', name: 'Book a Ride', emoji: '🚗', badge: null, screen: 'Transport' },
        { id: 't2', name: 'Parcel Delivery', emoji: '📦', badge: 'Fast', screen: 'Transport' },
        { id: 't3', name: 'Airport Transfer', emoji: '✈️', badge: null, screen: 'Transport' },
        { id: 't4', name: 'Long-Distance Charter', emoji: '🚌', badge: null, screen: 'Transport' },
        { id: 't5', name: 'Motorbike Delivery', emoji: '🏍️', badge: 'Quick', screen: 'Transport' },
        { id: 't6', name: 'Moving Truck', emoji: '🚚', badge: null, screen: 'Transport' },
      ];
    case 'beauty':
      return [
        { id: 'b1', name: 'Hair Braiding', emoji: '💇', badge: null, screen: 'Beauty' },
        { id: 'b2', name: 'Full Glam Makeup', emoji: '💄', badge: 'Popular', screen: 'Beauty' },
        { id: 'b3', name: 'Manicure & Pedi', emoji: '💅', badge: null, screen: 'Beauty' },
        { id: 'b4', name: "Men's Barber", emoji: '💈', badge: null, screen: 'Beauty' },
        { id: 'b5', name: 'Lash Extensions', emoji: '👁️', badge: 'Hot', screen: 'Beauty' },
        { id: 'b6', name: 'Wedding Package', emoji: '💍', badge: 'Premium', screen: 'Beauty' },
      ];
    case 'rentals':
      return [
        { id: 'r1', name: 'Toyota Corolla', emoji: '🚗', badge: null, screen: 'Rentals' },
        { id: 'r2', name: 'Land Cruiser SUV', emoji: '🚙', badge: 'Popular', screen: 'Rentals' },
        { id: 'r3', name: 'Mercedes C-Class', emoji: '🏎️', badge: 'Luxury', screen: 'Rentals' },
        { id: 'r4', name: 'Event Hall', emoji: '🏛️', badge: null, screen: 'Rentals' },
        { id: 'r5', name: 'Generator Set 50KVA', emoji: '⚡', badge: null, screen: 'Rentals' },
        { id: 'r6', name: 'Party Canopy', emoji: '🎪', badge: null, screen: 'Rentals' },
      ];
    default:
      return [];
  }
}

// ── 3-column card (image if available, else emoji) ────────────────────────────
function ItemCard({ item, color, onPress, s }) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.82}>
      {item.img ? (
        <Image source={{ uri: item.img }} style={s.cardImg} resizeMode="cover" />
      ) : (
        <View style={[s.cardEmoji, { backgroundColor: color + '18' }]}>
          <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
        </View>
      )}
      {item.badge && (
        <View style={[s.cardBadge, {
          backgroundColor: item.badge === 'HOT' || item.badge === 'Hot' || item.badge === 'Popular'
            ? '#ef4444' : item.badge === 'NEW' ? '#10b981' : color,
        }]}>
          <Text style={s.cardBadgeTxt}>{item.badge}</Text>
        </View>
      )}
      <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
    </TouchableOpacity>
  );
}

export default function CategoriesScreen({ navigation }) {
  const { colors } = useTheme();
  const s = useStyles(colors);
  const [selected, setSelected] = useState(CATEGORIES[0]?.id || '');
  const items = getCategoryItems(selected);
  const activeCat = CATEGORIES.find(c => c.id === selected);
  const accentColor = activeCat?.color || colors.brand;

  return (
    <SafeAreaView style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Browse</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search')} style={s.searchBtn}>
          <Feather name="search" size={19} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={s.splitPane}>

        {/* ── LEFT: Text-only category list ────────────────────────── */}
        <ScrollView
          style={s.sidebar}
          showsVerticalScrollIndicator={false}
        >
          {CATEGORIES.map(cat => {
            const active = selected === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelected(cat.id)}
                style={[
                  s.sideItem,
                  active && { backgroundColor: cat.color + '18', borderLeftColor: cat.color },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    s.sideTxt,
                    { color: active ? cat.color : COLORS.textMuted },
                    active && { fontWeight: '800' },
                  ]}
                  numberOfLines={3}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 60 }} />
        </ScrollView>

        {/* ── RIGHT: 3-column image+name grid ──────────────────────── */}
        <View style={s.mainPanel}>

          {/* Banner */}
          <View style={[s.banner, {
            backgroundColor: accentColor + '12',
            borderBottomColor: accentColor + '22',
          }]}>
            <Text style={[s.bannerName, { color: accentColor }]}>
              {activeCat?.icon} {activeCat?.name}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(activeCat?.screen || 'Ecommerce')}
              style={[s.viewAllBtn, { backgroundColor: accentColor }]}
            >
              <Text style={s.viewAllTxt}>View All</Text>
              <Feather name="arrow-right" size={11} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* 3-column grid */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.gridWrap}>
            {items.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>{activeCat?.icon}</Text>
                <Text style={s.emptyTxt}>Coming Soon</Text>
                <TouchableOpacity
                  style={[s.goBtn, { backgroundColor: accentColor }]}
                  onPress={() => navigation.navigate(activeCat?.screen)}
                >
                  <Text style={s.goBtnTxt}>Explore →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.grid}>
                {items.map(item => (
                  <ItemCard
                    key={String(item.id)}
                    item={item}
                    color={accentColor}
                    s={s}
                    onPress={() => {
                      if (item.product) {
                        navigation.navigate('ProductDetail', { product: item.product });
                      } else {
                        navigation.navigate(item.screen);
                      }
                    }}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}


function useStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.dark },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    title: { fontSize: 20, fontWeight: '800', color: colors.text },
    searchBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.bgSecondary || 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },

    // Split pane
    splitPane: { flex: 1, flexDirection: 'row' },

    // ── Sidebar (flex:1 = 25% of screen) ───────────────────────────────────────
    sidebar: { flex: 1, backgroundColor: colors.dark2 || colors.bgCard || '#111118', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)' },
    sideItem: {
      paddingVertical: 14,
      paddingHorizontal: 6,
      marginBottom: 2,
      justifyContent: 'center',
      alignItems: 'center',
      borderLeftWidth: 3,
      borderLeftColor: 'transparent',
    },
    sideTxt: { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 14 },

    // ── Main panel (flex:3 = 75% of screen) ────────────────────────────────
    mainPanel: { flex: 3, backgroundColor: colors.dark },

    // Banner
    banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 9, borderBottomWidth: 1 },
    bannerName: { fontSize: 13, fontWeight: '800', color: colors.text },
    viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 5 },
    viewAllTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },

    // 3-column grid
    gridWrap: { padding: GAP, paddingBottom: 80 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },

    // Card
    card: {
      width: CARD_W,
      backgroundColor: colors.dark3 || colors.bgInput || 'rgba(255,255,255,0.03)',
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    cardImg: { width: '100%', height: CARD_W, resizeMode: 'cover' },
    cardEmoji: { width: '100%', height: CARD_W, alignItems: 'center', justifyContent: 'center' },
    cardBadge: { position: 'absolute', top: 5, left: 5, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    cardBadgeTxt: { color: '#fff', fontSize: 8, fontWeight: '800' },
    cardName: { fontSize: 10, fontWeight: '700', color: colors.text, paddingHorizontal: 6, paddingVertical: 7, lineHeight: 13 },

    // Empty
    emptyState: { alignItems: 'center', paddingTop: 50 },
    emptyTxt: { fontSize: 15, fontWeight: '700', color: colors.textMuted, marginBottom: 14 },
    goBtn: { borderRadius: 11, paddingHorizontal: 18, paddingVertical: 9 },
    goBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  });
}
