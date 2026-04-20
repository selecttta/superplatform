import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { COLORS, requireAuth } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt, makeCall } from '../../utils/helpers';
import { Card, StarRating, ActionRow, Badge, Chip, SectionHeader, EmptyState } from '../../components/ui';
import PaymentSheet from '../../components/payment/PaymentSheet';
import SearchHeader from '../../components/common/SearchHeader';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';

const TABS = ['Salons', 'Services', 'Fashion'];
const BEAUTY_SERVICES = [
  { id:'b1', name:'Hair Braiding',      icon:'💇', price:80,  desc:'All braiding styles — knotless, box, twists' },
  { id:'b2', name:'Makeup — Full Glam', icon:'💄', price:200, desc:'Professional makeup for any occasion' },
  { id:'b3', name:'Manicure & Pedicure',icon:'💅', price:60,  desc:'Gel, acrylic & natural nail services' },
  { id:'b4', name:"Men's Barber",       icon:'💈', price:40,  desc:'Fade, taper, shape-up & beard trim' },
  { id:'b5', name:'Hairdresser',        icon:'✂️', price:65,  desc:'Cut, colour, relaxer & treatment' },
  { id:'b6', name:'Lash Extensions',   icon:'👁️', price:150, desc:'Classic, volume & hybrid lash sets' },
  { id:'b7', name:'Tailor / Dressmaker',icon:'🧵', price:120, desc:'Bespoke clothing — Ankara, kente & modern' },
  { id:'b8', name:'Fashion Stylist',   icon:'👗', price:200, desc:'Personal shopping & style consultation' },
  { id:'b9', name:'Skincare Facial',   icon:'🧖', price:120, desc:'Deep cleanse, exfoliation & mask treatment' },
];

