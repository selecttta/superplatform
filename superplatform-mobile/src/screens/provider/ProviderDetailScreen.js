import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  FlatList, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS, requireAuth } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt, makeCall } from '../../utils/helpers';
import { Card, StarRating, Badge, Button, Divider, Avatar } from '../../components/ui';
import PaymentSheet from '../../components/payment/PaymentSheet';

const { width: SCREEN_W } = Dimensions.get('window');

// Reviews are fetched from Supabase in useEffect below — no mock data

export default function ProviderDetailScreen({ route, navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
const { provider, type = 'general' } = route.params || {};
  const { user } = useAuthStore();
  const [imgIdx,   setImgIdx]   = useState(0);
  const [tab,      setTab]      = useState('services');
  const [reviews,  setReviews]  = useState([]);
  const [services, setServices] = useState([]);
  const [payment,  setPayment]  = useState(null);
  const [booking,  setBooking]  = useState(null);
  const scrollRef = useRef(null);

  // Build image gallery from provider data
  const images = [
    provider?.img || provider?.images?.[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&q=80',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80',
  ];

  // Default services based on provider type
  const DEFAULT_SERVICES = {
    driver:      [{ id:1, name:'Standard Ride', price:45, desc:'Comfortable sedan, up to 4 passengers' }, { id:2, name:'Airport Transfer', price:150, desc:'To/from Kotoka International Airport' }],
    health:      [{ id:1, name:'Consultation',  price:provider?.price || 80, desc:'Online or in-person medical consultation' }],
    beauty:      [{ id:1, name:'Appointment',   price:provider?.price || 80, desc:'Full service appointment at the salon' }],
    'home-service':[{ id:1, name:'Service Call', price:provider?.price || 100, desc:'Standard call-out and service' }],
    'real-estate':[{ id:1, name:'Viewing',      price:0, desc:'Schedule a property viewing' }],
    general:     [{ id:1, name:'Service',       price:provider?.price || 100, desc:'Standard service package' }],
  };

  useEffect(() => {
    // Load provider services from Supabase if available
    (async () => {
      if (!provider?.id) return;
      try {
        const { data } = await supabase
          .from('listings')
          .select('*')
          .eq('user_id', provider.id)
          .eq('status', 'approved');
        if (data?.length) {
          setServices(data.map(d => ({ id: d.id, name: d.title, price: d.price, desc: d.description })));
          return;
        }
      } catch {}
      setServices(DEFAULT_SERVICES[type] || DEFAULT_SERVICES.general);
    })();

    // Load reviews from Supabase
    (async () => {
      if (!provider?.id) return;
      try {
        const { data } = await supabase
          .from('reviews')
          .select('*, profiles(full_name)')
          .eq('provider_id', provider.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (data?.length) {
          setReviews(data.map(d => ({
            id: d.id, name: d.profiles?.full_name || 'Customer',
            rating: d.rating, comment: d.comment,
            date: new Date(d.created_at).toLocaleDateString(),
          })));
        }
      } catch {}
    })();
  }, [provider?.id, type]);

  const accentColor = {
    driver: '#3b82f6', health: colors.health, beauty: colors.beauty,
    'home-service': colors.services, 'real-estate': colors.realestate,
  }[type] || colors.brand;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
      <ScrollView>
        {/* ── Image Gallery ─────────────────────────────────── */}
        <View style={styles.gallery}>
          <ScrollView
            ref={scrollRef}
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
          >
            {images.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={[styles.galleryImg, { width: SCREEN_W }]} />
            ))}
          </ScrollView>

          {/* Back button */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Dot indicators */}
          <View style={styles.galleryDots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === imgIdx && styles.dotActive]} />
            ))}
          </View>
        </View>

        <View style={{ padding: 16, gap: 16 }}>
          {/* ── Provider Header ───────────────────────────────── */}
          <Card style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <Avatar uri={provider?.img} name={provider?.name} size={60} />
              <View style={{ flex: 1 }}>
                <Text style={styles.provName}>{provider?.name || 'Provider'}</Text>
                {provider?.specialty && <Text style={[styles.provSpec, { color: accentColor }]}>{provider.specialty}</Text>}
                {provider?.car && <Text style={styles.provSpec}>{provider.car} · {provider?.plate}</Text>}
                <StarRating rating={provider?.rating || 4.8} reviews={provider?.trips || provider?.reviews || provider?.jobs} />
              </View>
            </View>

            {provider?.loc && (
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={13} color={colors.textMuted} />
                <Text style={styles.locationText}>{provider.loc}</Text>
              </View>
            )}

            {/* Trust badges */}
            <View style={styles.trustRow}>
              {[
                { icon:'check-circle', label:'Verified', color:'#10b981' },
                { icon:'shield', label:'Background Checked', color:'#3b82f6' },
                { icon:'star', label:`${provider?.rating || 4.8}★`, color:'#f59e0b' },
              ].map(b => (
                <View key={b.label} style={styles.trustBadge}>
                  <Feather name={b.icon} size={12} color={b.color} />
                  <Text style={[styles.trustText, { color: b.color }]}>{b.label}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* ── Tabs ─────────────────────────────────────────── */}
          <View style={styles.tabs}>
            {['services', 'reviews', 'about'].map(t => (
              <TouchableOpacity key={t} onPress={() => setTab(t)}
                style={[styles.tabBtn, tab === t && { backgroundColor: accentColor }]}>
                <Text style={[styles.tabBtnText, tab === t && { color: '#fff' }]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Services Tab ──────────────────────────────────── */}
          {tab === 'services' && (
            <View style={{ gap: 10 }}>
              {services.map(svc => (
                <Card key={svc.id} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{svc.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{svc.desc}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{fmt(svc.price)}</Text>
                    <TouchableOpacity onPress={() => setPayment({ name: svc.name, price: svc.price })}
                      style={[styles.bookSvcBtn, { backgroundColor: accentColor }]}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Book</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {/* ── Reviews Tab ───────────────────────────────────── */}
          {tab === 'reviews' && (
            <View style={{ gap: 10 }}>
              {/* Rating summary */}
              <Card style={{ padding: 16, flexDirection: 'row', gap: 20, alignItems: 'center' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: colors.text, fontSize: 40, fontWeight: '800' }}>{provider?.rating || 4.8}</Text>
                  <StarRating rating={provider?.rating || 4.8} size={14} />
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>{reviews.length} reviews</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  {[5,4,3,2,1].map(n => (
                    <View key={n} style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                      <Text style={{ color:colors.textMuted, fontSize:12, width:8 }}>{n}</Text>
                      <View style={{ flex:1, height:4, backgroundColor:colors.dark4, borderRadius:2 }}>
                        <View style={{ width:`${n >= 4 ? n * 18 : n * 5}%`, height:4, backgroundColor:'#f59e0b', borderRadius:2 }} />
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
              {reviews.map(r => (
                <Card key={r.id} style={{ padding: 14, gap: 8 }}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                      <Avatar name={r.name} size={36} />
                      <Text style={{ color:colors.text, fontWeight:'600' }}>{r.name}</Text>
                    </View>
                    <View style={{ alignItems:'flex-end', gap:2 }}>
                      <StarRating rating={r.rating} size={12} />
                      <Text style={{ color:colors.textMuted, fontSize:11 }}>{r.date}</Text>
                    </View>
                  </View>
                  <Text style={{ color:colors.textMuted, fontSize:13, lineHeight:18 }}>{r.comment}</Text>
                </Card>
              ))}
            </View>
          )}

          {/* ── About Tab ─────────────────────────────────────── */}
          {tab === 'about' && (
            <Card style={{ padding: 16, gap: 12 }}>
              <Text style={{ color:colors.text, fontWeight:'700', fontSize:16 }}>About</Text>
              <Text style={{ color:colors.textMuted, fontSize:14, lineHeight:22 }}>
                Professional provider on SuperPlatform GH with a proven track record of delivering excellent service.
                All providers are verified with valid ID documents and background checks before going live on the platform.
              </Text>
              <Divider />
              {[
                { label:'Member Since',    value:'Jan 2023' },
                { label:'Response Time',   value:'< 5 min' },
                { label:'Languages',       value:'English, Twi' },
                { label:'Service Area',    value:'Greater Accra' },
                { label:'Total Jobs',      value:(provider?.trips || provider?.jobs || provider?.reviews || 100).toLocaleString() },
              ].map(f => (
                <View key={f.label} style={{ flexDirection:'row', justifyContent:'space-between', paddingVertical:6 }}>
                  <Text style={{ color:colors.textMuted, fontSize:13 }}>{f.label}</Text>
                  <Text style={{ color:colors.text, fontWeight:'600', fontSize:13 }}>{f.value}</Text>
                </View>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>

      {/* ── Fixed bottom bar ─────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={{ color:colors.textMuted, fontSize:11 }}>Starting from</Text>
          <Text style={{ color:colors.text, fontSize:22, fontWeight:'800' }}>{fmt(provider?.price || services[0]?.price || 0)}</Text>
        </View>
        <View style={{ flexDirection:'row', gap:10 }}>
          <TouchableOpacity onPress={() => makeCall(provider?.phone)} style={[styles.iconBtn, { backgroundColor: '#10b98120' }]}>
            <Feather name="phone" size={20} color="#10b981" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => requireAuth(user, navigation, () => navigation.navigate('ChatDetail', { providerId: provider?.id, name: provider?.name }))}
            style={[styles.iconBtn, { backgroundColor: '#3b82f620' }]}>
            <Feather name="message-circle" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => requireAuth(user, navigation, () => setPayment({ name: `${provider?.name} — Service`, price: provider?.price || services[0]?.price || 0 }))}
            style={[styles.bookNowBtn, { backgroundColor: accentColor }]}>
            <Text style={styles.bookNowText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {payment && (
        <PaymentSheet
          visible amount={payment.price} title={payment.name}
          onSuccess={() => {
            setPayment(null);
            Alert.alert('✅ Booked!', 'Your booking was confirmed. The provider will contact you shortly.');
          }}
          onClose={() => setPayment(null)}
        />
      )}
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  gallery:      { position:'relative', height:280 },
  galleryImg:   { height:280, resizeMode:'cover' },
  backBtn:      { position:'absolute', top:16, left:16, width:38, height:38, borderRadius:19, backgroundColor:'rgba(0,0,0,0.5)', alignItems:'center', justifyContent:'center' },
  galleryDots:  { position:'absolute', bottom:12, alignSelf:'center', flexDirection:'row', gap:6 },
  dot:          { width:6, height:6, borderRadius:3, backgroundColor:'rgba(255,255,255,0.4)' },
  dotActive:    { width:20, backgroundColor:'#fff' },
  provName:     { color:colors.text, fontSize:20, fontWeight:'800', marginBottom:2 },
  provSpec:     { color:colors.brand, fontSize:13, fontWeight:'600', marginBottom:4 },
  locationRow:  { flexDirection:'row', alignItems:'center', gap:6, marginTop:12 },
  locationText: { color:colors.textMuted, fontSize:13 },
  trustRow:     { flexDirection:'row', gap:10, flexWrap:'wrap', marginTop:12 },
  trustBadge:   { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:colors.dark4, borderRadius:8, paddingHorizontal:8, paddingVertical:4 },
  trustText:    { fontSize:11, fontWeight:'600' },
  tabs:         { flexDirection:'row', gap:8 },
  tabBtn:       { flex:1, alignItems:'center', paddingVertical:10, borderRadius:12, backgroundColor:colors.dark3, borderWidth:1, borderColor:colors.border },
  tabBtnText:   { color:colors.textMuted, fontWeight:'700', fontSize:13, textTransform:'capitalize' },
  bookSvcBtn:   { borderRadius:10, paddingHorizontal:14, paddingVertical:8 },
  bottomBar:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderTopWidth:1, borderTopColor:colors.border, backgroundColor:colors.dark2 },
  iconBtn:      { width:46, height:46, borderRadius:14, alignItems:'center', justifyContent:'center' },
  bookNowBtn:   { paddingHorizontal:24, paddingVertical:13, borderRadius:14, justifyContent:'center', alignItems:'center' },
  bookNowText:  { color:'#fff', fontWeight:'800', fontSize:15 },
});

}