/**
 * Reusable UI primitives for SuperPlatform GH Mobile
 * All components follow the dark theme defined in COLORS
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../lib/constants';

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, style]}
    >
      {children}
    </Wrapper>
  );
}

// ─── Button (primary / secondary / danger / ghost) ────────────────────────────
export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, style, textStyle,
}) {
  const bg = {
    primary:   COLORS.brand,
    secondary: COLORS.dark4,
    danger:    '#ef4444',
    ghost:     'transparent',
    blue:      '#3b82f6',
    green:     '#10b981',
    pink:      '#ec4899',
  }[variant] || COLORS.brand;

  const paddingV = size === 'lg' ? 15 : size === 'sm' ? 8 : 12;
  const fontSize = size === 'lg' ? 16 : size === 'sm' ? 12 : 14;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: bg, paddingVertical: paddingV, opacity: (disabled || loading) ? 0.55 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: COLORS.border },
        variant === 'secondary' && { borderWidth: 1, borderColor: COLORS.border },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={variant === 'secondary' ? COLORS.text : '#fff'} size="small" />
        : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {icon && <Feather name={icon} size={fontSize} color={variant === 'secondary' ? COLORS.textMuted : '#fff'} />}
            <Text style={[styles.btnText, { fontSize }, variant === 'secondary' && { color: COLORS.textMuted }, textStyle]}>
              {label}
            </Text>
          </View>
        )
      }
    </TouchableOpacity>
  );
}

// ─── Row (for Call / Chat / Book) ─────────────────────────────────────────────
export function ActionRow({ onCall, onChat, onBook, bookLabel = 'Book', bookColor = COLORS.brand }) {
  return (
    <View style={styles.actionRow}>
      <TouchableOpacity onPress={onCall} style={[styles.actionBtn, { backgroundColor: '#10b98120' }]}>
        <Feather name="phone" size={15} color="#10b981" />
        <Text style={[styles.actionLabel, { color: '#10b981' }]}>Call</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onChat} style={[styles.actionBtn, { backgroundColor: '#3b82f620' }]}>
        <Feather name="message-circle" size={15} color="#3b82f6" />
        <Text style={[styles.actionLabel, { color: '#3b82f6' }]}>Chat</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onBook} style={[styles.actionBtn, { flex: 1.5, backgroundColor: bookColor }]}>
        <Text style={[styles.actionLabel, { color: '#fff', fontWeight: '700' }]}>{bookLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── StarRating ───────────────────────────────────────────────────────────────
export function StarRating({ rating = 0, reviews, size = 12 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Feather
          key={n}
          name="star"
          size={size}
          color={n <= Math.round(rating) ? '#f59e0b' : '#374151'}
        />
      ))}
      {reviews != null && (
        <Text style={{ color: COLORS.textMuted, fontSize: size - 1, marginLeft: 2 }}>
          ({Number(reviews).toLocaleString()})
        </Text>
      )}
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ label, color = COLORS.brand }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '25', borderColor: color + '50' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = 'inbox', title, subtitle, action, onAction }) {
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={48} color={COLORS.dark5} />
      {title    && <Text style={styles.emptyTitle}>{title}</Text>}
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
      {action   && (
        <Button label={action} onPress={onAction} style={{ marginTop: 16, paddingHorizontal: 24 }} />
      )}
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ uri, name = '', size = 40, style }) {
  const letters = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  return uri
    ? <Image source={{ uri }} style={[{ width: size, height: size, borderRadius: size / 2 }, style]} />
    : (
      <View style={[{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center',
      }, style]}>
        <Text style={{ color: '#fff', fontSize: size * 0.35, fontWeight: '700' }}>{letters}</Text>
      </View>
    );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ style }) {
  return <View style={[{ height: 1, backgroundColor: COLORS.border, marginVertical: 12 }, style]} />;
}

// ─── Chip (filter button) ─────────────────────────────────────────────────────
export function Chip({ label, active, onPress, color = COLORS.brand }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
    >
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── ScreenLoader ─────────────────────────────────────────────────────────────
export function ScreenLoader({ color = COLORS.brand }) {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={color} size="large" />
    </View>
  );
}

// ─── StatBox (dashboard stat card) ───────────────────────────────────────────
export function StatBox({ label, value, icon, color = COLORS.brand, style }) {
  return (
    <View style={[styles.statBox, style]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.dark3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  btn: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }, android: { elevation: 3 } }),
  },
  btnText: { color: '#fff', fontWeight: '700', letterSpacing: 0.3 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    borderWidth: 1, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  sectionAction: { color: COLORS.brand, fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle:    { color: COLORS.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.dark3, borderWidth: 1, borderColor: COLORS.border,
    marginRight: 8,
  },
  chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  statBox: {
    flex: 1, backgroundColor: COLORS.dark3, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 4,
  },
  statIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },
});
