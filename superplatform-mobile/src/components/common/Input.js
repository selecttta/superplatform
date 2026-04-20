import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  error,
  icon,
  multiline,
  numberOfLines,
  style,
  editable = true,
  rightElement,
}) {
  const { colors } = useTheme();
  const [focused,    setFocused]    = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[
        styles.inputWrap,
        focused  && styles.focused,
        !!error  && styles.errored,
        !editable && styles.disabled,
      ]}>
        {icon && (
          <View style={styles.iconLeft}>
            {icon}
          </View>
        )}

        <TextInput
          style={[styles.input, icon && { paddingLeft: 0 }, multiline && { minHeight: 90, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry && !showSecret}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          selectionColor={colors.brand}
        />

        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowSecret(v => !v)} style={styles.iconRight}>
            <Feather name={showSecret ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {rightElement && <View style={styles.iconRight}>{rightElement}</View>}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dark4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    minHeight: 50,
  },
  focused: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.dark5,
  },
  errored: {
    borderColor: '#ef4444',
  },
  disabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 13,
    paddingLeft: 8,
  },
  iconLeft: { marginRight: 4 },
  iconRight: { marginLeft: 8 },
  error: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 2,
  },
});
