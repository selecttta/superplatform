import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS, PAYMENT_METHODS, CURRENCY } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt } from '../../utils/helpers';

export default function PaymentSheet({ visible, amount, title, orderId, onSuccess, onClose }) {
  const { colors } = useTheme();
  const { user, profile } = useAuthStore();
  const [method,  setMethod]  = useState('mtn');
  const [momoNum, setMomoNum] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [expiry,  setExpiry]  = useState('');
  const [cvv,     setCvv]     = useState('');
  const [loading, setLoading] = useState(false);

  const momoMethods = ['mtn', 'vodafone', 'airteltigo'];
  const isMomo = momoMethods.includes(method);
  const isCard = method === 'card';
  const isWallet = method === 'wallet';

  const handlePay = async () => {
    // Validation
    if (isMomo && !momoNum.match(/^0\d{9}$/)) {
      Alert.alert('Invalid Number', 'Enter a valid 10-digit mobile money number (e.g. 0241234567)');
      return;
    }
    if (isCard) {
      if (cardNum.replace(/\s/g, '').length < 16) {
        Alert.alert('Invalid Card', 'Enter a valid 16-digit card number');
        return;
      }
      if (!expiry.match(/^\d{2}\/\d{2}$/)) {
        Alert.alert('Invalid Expiry', 'Enter expiry as MM/YY');
        return;
      }
      if (cvv.length < 3) {
        Alert.alert('Invalid CVV', 'Enter a valid 3–4 digit CVV');
        return;
      }
    }
    if (isWallet && (profile?.wallet_balance || 0) < amount) {
      Alert.alert('Insufficient Balance', `Your SP Wallet balance (${fmt(profile?.wallet_balance || 0)}) is too low.`);
      return;
    }

    setLoading(true);
    try {
      // Record transaction in Supabase
      const { error } = await supabase.from('wallet_transactions').insert({
        user_id:        user.id,
        type:           'payment',
        amount:         amount,
        reference:      orderId || `TXN-${Date.now()}`,
        payment_method: method,
        phone:          isMomo ? momoNum : null,
        status:         'completed',
        description:    title,
        created_at:     new Date().toISOString(),
      });
      if (error) throw error;

      // If wallet payment — deduct balance
      if (isWallet) {
        await supabase
          .from('profiles')
          .update({ wallet_balance: (profile.wallet_balance || 0) - amount })
          .eq('id', user.id);
      }

      onSuccess?.({ method, amount, reference: `TXN-${Date.now()}` });
    } catch (err) {
      Alert.alert('Payment Failed', err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCard = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{title || 'Complete Payment'}</Text>
                <Text style={styles.amount}>{fmt(amount)}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Payment method selector */}
              <Text style={styles.label}>Select Payment Method</Text>
              <View style={styles.methodGrid}>
                {PAYMENT_METHODS.map(pm => (
                  <TouchableOpacity
                    key={pm.id}
                    onPress={() => setMethod(pm.id)}
                    style={[styles.methodBtn, method === pm.id && { borderColor: pm.color, backgroundColor: pm.color + '15' }]}
                  >
                    <Text style={styles.methodIcon}>{pm.icon}</Text>
                    <Text style={[styles.methodLabel, method === pm.id && { color: pm.color }]} numberOfLines={2}>
                      {pm.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Mobile money input */}
              {isMomo && (
                <View style={styles.inputSection}>
                  <Text style={styles.label}>Mobile Money Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0241234567"
                    placeholderTextColor={colors.textMuted}
                    value={momoNum}
                    onChangeText={setMomoNum}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  <Text style={styles.hint}>You'll receive a payment prompt on your phone</Text>
                </View>
              )}

              {/* Card input */}
              {isCard && (
                <View style={styles.inputSection}>
                  <Text style={styles.label}>Card Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0000 0000 0000 0000"
                    placeholderTextColor={colors.textMuted}
                    value={cardNum}
                    onChangeText={v => setCardNum(formatCard(v))}
                    keyboardType="number-pad"
                    maxLength={19}
                  />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Expiry</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="MM/YY"
                        placeholderTextColor={colors.textMuted}
                        value={expiry}
                        onChangeText={v => setExpiry(formatExpiry(v))}
                        keyboardType="number-pad"
                        maxLength={5}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>CVV</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="123"
                        placeholderTextColor={colors.textMuted}
                        value={cvv}
                        onChangeText={setCvv}
                        keyboardType="number-pad"
                        maxLength={4}
                        secureTextEntry
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Wallet */}
              {isWallet && (
                <View style={[styles.inputSection, { backgroundColor: colors.dark4, borderRadius: 14, padding: 14 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>SP Wallet Balance</Text>
                    <Text style={{ color: (profile?.wallet_balance || 0) >= amount ? '#10b981' : '#ef4444', fontWeight: '700', fontSize: 16 }}>
                      {fmt(profile?.wallet_balance || 0)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>Amount to Pay</Text>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{fmt(amount)}</Text>
                  </View>
                </View>
              )}

              {/* Security note */}
              <View style={styles.securityNote}>
                <Feather name="lock" size={12} color={colors.textMuted} />
                <Text style={styles.securityText}>256-bit SSL encrypted. Powered by Paystack.</Text>
              </View>

              {/* Pay button */}
              <TouchableOpacity
                onPress={handlePay}
                disabled={loading}
                style={[styles.payBtn, { opacity: loading ? 0.7 : 1 }]}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Feather name="credit-card" size={18} color="#fff" />
                      <Text style={styles.payBtnText}>Pay {fmt(amount)}</Text>
                    </>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: COLORS.dark2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:        { color: COLORS.textMuted, fontSize: 13, marginBottom: 4 },
  amount:       { color: COLORS.text, fontSize: 28, fontWeight: '800' },
  closeBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.dark4, alignItems: 'center', justifyContent: 'center' },
  label:        { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  methodGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodBtn:    { width: '30%', flex: 1, alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.dark3 },
  methodIcon:   { fontSize: 22, marginBottom: 4 },
  methodLabel:  { color: COLORS.textMuted, fontSize: 10, textAlign: 'center', fontWeight: '600' },
  inputSection: { marginTop: 4 },
  input:        { backgroundColor: COLORS.dark4, borderRadius: 14, padding: 14, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  hint:         { color: COLORS.textMuted, fontSize: 11, marginTop: -8, marginBottom: 8 },
  securityNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 12 },
  securityText: { color: COLORS.textMuted, fontSize: 11 },
  payBtn:       { backgroundColor: COLORS.brand, borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 16 },
  payBtnText:   { color: '#fff', fontSize: 17, fontWeight: '800' },
});
