import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, FlatList, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { COLORS, requireAuth } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt, makeCall } from '../../utils/helpers';
import { Card, StarRating, ActionRow, Badge, Chip, EmptyState, SectionHeader } from '../../components/ui';
import PaymentSheet from '../../components/payment/PaymentSheet';
import SearchHeader from '../../components/common/SearchHeader';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';

const TABS = ['Doctors', 'Lab Tests', 'Pharmacy', 'Mental Health'];

const DOCTORS_FALLBACK = [
  { id:'d1', name:'Dr. Akosua Asante',    specialty:'General Practitioner', rating:4.9, reviews:312, price:80,  avail:'Today 2 PM', img:'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&q=80', phone:'+233241000001' },
  { id:'d2', name:'Dr. Kwame Mensah',     specialty:'Cardiologist',         rating:4.8, reviews:178, price:150, avail:'Tomorrow 10 AM', img:'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&q=80', phone:'+233241000002' },
  { id:'d3', name:'Dr. Ama Osei',         specialty:'Paediatrician',        rating:4.7, reviews:245, price:120, avail:'Today 4 PM', img:'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=300&q=80', phone:'+233241000003' },
  { id:'d4', name:'Dr. Emmanuel Frimpong',specialty:'Dermatologist',        rating:4.9, reviews:89,  price:130, avail:'Today 5 PM', img:'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&q=80', phone:'+233241000004' },
  { id:'d5', name:'Dr. Grace Darko',      specialty:'Gynaecologist',        rating:4.8, reviews:201, price:160, avail:'Tomorrow 9 AM', img:'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=300&q=80', phone:'+233241000005' },
  { id:'d6', name:'Dr. Kofi Bonsu',       specialty:'Ophthalmologist',      rating:4.7, reviews:134, price:140, avail:'Today 3 PM', img:'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&q=80', phone:'+233241000006' },
];

const LAB_TESTS = [
  { id:'l1', name:'Complete Blood Count (CBC)', price:80,  time:'2 hrs',  icon:'🩸' },
  { id:'l2', name:'Malaria Rapid Test',          price:35,  time:'30 min', icon:'🦠' },
  { id:'l3', name:'COVID-19 PCR',                price:250, time:'24 hrs', icon:'🧫' },
  { id:'l4', name:'HbA1c (Diabetes)',            price:90,  time:'2 hrs',  icon:'💉' },
  { id:'l5', name:'Liver Function Tests',        price:100, time:'3 hrs',  icon:'🫀' },
  { id:'l6', name:'HIV / STI Screening',         price:150, time:'2 hrs',  icon:'🏥' },
  { id:'l7', name:'Thyroid Function (TSH/T4)',   price:120, time:'3 hrs',  icon:'⚗️' },
  { id:'l8', name:'Comprehensive Metabolic',     price:180, time:'4 hrs',  icon:'🔬' },
];

const MENTAL_HEALTH = [
  { id:'m1', name:'Anxiety & Stress Therapy',  price:120, icon:'😔', desc:'CBT sessions with licensed therapists' },
  { id:'m2', name:'Depression Counselling',     price:120, icon:'💙', desc:'Evidence-based depression treatment' },
  { id:'m3', name:'Couples Therapy',            price:180, icon:'💑', desc:'Strengthen bonds and communication' },
  { id:'m4', name:'Child & Teen Therapy',       price:100, icon:'🧒', desc:'Qualified child psychologists' },
  { id:'m5', name:'Addiction Recovery',         price:150, icon:'🌱', desc:'Substance & behavioural addiction support' },
];

const PHARMACY_ITEMS = [
  'Paracetamol 500mg','Amoxicillin 500mg','Metformin 500mg',
  'Omeprazole 20mg','Cetirizine 10mg','Vitamin C 1000mg',
  'Ibuprofen 400mg','Zinc Supplement','Iron Tablets',
  'Metronidazole 400mg','Multivitamins','Lisinopril 10mg',
];

