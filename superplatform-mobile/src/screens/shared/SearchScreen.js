import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt } from '../../utils/helpers';

const RECENT = ['Doctor near me', 'Toyota rental', 'Plumber East Legon', 'Beauty salon Osu'];
const SUGGESTIONS = [
  { label:'All',        icon:'🔍' },
  { label:'Products',   icon:'🛍️' },
  { label:'Doctors',    icon:'🏥' },
  { label:'Services',   icon:'🔧' },
  { label:'Properties', icon:'🏠' },
];

export default function SearchScreen({ navigation }) {
      
  const { colors } = useTheme();
  const s = useStyles(colors);
  
const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const search = async (q) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const [listings, profiles] = await Promise.all([
        supabase.from('listings').select('id,title,price,images,category').ilike('title', `%${q}%`).eq('status','approved').limit(10),
        supabase.from('profiles').select('id,full_name,specialty,avatar_url,base_price').eq('role','provider').ilike('full_name', `%${q}%`).limit(5),
      ]);
      const items = [
        ...(listings.data || []).map(l => ({ id: l.id, name: l.title, price: l.price, img: l.images?.[0], type: l.category, screen: 'ProviderDetail', params: { provider: { id: l.id, name: l.title, price: l.price, img: l.images?.[0] }, type: l.category } })),
        ...(profiles.data || []).map(p => ({ id: p.id, name: p.full_name, price: p.base_price, img: p.avatar_url, type: 'Provider', screen: 'ProviderDetail', params: { provider: p, type: 'services' } })),
      ];
      setResults(items);
    } catch { setResults([]); }
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.screen}>
      {/* Search bar */}
      <View style={s.searchBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8 }}>
          <Feather name="arrow-left" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <Feather name="search" size={16} color={colors.textMuted} />
        <TextInput
          ref={inputRef}
          autoFocus
          style={s.input}
          placeholder="Search services, products, doctors…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={search}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
            <Feather name="x" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {query.length === 0 ? (
        <FlatList
          data={[]}
          ListHeaderComponent={() => (
            <View style={{ padding: 16 }}>
              <Text style={s.label}>Recent</Text>
              {RECENT.map((r, i) => (
                <TouchableOpacity key={i} onPress={() => search(r)} style={s.recentItem}>
                  <Feather name="clock" size={14} color={colors.textMuted} />
                  <Text style={s.recentText}>{r}</Text>
                </TouchableOpacity>
              ))}
              <Text style={[s.label, { marginTop: 20 }]}>Browse by</Text>
              <View style={s.filterRow}>
                {SUGGESTIONS.map(sg => (
                  <TouchableOpacity key={sg.label} style={s.filterChip}>
                    <Text style={{ fontSize: 16 }}>{sg.icon}</Text>
                    <Text style={s.filterText}>{sg.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          renderItem={() => null}
        />
      ) : loading ? (
        <View style={s.center}><Feather name="loader" size={24} color={colors.brand} /></View>
      ) : results.length === 0 ? (
        <View style={s.center}>
          <Feather name="search" size={40} color={colors.textMuted} />
          <Text style={s.emptyTitle}>No results for "{query}"</Text>
          <Text style={s.emptyText}>Try a different search term</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.resultItem} onPress={() => navigation.navigate(item.screen, item.params)}>
              {item.img
                ? <Image source={{ uri: item.img }} style={s.resultImg} />
                : <View style={[s.resultImg, { backgroundColor: colors.dark3, alignItems:'center', justifyContent:'center' }]}><Feather name="search" size={20} color={colors.textMuted} /></View>
              }
              <View style={{ flex: 1 }}>
                <Text style={s.resultName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.resultType}>{item.type}</Text>
              </View>
              {item.price ? <Text style={s.resultPrice}>{fmt(item.price)}</Text> : null}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  screen:     { flex: 1, backgroundColor: colors.dark },
  searchBar:  { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: colors.dark3, borderRadius: 14, paddingHorizontal: 14, height: 48, gap: 8, borderWidth: 1, borderColor: colors.border },
  input:      { flex: 1, color: colors.text, fontSize: 15 },
  label:      { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  recentText: { fontSize: 14, color: colors.text },
  filterRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dark3, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16, textAlign: 'center' },
  emptyText:  { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  resultItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.dark3, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border },
  resultImg:  { width: 52, height: 52, borderRadius: 12, resizeMode: 'cover' },
  resultName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3 },
  resultType: { fontSize: 12, color: colors.textMuted },
  resultPrice:{ fontSize: 14, fontWeight: '800', color: colors.brand },
});

}