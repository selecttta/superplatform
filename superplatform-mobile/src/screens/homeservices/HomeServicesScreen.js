/**
 * HomeServicesScreen — Plumbing, Electrical, Carpentry, Appliance Repair, etc.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { COLORS, requireAuth } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt, makeCall } from '../../utils/helpers';
import { Card, StarRating, ActionRow, Badge, Chip, SectionHeader } from '../../components/ui';
import PaymentSheet from '../../components/payment/PaymentSheet';
import SearchHeader from '../../components/common/SearchHeader';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';

const SERVICES = [
  { id:1,  name:'Plumbing',         icon:'🔧', price:120 },
  { id:2,  name:'Electrical',       icon:'⚡', price:180 },
  { id:3,  name:'Cleaning',         icon:'🧹', price:100 },
  { id:4,  name:'AC Service',       icon:'❄️', price:160 },
  { id:5,  name:'Painting',         icon:'🎨', price:200 },
  { id:6,  name:'Carpentry',        icon:'🪚', price:150 },
  { id:7,  name:'Pest Control',     icon:'🐛', price:130 },
  { id:8,  name:'Security & CCTV',  icon:'🔐', price:250 },
  { id:9,  name:'Appliance Repair', icon:'🔌', price:110 },
  { id:10, name:'Carpenter',        icon:'🪑', price:140 },
  { id:11, name:'Plumber',          icon:'🚿', price:100 },
  { id:12, name:'Handyman',         icon:'🛠️', price:80  },
];

const PROVIDERS_FB = [
  { id:'h1', name:'FIX-IT Ghana',        specialty:'Plumbing & Electrical', rating:4.9, jobs:847,  loc:'All Accra',    price:120, phone:'+233241111001', img:'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80' },
  { id:'h2', name:'SparkSafe Electric',  specialty:'Electrical Work',       rating:4.8, jobs:612,  loc:'East Legon',   price:180, phone:'+233241111002', img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
  { id:'h3', name:'CleanRight Services', specialty:'Cleaning & Laundry',    rating:4.7, jobs:1203, loc:'Greater Accra',price:100, phone:'+233241111003', img:'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80' },
  { id:'h4', name:'MasterCraft Carp.',   specialty:'Carpentry & Furniture',  rating:4.7, jobs:314,  loc:'Greater Accra',price:150, phone:'+233241111007', img:'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80' },
  { id:'h5', name:'AppliancePro GH',    specialty:'Appliance Repair',       rating:4.6, jobs:412,  loc:'All Accra',    price:130, phone:'+233241111008', img:'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80' },
  { id:'h6', name:'PaintPro Ghana',      specialty:'Painting & Décor',      rating:4.6, jobs:215,  loc:'Greater Accra',price:200, phone:'+233241111005', img:'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80' },
];

export default function HomeServicesScreen({ navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
const cartCount = useCartStore(s => s.count());
  const { user } = useAuthStore();
  const [providers, setProviders] = useState(PROVIDERS_FB);
  const [selected,  setSelected]  = useState(null);
  const [payment,   setPayment]   = useState(null);
  const [refreshing,setRefreshing]= useState(false);

  const load = async () => {
    try {
      const { data } = await supabase
        .from('profiles').select('id, full_name, avatar_url, phone, rating, reviews_count, specialty, base_price, location')
        .eq('role','provider').eq('category','home-services').eq('is_approved',true);
      if (data?.length) setProviders(data.map(d => ({
        id: d.id, name: d.full_name, specialty: d.specialty || 'Home Services',
        rating: d.rating || 4.7, jobs: d.reviews_count || 0,
        loc: d.location || 'Accra', price: d.base_price || 100,
        phone: d.phone, img: d.avatar_url || PROVIDERS_FB[0].img,
      })));
    } catch {}
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: colors.dark }}>
      <SearchHeader navigation={navigation} placeholder="Search home services…" cartCount={cartCount} />
      <FlatList
        data={providers}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.services} />}
        ListHeaderComponent={() => (
          <View>
            <SectionHeader title="🔧 What do you need?" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
              {SERVICES.map(s => (
                <TouchableOpacity key={s.id} onPress={() => setSelected(s)}
                  style={[styles.svcChip, selected?.id === s.id && { backgroundColor: colors.services + '30', borderColor: colors.services }]}>
                  <Text style={{ fontSize: 18 }}>{s.icon}</Text>
                  <Text style={[styles.svcChipText, selected?.id === s.id && { color: colors.services }]}>{s.name}</Text>
                  <Text style={{ color: colors.brand, fontSize: 10, fontWeight: '700' }}>from {fmt(s.price)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selected && (
              <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderColor: colors.services + '50' }}>
                <Text style={{ fontSize: 24, marginRight: 12 }}>{selected.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{selected.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>Starting from {fmt(selected.price)}</Text>
                </View>
                <TouchableOpacity onPress={() => setPayment({ name: selected.name, price: selected.price })}
                  style={{ backgroundColor: colors.services, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Book →</Text>
                </TouchableOpacity>
              </Card>
            )}
            <SectionHeader title="⭐ Top Providers" />
          </View>
        )}
        renderItem={({ item: prov }) => (
          <Card onPress={() => navigation.navigate('ProviderDetail', { provider: prov, type: 'home-service' })}>
            <Image source={{ uri: prov.img }} style={styles.provImg} />
            <View style={styles.provBody}>
              <View style={styles.provTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.provName}>{prov.name}</Text>
                  <Text style={styles.provSpec}>{prov.specialty}</Text>
                  <StarRating rating={prov.rating} reviews={prov.jobs} size={11} />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{fmt(prov.price)}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10, marginBottom: 4 }}>from / job</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <Feather name="map-pin" size={10} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{prov.loc}</Text>
                  </View>
                </View>
              </View>
              <ActionRow
                onCall={() => makeCall(prov.phone)}
                onChat={() => requireAuth(user, navigation, () => navigation.navigate('ChatDetail', { providerId: prov.id, name: prov.name }))}
                onBook={() => setPayment({ name: `${prov.specialty} by ${prov.name}`, price: prov.price })}
                bookLabel="Book Pro"
                bookColor={colors.services}
              />
            </View>
          </Card>
        )}
      />
      {payment && (
        <PaymentSheet visible amount={payment.price} title={payment.name}
          onSuccess={() => setPayment(null)} onClose={() => setPayment(null)} />
      )}
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  svcChip:     { alignItems: 'center', gap: 2, backgroundColor: colors.dark3, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border, minWidth: 80 },
  svcChipText: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  provImg:     { width: '100%', height: 140, resizeMode: 'cover' },
  provBody:    { padding: 14 },
  provTop:     { flexDirection: 'row', gap: 12, marginBottom: 4 },
  provName:    { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  provSpec:    { color: colors.services, fontSize: 12, fontWeight: '600', marginBottom: 4 },
});

}