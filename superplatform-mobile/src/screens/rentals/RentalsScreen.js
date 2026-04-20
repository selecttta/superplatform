import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { COLORS, requireAuth } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt, makeCall } from '../../utils/helpers';
import { Card, Chip, ActionRow, Badge } from '../../components/ui';
import PaymentSheet from '../../components/payment/PaymentSheet';
import SearchHeader from '../../components/common/SearchHeader';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';

const TABS = ['Cars', 'Equipment', 'Event Spaces'];

const CARS_FB = [
  { id:'c1', name:'Toyota Corolla 2022',      price:250, fuel:'Petrol', seats:5, trans:'Automatic', avail:true, img:'https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=400&q=80', phone:'+233241444001' },
  { id:'c2', name:'Toyota Land Cruiser 2023', price:800, fuel:'Diesel', seats:7, trans:'Automatic', avail:true, img:'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=400&q=80', phone:'+233241444002' },
  { id:'c3', name:'Mercedes C-Class 2023',    price:1200,fuel:'Petrol', seats:5, trans:'Automatic', avail:true, img:'https://images.unsplash.com/photo-1617531653332-bd46c16f4d68?w=400&q=80', phone:'+233241444003' },
  { id:'c4', name:'Toyota Hilux 2022',        price:600, fuel:'Diesel', seats:5, trans:'Manual',    avail:true, img:'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&q=80', phone:'+233241444004' },
];

const EQUIPMENT_FB = [
  { id:'e1', name:'Generator 10KVA',      price:200, icon:'⚡', desc:'Perfect for events up to 200 guests' },
  { id:'e2', name:'Cement Mixer',         price:120, icon:'🔄', desc:'Heavy duty, 2 cubic meter capacity' },
  { id:'e3', name:'Pressure Washer',      price:80,  icon:'💧', desc:'Industrial grade, diesel powered' },
  { id:'e4', name:'Scaffolding Set (20m)',price:180, icon:'🏗️', desc:'Complete set with safety boards' },
];

const SPACES_FB = [
  { id:'sp1', name:'The Grand Ballroom',  price:5000, capacity:500, img:'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=80' },
  { id:'sp2', name:'Rooftop Terrace',     price:2000, capacity:150, img:'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=80' },
  { id:'sp3', name:'Conference Room A',   price:800,  capacity:50,  img:'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80' },
];

