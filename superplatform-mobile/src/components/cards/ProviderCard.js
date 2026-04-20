import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt, makeCall } from '../../utils/helpers';

export default function ProviderCard({ provider, onPress, onChat, accentColor, style }) {
  const { colors } = useTheme();
  const color = accentColor || colors.brand;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, style]}
    >
      {/* Image */}
      <Image
        source={{ uri: provider.img || provider.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80' }}
        style={styles.img}
      />

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{provider.name}</Text>
            <Text style={styles.spec} numberOfLines={1}>
              {provider.specialty || provider.role || ''}
            </Text>
          </View>

          {/* Price */}
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>from</Text>
            <Text style={styles.price}>{fmt(provider.price)}</Text>
          </View>
        </View>

        {/* Rating row */}
        <View style={styles.meta}>
          {provider.rating && (
            <View style={styles.metaItem}>
              <Feather name="star" size={11} color="#f59e0b" />
              <Text style={styles.metaText}>{provider.rating}</Text>
            </View>
          )}
          {(provider.jobs || provider.trips) && (
            <View style={styles.metaItem}>
              <Feather name="check-circle" size={11} color={colors.textMuted} />
              <Text style={styles.metaText}>{(provider.jobs || provider.trips).toLocaleString()} done</Text>
            </View>
          )}
          {provider.verified && (
            <View style={[styles.badge, { backgroundColor: color + '20' }]}>
              <Text style={[styles.badgeText, { color }]}>✓ Verified</Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => makeCall(provider.phone || '+233240000000')}
          >
            <Feather name="phone" size={14} color="#10b981" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onChat}>
            <Feather name="message-circle" size={14} color="#3b82f6" />
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bookBtn, { backgroundColor: color }]}
            onPress={onPress}
          >
            <Text style={styles.bookText}>Book</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.dark3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  img: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  body: { padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  spec: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  priceBox: { alignItems: 'flex-end', marginLeft: 8 },
  priceLabel: { fontSize: 10, color: COLORS.textMuted },
  price: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.dark4,
    borderRadius: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  bookBtn: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 9,
  },
  bookText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
