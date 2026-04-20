/**
 * SearchHeader — Persistent search bar that appears on all category screens
 * Tapping it navigates to the SearchScreen
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';

export default function SearchHeader({ navigation, placeholder = 'Search…', cartCount = 0 }) {
  const { colors } = useTheme();
  return (
    <View style={s.row}>
      <TouchableOpacity style={s.searchBar} onPress={() => navigation.navigate('Search')} activeOpacity={0.8}>
        <Feather name="search" size={15} color={colors.textMuted} />
        <Text style={s.placeholder}>{placeholder}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Cart')}>
        <Feather name="shopping-cart" size={18} color={colors.text} />
        {cartCount > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  searchBar:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1a1a26', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  placeholder:{ flex: 1, color: '#6b7280', fontSize: 14 },
  iconBtn:    { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1a1a26', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', position: 'relative' },
  badge:      { position: 'absolute', top: 5, right: 5, width: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  badgeText:  { color: '#fff', fontSize: 9, fontWeight: '800' },
});
