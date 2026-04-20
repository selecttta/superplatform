import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';

export default function Button({
  label,
  onPress,
  variant  = 'primary',  // 'primary' | 'secondary' | 'danger' | 'ghost'
  size     = 'md',        // 'sm' | 'md' | 'lg'
  loading  = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
  textStyle,
}) {
  const { colors } = useTheme();
  const bg = {
    primary:   colors.brand,
    secondary: colors.dark4,
    danger:    '#ef444415',
    ghost:     'transparent',
  }[variant];

  const tc = {
    primary:   '#fff',
    secondary: colors.text,
    danger:    '#ef4444',
    ghost:     colors.textMuted,
  }[variant];

  const pad = { sm: 8, md: 14, lg: 17 }[size];
  const fs  = { sm: 13, md: 15, lg: 16 }[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        { backgroundColor: bg, paddingVertical: pad, opacity: disabled ? 0.5 : 1 },
        variant === 'secondary' && styles.borderSecondary,
        variant === 'danger'    && styles.borderDanger,
        fullWidth               && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tc} size="small" />
      ) : (
        <View style={styles.row}>
          {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
          <Text style={[styles.text, { color: tc, fontSize: fs }, textStyle]}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  borderSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  borderDanger: {
    borderWidth: 1,
    borderColor: '#ef444430',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
