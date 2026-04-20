import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';

const ROLES = [
  { id:'customer', label:'Customer',  icon:'🛒', desc:'Buy, book & discover services' },
  { id:'provider', label:'Provider',  icon:'🔧', desc:'Offer services & earn income'  },
];

export default function RegisterScreen({ navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '', role: 'customer',
  });
  const [errors, setErrors] = useState({});
  const { signUp, loading } = useAuthStore();

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim())              e.fullName = 'Full name is required';
    if (!form.email.trim())                 e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone.trim())                 e.phone    = 'Phone number is required';
    if (form.password.length < 8)           e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    const result = await signUp({
      email:    form.email.trim().toLowerCase(),
      password: form.password,
      fullName: form.fullName.trim(),
      phone:    form.phone.trim(),
      role:     form.role,
    });

    if (result.success) {
      if (result.needsVerification) {
        Alert.alert(
          '✅ Account Created!',
          `We sent a verification link to ${form.email}. Please check your inbox and click the link to verify your account before signing in.`,
          [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
        );
      }
      // else root navigator will redirect based on auth state
    } else {
      // Handle duplicate email specifically
      if (result.error?.includes('already exists')) {
        Alert.alert(
          'Email Already Registered',
          'An account with this email address already exists. Please sign in instead.',
          [
            { text: 'Go to Login', onPress: () => navigation.navigate('Login') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Registration Failed', result.error || 'Please try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join thousands of Ghanaians on SuperPlatform</Text>

          {/* Role selector */}
          <Text style={styles.sectionLabel}>I want to…</Text>
          <View style={styles.roleRow}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.id}
                onPress={() => set('role', r.id)}
                style={[styles.roleCard, form.role === r.id && styles.roleCardActive]}
              >
                <Text style={styles.roleIcon}>{r.icon}</Text>
                <Text style={[styles.roleLabel, form.role === r.id && styles.roleLabelActive]}>{r.label}</Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Full name"
              value={form.fullName}
              onChangeText={v => set('fullName', v)}
              placeholder="Kwame Mensah"
              autoCapitalize="words"
              autoComplete="name"
              error={errors.fullName}
              icon={<Feather name="user" size={16} color={colors.textMuted} />}
            />
            <Input
              label="Email address"
              value={form.email}
              onChangeText={v => set('email', v)}
              placeholder="kwame@example.com"
              keyboardType="email-address"
              autoComplete="email"
              error={errors.email}
              icon={<Feather name="mail" size={16} color={colors.textMuted} />}
            />
            <Input
              label="Phone number"
              value={form.phone}
              onChangeText={v => set('phone', v)}
              placeholder="+233 24 000 0000"
              keyboardType="phone-pad"
              autoComplete="tel"
              error={errors.phone}
              icon={<Feather name="phone" size={16} color={colors.textMuted} />}
            />
            <Input
              label="Password"
              value={form.password}
              onChangeText={v => set('password', v)}
              placeholder="Min. 8 characters"
              secureTextEntry
              error={errors.password}
              icon={<Feather name="lock" size={16} color={colors.textMuted} />}
            />
            <Input
              label="Confirm password"
              value={form.confirmPassword}
              onChangeText={v => set('confirmPassword', v)}
              placeholder="Repeat password"
              secureTextEntry
              error={errors.confirmPassword}
              icon={<Feather name="lock" size={16} color={colors.textMuted} />}
            />

            <Button
              label="Create Account"
              onPress={handleRegister}
              loading={loading}
              fullWidth
              style={{ marginTop: 8 }}
            />

            <Text style={styles.terms}>
              By creating an account you agree to our{' '}
              <Text style={{ color: colors.brand }}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={{ color: colors.brand }}>Privacy Policy</Text>.
            </Text>
          </View>

          {/* Login link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.dark },
  scroll:    { flexGrow: 1, padding: 24 },
  backBtn:   { marginBottom: 20 },
  title:     { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 6 },
  subtitle:  { fontSize: 14, color: colors.textMuted, marginBottom: 28 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  roleRow:   { flexDirection: 'row', gap: 12, marginBottom: 28 },
  roleCard:  {
    flex: 1, backgroundColor: colors.dark3, borderRadius: 14,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.08)',
    padding: 14, alignItems: 'center',
  },
  roleCardActive: { borderColor: colors.brand, backgroundColor: colors.brand + '15' },
  roleIcon:  { fontSize: 24, marginBottom: 6 },
  roleLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 4 },
  roleLabelActive: { color: colors.brand },
  roleDesc:  { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 15 },
  form:      { marginBottom: 20 },
  terms:     { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  footer:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 20 },
  footerText: { fontSize: 14, color: colors.textMuted },
  footerLink: { fontSize: 14, fontWeight: '700', color: colors.brand },
});

}