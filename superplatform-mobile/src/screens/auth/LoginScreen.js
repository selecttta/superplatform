import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';

export default function LoginScreen({ navigation }) {
      
  const { colors } = useTheme();
  const s = useStyles(colors);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [tab, setTab] = useState('login'); // login | forgot | verify
  const [resending, setResending] = useState(false);
  const { signIn, resendVerification, loading } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Required', 'Please enter your email and password.'); return; }
    const res = await signIn({ email: email.trim(), password });
    if (!res.success) {
      if (res.needsVerification) {
        // Switch to verification tab
        setTab('verify');
      } else {
        Alert.alert('Login Failed', res.error || 'Incorrect email or password.');
      }
    } else {
      if (navigation.canGoBack?.()) navigation.goBack(); else navigation.navigate('Login');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { Alert.alert('Required', 'Enter your email first.'); return; }
    const { resetPassword } = useAuthStore.getState();
    const result = await resetPassword(email.trim());
    if (result.success) {
      Alert.alert('Email Sent', 'Check your inbox for a reset link.');
      setTab('login');
    } else {
      Alert.alert('Error', result.error || 'Failed to send reset link.');
    }
  };

  const handleResendVerification = async () => {
    if (!email) { Alert.alert('Required', 'Please enter your email address.'); return; }
    setResending(true);
    try {
      const result = await resendVerification(email.trim());
      if (result.success) {
        Alert.alert('Email Sent ✉️', 'A new verification link has been sent to your inbox. Please check your email and verify your account.');
      } else {
        Alert.alert('Error', result.error || 'Failed to resend verification email.');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Close modal button */}
          <TouchableOpacity onPress={() => navigation.goBack?.()} style={s.closeBtn}>
            <Feather name="x" size={22} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Logo */}
          <View style={s.logoRow}>
            <View style={s.logoBox}>
              <Text style={s.logoLetter}>S</Text>
            </View>
            <Text style={s.logoText}>SuperPlatform GH</Text>
          </View>

          {/* ── VERIFY EMAIL TAB ── */}
          {tab === 'verify' && (
            <>
              <Text style={s.heading}>Verify Your Email</Text>
              <Text style={s.subheading}>Please check your inbox for a verification link before logging in.</Text>

              <View style={s.verifyCard}>
                <Feather name="mail" size={40} color={colors.brand} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 12 }}>
                  Check your email
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
                  We sent a verification link to {email || 'your email'}. Click the link to verify your account, then come back to sign in.
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleResendVerification}
                disabled={resending}
                style={[s.btn, resending && { opacity: 0.6 }]}>
                <Text style={s.btnText}>{resending ? 'Sending…' : 'Resend Verification Email'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setTab('login')} style={s.link}>
                <Text style={{ color: colors.textMuted, textAlign: 'center' }}>← Back to Login</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── LOGIN TAB ── */}
          {tab === 'login' && (
            <>
              <Text style={s.heading}>Welcome back</Text>
              <Text style={s.subheading}>Sign in to continue</Text>

              {/* Email */}
              <View style={s.field}>
                <Text style={s.label}>Email Address</Text>
                <View style={s.inputRow}>
                  <Feather name="mail" size={16} color={colors.textMuted} style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={s.field}>
                <Text style={s.label}>Password</Text>
                <View style={s.inputRow}>
                  <Feather name="lock" size={16} color={colors.textMuted} style={s.inputIcon} />
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="Your password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPw}
                    autoComplete="password"
                  />
                  <TouchableOpacity onPress={() => setShowPw(v => !v)} style={{ padding: 4 }}>
                    <Feather name={showPw ? 'eye-off' : 'eye'} size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setTab('forgot')} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
                  <Text style={{ color: colors.brand, fontSize: 12 }}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Action button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                style={[s.btn, loading && { opacity: 0.6 }]}>
                <Text style={s.btnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
              </TouchableOpacity>

              {/* Sign up link */}
              <TouchableOpacity onPress={() => navigation.navigate('Register')} style={s.link}>
                <Text style={s.linkText}>No account? <Text style={{ color: colors.brand }}>Create one free →</Text></Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── FORGOT PASSWORD TAB ── */}
          {tab === 'forgot' && (
            <>
              <Text style={s.heading}>Reset Password</Text>
              <Text style={s.subheading}>We'll send you a reset link</Text>

              {/* Email */}
              <View style={s.field}>
                <Text style={s.label}>Email Address</Text>
                <View style={s.inputRow}>
                  <Feather name="mail" size={16} color={colors.textMuted} style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={loading}
                style={[s.btn, loading && { opacity: 0.6 }]}>
                <Text style={s.btnText}>{loading ? 'Sending…' : 'Send Reset Link'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setTab('login')} style={s.link}>
                <Text style={{ color: colors.textMuted, textAlign: 'center' }}>← Back to Login</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.dark },
  scroll:    { padding: 24, paddingTop: 16 },
  closeBtn:  { alignSelf: 'flex-end', padding: 8, marginBottom: 8 },
  logoRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoBox:   { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  logoLetter:{ color: '#fff', fontWeight: '900', fontSize: 18 },
  logoText:  { color: colors.text, fontWeight: '800', fontSize: 18 },
  heading:   { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subheading:{ color: colors.textMuted, fontSize: 14, marginBottom: 28 },
  field:     { marginBottom: 18 },
  label:     { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  inputRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.dark3, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 12 },
  inputIcon: { marginRight: 10 },
  input:     { flex: 1, color: colors.text, fontSize: 15 },
  btn:       { backgroundColor: colors.brand, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 8, shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
  link:      { marginTop: 16, alignItems: 'center' },
  linkText:  { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  verifyCard:{ alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 20 },
});

}