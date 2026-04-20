import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';

export default function FavoritesScreen() {
      
  const { colors } = useTheme();
  const s = useStyles(colors);
  
return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>Favorites</Text>
      </View>
      <View style={s.empty}>
        <View style={s.iconWrap}>
          <Feather name="heart" size={48} color={colors.textMuted} />
        </View>
        <Text style={s.emptyTitle}>No favorites yet</Text>
        <Text style={s.emptyDesc}>
          Items you save will appear here for quick access.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.dark3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
});

}