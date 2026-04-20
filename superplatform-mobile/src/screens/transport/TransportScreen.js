import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS, RIDE_TYPES } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt, makeCall } from '../../utils/helpers';
import ProviderCard from '../../components/cards/ProviderCard';
import SearchHeader from '../../components/common/SearchHeader';
import { useCartStore } from '../../store/cartStore';

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function TransportScreen({ navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
const cartCount = useCartStore(s => s.count());
  const { user } = useAuthStore();
  const mapRef   = useRef(null);

  const [location,   setLocation]   = useState(null);
  const [pickup,     setPickup]     = useState('');
  const [dropoff,    setDropoff]    = useState('');
  const [rideType,   setRideType]   = useState('standard');
  const [drivers,    setDrivers]    = useState([]);
  const [searching,  setSearching]  = useState(false);
  const [booking,    setBooking]    = useState(null);
  const [rideStatus, setRideStatus] = useState('');
  const [tab,        setTab]        = useState('book'); // 'book' | 'providers'

  // ── Request GPS permission & get location ──────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required for ride booking.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);

      // Reverse-geocode to fill pickup field
      const addr = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude, longitude: loc.coords.longitude,
      });
      if (addr[0]) {
        setPickup(`${addr[0].street || ''} ${addr[0].city || ''}`.trim());
      }
    })();
  }, []);

  // ── Load available drivers from Supabase ────────────────────────────────────
  const loadDrivers = async () => {
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, rating, trips_completed, vehicle_type, vehicle_plate, vehicle_color, current_lat, current_lng')
        .eq('role', 'provider')
        .eq('is_approved', true)
        .eq('category', 'transport')
        .eq('is_online', true)
        .limit(10);

      if (error) throw error;

      // Map to display format
      const formatted = (data || []).map(d => ({
        id:       d.id,
        name:     d.full_name,
        img:      d.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
        phone:    d.phone,
        rating:   d.rating || 4.7,
        trips:    d.trips_completed || 0,
        car:      d.vehicle_type || 'Toyota Corolla',
        plate:    d.vehicle_plate || 'GR 0000-00',
        color:    d.vehicle_color || 'Silver',
        price:    RIDE_TYPES.find(r => r.id === rideType)?.priceKm * 5 || 45,
        eta:      `${Math.ceil(Math.random() * 7 + 2)} min`,
        verified: true,
        lat:      d.current_lat,
        lng:      d.current_lng,
      }));
      setDrivers(formatted);
    } catch {
      // No fallback — show empty state if DB unreachable
      setDrivers([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async () => {
    if (!pickup || !dropoff) {
      Alert.alert('Missing info', 'Please enter both pickup and destination.');
      return;
    }
    await loadDrivers();
    setTab('providers');
  };

  // ── Create booking in Supabase ─────────────────────────────────────────────
  const handleBook = async (driver) => {
    if (!user) { navigation.navigate('Login'); return; }

    try {
      const { data, error } = await supabase.from('rides').insert({
        customer_id:  user.id,
        driver_id:    driver.id,
        pickup_addr:  pickup,
        dropoff_addr: dropoff,
        ride_type:    rideType,
        fare:         driver.price,
        status:       'requested',
        created_at:   new Date().toISOString(),
      }).select().single();

      if (error) throw error;

      setBooking({ ...driver, rideId: data.id });
      setRideStatus('requested');

      // Subscribe to realtime ride updates
      supabase.channel(`ride:${data.id}`)
        .on('postgres_changes', { event:'UPDATE', schema:'public', table:'rides', filter:`id=eq.${data.id}` }, payload => {
          setRideStatus(payload.new.status);
          if (payload.new.status === 'accepted') {
            Alert.alert('Driver Accepted!', `${driver.name} is on the way.`);
          }
          if (payload.new.status === 'completed') {
            navigation.navigate('RidePayment', { ride: payload.new, driver });
          }
        })
        .subscribe();
    } catch (err) {
      Alert.alert('Booking Error', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <SearchHeader navigation={navigation} placeholder="Search transport & rides…" cartCount={cartCount} />
      {/* Tabs */}
      <View style={styles.tabRow}>
        {[['book','Book Ride'],['providers','Providers']].map(([t, l]) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab===t && styles.tabActive]}>
            <Text style={[styles.tabText, tab===t && styles.tabTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'book' && (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Map */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              customMapStyle={darkMapStyle}
              initialRegion={{
                latitude:      location?.latitude  || 5.6037,
                longitude:     location?.longitude || -0.1870,
                latitudeDelta:  0.04,
                longitudeDelta: 0.04,
              }}
              showsUserLocation
              showsMyLocationButton
            >
              {location && (
                <Marker
                  coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                  title="You are here"
                  pinColor={colors.brand}
                />
              )}
              {/* Driver markers */}
              {drivers.map(d => d.lat && d.lng ? (
                <Marker key={d.id} coordinate={{ latitude: d.lat, longitude: d.lng }} title={d.name}>
                  <View style={styles.driverMarker}>
                    <Text>🚗</Text>
                  </View>
                </Marker>
              ) : null)}
            </MapView>
          </View>

          {/* Ride type selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rideTypes}>
            {RIDE_TYPES.map(rt => (
              <TouchableOpacity key={rt.id} onPress={() => setRideType(rt.id)}
                style={[styles.rideTypeBtn, rideType === rt.id && styles.rideTypeBtnActive]}>
                <Text style={{ fontSize: 20 }}>{rt.icon}</Text>
                <Text style={[styles.rideTypeTxt, rideType === rt.id && { color: colors.brand }]}>{rt.label}</Text>
                <Text style={styles.rideTypeEta}>{rt.eta}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Location inputs */}
          <View style={styles.inputs}>
            <View style={styles.inputRow}>
              <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
              <TextInput
                style={styles.locationInput}
                value={pickup}
                onChangeText={setPickup}
                placeholder="Pickup location"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.dividerLine} />
            <View style={styles.inputRow}>
              <View style={[styles.dot, { backgroundColor: colors.brand }]} />
              <TextInput
                style={styles.locationInput}
                value={dropoff}
                onChangeText={setDropoff}
                placeholder="Destination"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            {searching
              ? <ActivityIndicator color="#fff" />
              : <><Feather name="navigation" size={16} color="#fff" /><Text style={styles.searchBtnText}>  Find Drivers</Text></>
            }
          </TouchableOpacity>

          {/* Active booking status */}
          {booking && (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>
                {rideStatus === 'requested'   && '🔍 Looking for driver…'}
                {rideStatus === 'accepted'    && `🚗 ${booking.name} accepted!`}
                {rideStatus === 'arriving'    && `${booking.name} is arriving`}
                {rideStatus === 'in_progress' && '🛣️ Ride in progress'}
                {rideStatus === 'completed'   && '✅ Ride completed!'}
              </Text>
              <Text style={styles.statusSub}>{booking.car} · {booking.plate}</Text>
              <View style={styles.statusActions}>
                <TouchableOpacity style={styles.callBtn} onPress={() => makeCall(booking.phone)}>
                  <Feather name="phone" size={16} color="#10b981" />
                  <Text style={styles.callText}>Call Driver</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate('ChatDetail', { userId: booking.id, name: booking.name })}>
                  <Feather name="message-circle" size={16} color="#3b82f6" />
                  <Text style={styles.chatText}>Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {tab === 'providers' && (
      <FlatList
          data={drivers}
          keyExtractor={d => d.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🚗</Text>
              <Text style={styles.emptyText}>Search for a ride first</Text>
              <TouchableOpacity onPress={() => setTab('book')}>
                <Text style={{ color: colors.brand, marginTop: 8 }}>Go to booking</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <ProviderCard
              provider={item}
              accentColor={colors.transport}
              onPress={() => navigation.navigate('ProviderDetail', { provider: item, type: 'driver' })}
              onChat={() => navigation.navigate('ChatDetail', { userId: item.id, name: item.name })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Google Maps dark style ───────────────────────────────────────────────────
const darkMapStyle = [
  { elementType:'geometry', stylers:[{ color:'#1a1a2e' }] },
  { elementType:'labels.text.fill', stylers:[{ color:'#6b7280' }] },
  { elementType:'labels.text.stroke', stylers:[{ color:'#0a0a0f' }] },
  { featureType:'road', elementType:'geometry', stylers:[{ color:'#2d2d44' }] },
  { featureType:'road', elementType:'geometry.stroke', stylers:[{ color:'#1a1a2e' }] },
  { featureType:'water', elementType:'geometry', stylers:[{ color:'#111827' }] },
];

function useStyles(colors) {
  return StyleSheet.create({
  safe:      { flex:1, backgroundColor:colors.dark },
  tabRow:    { flexDirection:'row', paddingHorizontal:16, paddingVertical:10, gap:8 },
  tab:       { flex:1, paddingVertical:10, borderRadius:12, backgroundColor:colors.dark3, alignItems:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  tabActive: { backgroundColor:colors.brand+'20', borderColor:colors.brand+'60' },
  tabText:   { fontSize:14, fontWeight:'600', color:colors.textMuted },
  tabTextActive:{ color:colors.brand },

  mapContainer:{ marginHorizontal:16, borderRadius:20, overflow:'hidden', height:260, marginBottom:16 },
  map:         { flex:1 },
  driverMarker:{ backgroundColor:colors.dark3, borderRadius:20, padding:6, borderWidth:2, borderColor:colors.brand },

  rideTypes:   { paddingLeft:16, marginBottom:16 },
  rideTypeBtn: { backgroundColor:colors.dark3, borderRadius:14, padding:12, alignItems:'center', marginRight:10, minWidth:80, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  rideTypeBtnActive:{ borderColor:colors.brand },
  rideTypeTxt: { fontSize:12, fontWeight:'700', color:colors.textMuted, marginTop:4 },
  rideTypeEta: { fontSize:10, color:colors.textMuted, marginTop:2 },

  inputs:      { marginHorizontal:16, backgroundColor:colors.dark3, borderRadius:16, padding:14, marginBottom:16, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  inputRow:    { flexDirection:'row', alignItems:'center', gap:12 },
  dot:         { width:10, height:10, borderRadius:5 },
  locationInput:{ flex:1, fontSize:14, color:colors.text, paddingVertical:10 },
  dividerLine: { height:1, backgroundColor:'rgba(255,255,255,0.06)', marginVertical:6, marginLeft:22 },

  searchBtn:   { marginHorizontal:16, backgroundColor:'#3b82f6', borderRadius:14, paddingVertical:15, flexDirection:'row', alignItems:'center', justifyContent:'center', shadowColor:'#3b82f6', shadowOpacity:0.35, shadowRadius:12, shadowOffset:{width:0,height:4}, elevation:6 },
  searchBtnText:{ fontSize:15, fontWeight:'700', color:'#fff' },

  statusCard:  { margin:16, backgroundColor:colors.dark3, borderRadius:16, padding:16, borderWidth:1, borderColor:colors.brand+'40' },
  statusTitle: { fontSize:16, fontWeight:'700', color:colors.text, marginBottom:4 },
  statusSub:   { fontSize:12, color:colors.textMuted, marginBottom:14 },
  statusActions:{ flexDirection:'row', gap:10 },
  callBtn:     { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:'#10b98120', borderRadius:12, paddingVertical:12, borderWidth:1, borderColor:'#10b98140' },
  callText:    { fontSize:13, fontWeight:'700', color:'#10b981' },
  chatBtn:     { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:'#3b82f620', borderRadius:12, paddingVertical:12, borderWidth:1, borderColor:'#3b82f640' },
  chatText:    { fontSize:13, fontWeight:'700', color:'#3b82f6' },

  empty:       { alignItems:'center', paddingTop:60 },
  emptyText:   { fontSize:15, color:colors.textMuted },
});

}