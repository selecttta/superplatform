/**
 * RealEstateScreen — Room, Apartment, House, Land listings
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  FlatList, Image, Linking, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { COLORS, requireAuth } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt, makeCall } from '../../utils/helpers';
import { Card, Badge, Chip, StarRating, SectionHeader, ActionRow } from '../../components/ui';
import SearchHeader from '../../components/common/SearchHeader';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';

const TYPES = ['All', 'Rent', 'Sale'];
const PROP_TYPES = ['All', 'Apartment', 'House', 'Land', 'Commercial'];

const PROPERTIES_FB = [
  { id:'r1', name:'2-Bedroom Apt — East Legon', price:2500, type:'Rent', propType:'Apartment', beds:2, baths:2, sqft:1100, badge:'FEATURED', img:'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80', phone:'+233241333001' },
  { id:'r2', name:'4-Bed House — Cantonments',  price:4500, type:'Rent', propType:'House',     beds:4, baths:3, sqft:2400, badge:'HOT',      img:'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80', phone:'+233241333002' },
  { id:'r3', name:'Land — Tema, 1 Acre',        price:180000,type:'Sale',propType:'Land',     beds:0, baths:0, sqft:43560, badge:'NEW',     img:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80', phone:'+233241333003' },
  { id:'r4', name:'Studio Apt — Osu',           price:1200, type:'Rent', propType:'Apartment', beds:1, baths:1, sqft:450,  badge:null,       img:'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80', phone:'+233241333004' },
  { id:'r5', name:'3-Bed House — Achimota',     price:220000,type:'Sale',propType:'House',    beds:3, baths:2, sqft:1800, badge:'HOT',       img:'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=80', phone:'+233241333005' },
  { id:'r6', name:'Office Space — Airport City',price:6000, type:'Rent', propType:'Commercial',beds:0, baths:2, sqft:1200, badge:'FEATURED', img:'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80', phone:'+233241333006' },
];

const BADGE_COLORS = { FEATURED:'#3b82f6', HOT:'#ef4444', NEW:'#10b981', LUXURY:'#f59e0b' };

export default function RealEstateScreen({ navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
const cartCount = useCartStore(s => s.count());
  const { user } = useAuthStore();
  const [type,       setType]       = useState('All');
  const [propType,   setPropType]   = useState('All');
  const [search,     setSearch]     = useState('');
  const [properties, setProperties] = useState(PROPERTIES_FB);
  const [favs,       setFavs]       = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await supabase
        .from('listings')
        .select('*, profiles(full_name, phone)')
        .eq('category', 'real-estate')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (data?.length) setProperties(data.map(d => ({
        id: d.id, name: d.title, price: d.price, type: d.transaction_type || 'Rent',
        propType: d.subcategory || 'Apartment', beds: d.bedrooms || 0, baths: d.bathrooms || 0,
        sqft: d.area_sqft || 0, badge: d.badge, img: d.images?.[0] || PROPERTIES_FB[0].img,
        phone: d.profiles?.phone,
      })));
    } catch {}
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = properties.filter(p =>
    (type === 'All' || p.type === type) &&
    (propType === 'All' || p.propType === propType) &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleFav = (id) => setFavs(f => f.includes(id) ? f.filter(i => i !== id) : [...f, id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
      <SearchHeader navigation={navigation} cartCount={cartCount} />
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.realestate} />}
        ListHeaderComponent={() => (
          <View style={{ gap: 10, marginBottom: 8 }}>
            <View style={styles.searchRow}>
              <Feather name="search" size={15} color={colors.textMuted} />
              <TextInput style={styles.searchInput} placeholder="Area, location, property name…"
                placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {TYPES.map(t => <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} color={colors.realestate} />)}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {PROP_TYPES.map(t => <Chip key={t} label={t} active={propType === t} onPress={() => setPropType(t)} color={colors.realestate} />)}
            </ScrollView>
          </View>
        )}
        renderItem={({ item: prop }) => (
          <Card>
            <View style={{ position: 'relative' }}>
              <Image source={{ uri: prop.img }} style={styles.propImg} />
              {prop.badge && (
                <View style={[styles.propBadge, { backgroundColor: BADGE_COLORS[prop.badge] || colors.brand }]}>
                  <Text style={styles.propBadgeText}>{prop.badge}</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => toggleFav(prop.id)} style={styles.favBtn}>
                <Feather name="heart" size={16} color={favs.includes(prop.id) ? '#ef4444' : '#fff'} />
              </TouchableOpacity>
            </View>
            <View style={styles.propBody}>
              <Text style={styles.propName} numberOfLines={2}>{prop.name}</Text>
              <Text style={styles.propPrice}>
                {fmt(prop.price)}
                {prop.type === 'Rent' && <Text style={styles.propPriceSub}> /mo</Text>}
              </Text>
              <View style={styles.propStats}>
                {prop.beds > 0 && <View style={styles.propStat}><Feather name="hash" size={11} color={colors.textMuted} /><Text style={styles.propStatText}>{prop.beds} bed</Text></View>}
                {prop.baths > 0 && <View style={styles.propStat}><Feather name="droplet" size={11} color={colors.textMuted} /><Text style={styles.propStatText}>{prop.baths} bath</Text></View>}
                <View style={styles.propStat}><Feather name="maximize" size={11} color={colors.textMuted} /><Text style={styles.propStatText}>{prop.sqft.toLocaleString()} sqft</Text></View>
                <Badge label={prop.type} color={prop.type === 'Rent' ? colors.realestate : '#10b981'} />
              </View>
              <ActionRow
                onCall={() => makeCall(prop.phone)}
                onChat={() => requireAuth(user, navigation, () => navigation.navigate('ChatDetail', { name: prop.name }))}
                onBook={() => navigation.navigate('ProviderDetail', { provider: prop, type: 'real-estate' })}
                bookLabel="View Details"
                bookColor={colors.realestate}
              />
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  searchRow:      { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.dark3, borderRadius:14, paddingHorizontal:14, paddingVertical:10, borderWidth:1, borderColor:colors.border },
  searchInput:    { flex:1, color:colors.text, fontSize:14 },
  propImg:        { width:'100%', height:200, resizeMode:'cover' },
  propBadge:      { position:'absolute', top:12, left:12, borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  propBadgeText:  { color:'#fff', fontSize:10, fontWeight:'700' },
  favBtn:         { position:'absolute', top:12, right:12, width:34, height:34, borderRadius:17, backgroundColor:'rgba(0,0,0,0.5)', alignItems:'center', justifyContent:'center' },
  propBody:       { padding:14 },
  propName:       { color:colors.text, fontSize:16, fontWeight:'700', marginBottom:4 },
  propPrice:      { color:colors.text, fontSize:22, fontWeight:'800', marginBottom:8 },
  propPriceSub:   { color:colors.textMuted, fontSize:13, fontWeight:'400' },
  propStats:      { flexDirection:'row', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:4 },
  propStat:       { flexDirection:'row', alignItems:'center', gap:4 },
  propStatText:   { color:colors.textMuted, fontSize:12 },
});

}