export default function RentalsScreen({ navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
const cartCount = useCartStore(s => s.count());
  const { user } = useAuthStore();
  const [tab, setTab] = useState('Cars');
  const [cars, setCars] = useState(CARS_FB);
  const [payment, setPayment] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('category', 'rentals')
        .eq('status', 'approved');

      if (data?.length) {
        setCars(data.map(d => ({
          id: d.id,
          name: d.title,
          price: d.price,
          fuel: d.fuel_type,
          seats: d.seats,
          trans: d.transmission,
          avail: d.available ?? true,
          img: d.images?.[0] || CARS_FB[0].img,
          phone: d.contact_phone,
        })));
      }
    } catch {}
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: colors.dark }}>
      <View style={{ flexDirection:'row', gap:8, padding:16, paddingBottom:4 }}>
        {TABS.map(t => (
          <Chip key={t} label={t} active={tab === t} onPress={() => setTab(t)} color={colors.rentals} />
        ))}
      </View>

      {tab === 'Cars' && (
        <>
          <SearchHeader navigation={navigation} cartCount={cartCount} />

          <FlatList
            data={cars}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding:16, gap:16 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.rentals}
              />
            }
            renderItem={({ item: car }) => (
              <Card>
                <Image source={{ uri: car.img }} style={styles.carImg} />

                {!car.avail && (
                  <View style={styles.unavailOverlay}>
                    <Text style={styles.unavailText}>Not Available</Text>
                  </View>
                )}

                <View style={styles.carBody}>
                  <Text style={styles.carName}>{car.name}</Text>

                  <View style={styles.carStats}>
                    <View style={styles.carStat}>
                      <Feather name="users" size={12} color={colors.textMuted} />
                      <Text style={styles.carStatText}>{car.seats} seats</Text>
                    </View>
                    <View style={styles.carStat}>
                      <Feather name="zap" size={12} color={colors.textMuted} />
                      <Text style={styles.carStatText}>{car.fuel}</Text>
                    </View>
                    <View style={styles.carStat}>
                      <Feather name="settings" size={12} color={colors.textMuted} />
                      <Text style={styles.carStatText}>{car.trans}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
                    <View>
                      <Text style={styles.carPrice}>{fmt(car.price)}</Text>
                      <Text style={{ color:colors.textMuted, fontSize:11 }}>per day</Text>
                    </View>

                    <ActionRow
                      onCall={() => makeCall(car.phone)}
                      onChat={() =>
                        requireAuth(
                          user,
                          navigation,
                          () => navigation.navigate('ChatDetail', { name: car.name })
                        )
                      }
                      onBook={() =>
                        car.avail && setPayment({ name: `Rent ${car.name}`, price: car.price })
                      }
                      bookLabel={car.avail ? 'Rent Now' : 'Unavailable'}
                      bookColor={car.avail ? colors.rentals : '#6b7280'}
                    />
                  </View>
                </View>
              </Card>
            )}
          />
        </>
      )}

      {tab === 'Equipment' && (
        <FlatList
          data={EQUIPMENT_FB}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding:16, gap:12 }}
          renderItem={({ item }) => (
            <Card style={{ flexDirection:'row', padding:14, gap:14, alignItems:'center' }}>
              <Text style={{ fontSize:32 }}>{item.icon}</Text>
              <View style={{ flex:1 }}>
                <Text style={{ color:colors.text, fontWeight:'700', fontSize:15 }}>{item.name}</Text>
                <Text style={{ color:colors.textMuted, fontSize:12, marginTop:2 }}>{item.desc}</Text>
                <Text style={{ color:colors.rentals, fontWeight:'800', fontSize:15, marginTop:4 }}>
                  {fmt(item.price)}/day
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPayment({ name: item.name, price: item.price })}
                style={{ backgroundColor:colors.rentals, borderRadius:10, padding:10 }}
              >
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:12 }}>Rent</Text>
              </TouchableOpacity>
            </Card>
          )}
        />
      )}

      {tab === 'Event Spaces' && (
        <FlatList
          data={SPACES_FB}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding:16, gap:16 }}
          renderItem={({ item }) => (
            <Card>
              <Image source={{ uri: item.img }} style={{ width:'100%', height:180, resizeMode:'cover' }} />
              <View style={{ padding:14 }}>
                <Text style={{ color:colors.text, fontWeight:'700', fontSize:16, marginBottom:4 }}>
                  {item.name}
                </Text>
                <View style={{ flexDirection:'row', gap:4, alignItems:'center', marginBottom:8 }}>
                  <Feather name="users" size={12} color={colors.textMuted} />
                  <Text style={{ color:colors.textMuted, fontSize:12 }}>
                    Up to {item.capacity} guests
                  </Text>
                </View>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <View>
                    <Text style={styles.carPrice}>{fmt(item.price)}</Text>
                    <Text style={{ color:colors.textMuted, fontSize:11 }}>per event</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setPayment({ name: item.name, price: item.price })}
                    style={{ backgroundColor:colors.rentals, borderRadius:12, paddingVertical:10, paddingHorizontal:20 }}
                  >
                    <Text style={{ color:'#fff', fontWeight:'700' }}>Reserve</Text>
                  </TouchableOpacity>
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
          onSuccess={() => setPayment(null)}
          onClose={() => setPayment(null)}
        />
      )}
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  carImg:         { width:'100%', height:180, resizeMode:'cover' },
  unavailOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center' },
  unavailText:    { color:'#fff', fontWeight:'700', fontSize:16 },
  carBody:        { padding:14 },
  carName:        { color:colors.text, fontWeight:'700', fontSize:16, marginBottom:8 },
  carStats:       { flexDirection:'row', gap:16 },
  carStat:        { flexDirection:'row', gap:4, alignItems:'center' },
  carStatText:    { color:colors.textMuted, fontSize:12 },
  carPrice:       { color:colors.text, fontSize:20, fontWeight:'800' },
});
}