export default function HealthScreen({ navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
const cartCount = useCartStore(s => s.count());
  const { user } = useAuthStore();
  const [tab,     setTab]     = useState('Doctors');
  const [search,  setSearch]  = useState('');
  const [doctors, setDoctors] = useState(DOCTORS_FALLBACK);
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);

  // Load real doctors from Supabase (providers with category=health)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, phone, rating, reviews_count, specialty, consultation_fee, availability, bio')
          .eq('role', 'provider')
          .eq('category', 'health')
          .eq('is_approved', true)
          .limit(20);

        if (data?.length) {
          setDoctors(data.map(d => ({
            id: d.id, name: d.full_name, specialty: d.specialty || 'General Practitioner',
            rating: d.rating || 4.7, reviews: d.reviews_count || 0,
            price: d.consultation_fee || 80, avail: d.availability || 'Today',
            img: d.avatar_url || DOCTORS_FALLBACK[0].img, phone: d.phone,
          })));
        }
      } catch {
        // Use fallback data
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = doctors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.specialty || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.screen}>
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {TABS.map(t => (
          <Chip key={t} label={t} active={tab === t} onPress={() => setTab(t)} color={colors.health} />
        ))}
      </ScrollView>

      {tab === 'Doctors' && (
        <>
          {/* Search */}
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search doctors, specialties…"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          {loading
  ? (
    <ActivityIndicator
      color={colors.health}
      style={{ marginTop: 40 }}
    />
  )
  : (
    <>
      <SearchHeader
        navigation={navigation}
        cartCount={cartCount}
      />

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 14 }}
        renderItem={({ item: doc }) => (
          <Card onPress={() => navigation.navigate('ProviderDetail', { provider: doc, type: 'health' })}>
            <Image source={{ uri: doc.img }} style={styles.docImg} />

            <View style={styles.docBody}>
              <View style={styles.docTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docSpecialty}>{doc.specialty}</Text>
                  <StarRating rating={doc.rating} reviews={doc.reviews} />
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.docPrice}>{fmt(doc.price)}</Text>
                  <Text style={styles.docPriceSub}>/session</Text>
                  <Badge label={doc.avail} color={colors.health} />
                </View>
              </View>

              <ActionRow
                onCall={() => makeCall(doc.phone)}
                onChat={() =>
                  requireAuth(
                    user,
                    navigation,
                    () => navigation.navigate('ChatDetail', {
                      providerId: doc.id,
                      name: doc.name,
                    })
                  )
                }
                onBook={() =>
                  setPayment({
                    name: `Consultation - ${doc.name}`,
                    price: doc.price,
                  })
                }
                bookLabel="Book Consult"
                bookColor={colors.health}
              />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="user-x"
            title="No doctors found"
            subtitle="Try a different search term"
          />
          }
        />
      </>
    )}
  </>
)}

      {tab === 'Lab Tests' && (
        <FlatList
          data={LAB_TESTS}
          keyExtractor={i => i.id}
          numColumns={2}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <Card style={{ flex: 1, padding: 16 }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</Text>
              <Text style={styles.labName}>{item.name}</Text>
              <Text style={styles.labTime}><Feather name="clock" size={11} /> {item.time}</Text>
              <Text style={styles.labPrice}>{fmt(item.price)}</Text>
              <TouchableOpacity
                onPress={() => setPayment({ name: item.name, price: item.price })}
                style={styles.bookLabBtn}
              >
                <Text style={styles.bookLabText}>Order Test</Text>
              </TouchableOpacity>
            </Card>
          )}
        />
      )}

      {tab === 'Pharmacy' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <SectionHeader title="💊 Common Medications" />
          <View style={styles.pharmGrid}>
            {PHARMACY_ITEMS.map(item => (
              <TouchableOpacity key={item} style={styles.pharmItem}>
                <Text style={styles.pharmText}>{item}</Text>
                <Feather name="shopping-cart" size={14} color={colors.brand} />
              </TouchableOpacity>
            ))}
          </View>
          <SectionHeader title="📦 Delivery Options" style={{ marginTop: 24 }} />
          <Card style={{ padding: 16, gap: 10 }}>
            {[
              { icon: 'zap', label: 'Express Delivery', time: '30–60 min', price: 'GH₵15' },
              { icon: 'package', label: 'Same Day', time: '2–4 hours', price: 'GH₵8' },
              { icon: 'truck', label: 'Standard', time: 'Next day', price: 'GH₵5' },
            ].map(o => (
              <View key={o.label} style={styles.deliveryOption}>
                <Feather name={o.icon} size={16} color={colors.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{o.label}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{o.time}</Text>
                </View>
                <Text style={{ color: colors.brand, fontWeight: '700' }}>{o.price}</Text>
              </View>
            ))}
          </Card>
        </ScrollView>
      )}

      {tab === 'Mental Health' && (
        <FlatList
          data={MENTAL_HEALTH}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListHeaderComponent={() => (
            <View style={styles.mentalHeader}>
              <Text style={styles.mentalTitle}>🧠 You're Not Alone</Text>
              <Text style={styles.mentalSub}>Connect with licensed therapists from the privacy of your home.</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <Card style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 32 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.labName}>{item.name}</Text>
                  <Text style={styles.mentalDesc}>{item.desc}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <Text style={styles.labPrice}>{fmt(item.price)} / session</Text>
                    <TouchableOpacity
                      onPress={() => setPayment({ name: item.name, price: item.price })}
                      style={styles.bookMentalBtn}
                    >
                      <Text style={styles.bookLabText}>Book Session</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      {payment && (
        <PaymentSheet
          visible
          amount={payment.price}
          title={payment.name}
          onSuccess={() => {
            setPayment(null);
            navigation.navigate('BookingConfirmed', { service: payment });
          }}
          onClose={() => setPayment(null)}
        />
      )}
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.dark },
  tabScroll:    { paddingVertical: 12, flexGrow: 0 },
  searchRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.dark3, borderRadius: 14, margin: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  searchInput:  { flex: 1, color: colors.text, fontSize: 14 },
  docImg:       { width: '100%', height: 160, resizeMode: 'cover' },
  docBody:      { padding: 14 },
  docTop:       { flexDirection: 'row', gap: 12, marginBottom: 12 },
  docName:      { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  docSpecialty: { color: colors.health, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  docPrice:     { color: colors.text, fontSize: 18, fontWeight: '800' },
  docPriceSub:  { color: colors.textMuted, fontSize: 11, marginBottom: 6 },
  labName:      { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  labTime:      { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  labPrice:     { color: colors.health, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  bookLabBtn:   { backgroundColor: colors.health, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  bookLabText:  { color: '#fff', fontWeight: '700', fontSize: 12 },
  pharmGrid:    { gap: 8 },
  pharmItem:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.dark3, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  pharmText:    { color: colors.text, fontSize: 14, fontWeight: '500' },
  deliveryOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  mentalHeader: { backgroundColor: colors.dark3, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  mentalTitle:  { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  mentalSub:    { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  mentalDesc:   { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  bookMentalBtn:{ backgroundColor: colors.health, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
});

}