const SALONS_FB = [
  { id:'s1', name:'Glam Studio',         loc:'East Legon',  rating:4.9, reviews:412, specialty:'Hair & Makeup',    price:80,  open:true,  phone:'+233241222001', img:'https://images.unsplash.com/photo-1560066984-138daaa4e4e0?w=400&q=80' },
  { id:'s2', name:'Royal Cuts',          loc:'Osu',         rating:4.8, reviews:231, specialty:"Men's Grooming",   price:35,  open:true,  phone:'+233241222002', img:'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80' },
  { id:'s3', name:'Stitched by Adwoa',   loc:'Labone',      rating:4.9, reviews:167, specialty:'Tailor & Stylist',  price:120, open:true,  phone:'+233241222003', img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
  { id:'s4', name:'Nail Paradise',       loc:'Accra Mall',  rating:4.9, reviews:167, specialty:'Nail Art',         price:50,  open:true,  phone:'+233241222004', img:'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80' },
  { id:'s5', name:'Beauty Bliss Spa',    loc:'Airport Res.',rating:4.7, reviews:188, specialty:'Full Service Spa',  price:60,  open:false, phone:'+233241222005', img:'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80' },
  { id:'s6', name:'Style by Esi',        loc:'Cantonments', rating:4.8, reviews:98,  specialty:'Fashion Styling',  price:200, open:true,  phone:'+233241222006', img:'https://images.unsplash.com/photo-1487412947147-5cebf100d7fb?w=400&q=80' },
];

const FASHION_ITEMS = [
  { id:'f1', name:'Premium Ankara Set',  price:280, img:'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80' },
  { id:'f2', name:'Kente Cloth (6yds)', price:420, img:'https://images.unsplash.com/photo-1520369170823-7e78f2c85e7c?w=400&q=80' },
  { id:'f3', name:'Corporate Suit',      price:680, img:'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80' },
  { id:'f4', name:'Designer Handbag',    price:320, img:'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80' },
];

export default function BeautyScreen({ navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
const cartCount = useCartStore(s => s.count());
  const { user } = useAuthStore();
  const [tab,     setTab]     = useState('Salons');
  const [salons,  setSalons]  = useState(SALONS_FB);
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, phone, rating, reviews_count, specialty, base_price, location, is_online')
          .eq('role', 'provider').eq('category', 'beauty').eq('is_approved', true);
        if (data?.length) setSalons(data.map(d => ({
          id: d.id, name: d.full_name, loc: d.location || 'Accra',
          rating: d.rating || 4.7, reviews: d.reviews_count || 0,
          specialty: d.specialty || 'Beauty Services', price: d.base_price || 80,
          open: d.is_online ?? true, phone: d.phone,
          img: d.avatar_url || SALONS_FB[0].img,
        })));
      } catch {}
    })();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {TABS.map(t => <Chip key={t} label={t} active={tab === t} onPress={() => setTab(t)} color={colors.beauty} />)}
      </ScrollView>

      {/* ── SALONS ─────────────────────────────────────────────── */}
      {tab === 'Salons' && (
        <>
          <SearchHeader navigation={navigation} cartCount={cartCount} />
        <FlatList
            data={salons}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, gap: 14 }}
            renderItem={({ item: salon }) => (
              <Card onPress={() => navigation.navigate('ProviderDetail', { provider: salon, type: 'beauty' })}>
                <Image source={{ uri: salon.img }} style={styles.salonImg} />
                <View style={styles.salonBody}>
                  <View style={styles.salonTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.salonName}>{salon.name}</Text>
                      <Text style={styles.salonSpec}>{salon.specialty}</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                        <StarRating rating={salon.rating} reviews={salon.reviews} size={11} />
                        <Badge label={salon.open ? 'Open Now' : 'Closed'} color={salon.open ? '#10b981' : '#6b7280'} />
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.fromText}>from</Text>
                      <Text style={styles.price}>{fmt(salon.price)}</Text>
                      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                        <Feather name="map-pin" size={10} color={colors.textMuted} />
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>{salon.loc}</Text>
                      </View>
                    </View>
                  </View>
                  <ActionRow
                    onCall={() => makeCall(salon.phone)}
                    onChat={() => requireAuth(user, navigation, () => navigation.navigate('ChatDetail', { providerId: salon.id, name: salon.name }))}
                    onBook={() => setPayment({ name: `Appointment at ${salon.name}`, price: salon.price })}
                    bookLabel="Book Now"
                    bookColor={colors.beauty}
                  />
                </View>
              </Card>
            )}
          />
        </>
      )}

      {/* ── SERVICES ───────────────────────────────────────────── */}
      {tab === 'Services' && (
        <FlatList
          data={BEAUTY_SERVICES}
          numColumns={2}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <Card style={{ flex: 1, padding: 14 }}>
              <Text style={{ fontSize: 28, marginBottom: 6 }}>{item.icon}</Text>
              <Text style={styles.svcName}>{item.name}</Text>
              <Text style={styles.svcDesc} numberOfLines={2}>{item.desc}</Text>
              <Text style={[styles.price, { marginTop: 6, marginBottom: 10 }]}>{fmt(item.price)}</Text>
              <TouchableOpacity
                onPress={() => setPayment({ name: item.name, price: item.price })}
                style={[styles.bookBtn, { backgroundColor: colors.beauty }]}
              >
                <Text style={styles.bookBtnText}>Book</Text>
              </TouchableOpacity>
            </Card>
          )}
        />
      )}

      {/* ── FASHION ────────────────────────────────────────────── */}
      {tab === 'Fashion' && (
        <FlatList
          data={FASHION_ITEMS}
          numColumns={2}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <Card style={{ flex: 1 }}>
              <Image source={{ uri: item.img }} style={{ width: '100%', aspectRatio: 1, resizeMode: 'cover' }} />
              <View style={{ padding: 10 }}>
                <Text style={styles.svcName} numberOfLines={2}>{item.name}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={styles.price}>{fmt(item.price)}</Text>
                  <TouchableOpacity style={[styles.bookBtn, { backgroundColor: colors.beauty, paddingHorizontal: 12, paddingVertical: 6 }]}
                    onPress={() => setPayment({ name: item.name, price: item.price })}>
                    <Text style={styles.bookBtnText}>Buy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      {payment && (
        <PaymentSheet
          visible amount={payment.price} title={payment.name}
          onSuccess={() => { setPayment(null); }}
          onClose={() => setPayment(null)}
        />
      )}
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.dark },
  tabScroll: { flexGrow: 0, paddingVertical: 12 },
  salonImg:  { width: '100%', height: 160, resizeMode: 'cover' },
  salonBody: { padding: 14 },
  salonTop:  { flexDirection: 'row', gap: 12, marginBottom: 4 },
  salonName: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  salonSpec: { color: colors.beauty, fontSize: 12, fontWeight: '600' },
  fromText:  { color: colors.textMuted, fontSize: 10 },
  price:     { color: colors.text, fontSize: 16, fontWeight: '800' },
  svcName:   { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  svcDesc:   { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  bookBtn:   { borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  bookBtnText:{ color: '#fff', fontWeight: '700', fontSize: 12 },
});

}