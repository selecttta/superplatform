import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS, PAYMENT_METHODS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt } from '../../utils/helpers';

export default function PaymentScreen({ route, navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
const { amount, title, bookingId, orderId, rideId } = route.params || {};
  const { user, profile } = useAuthStore();

  const [method,    setMethod]    = useState('mtn');
  const [momoNum,   setMomoNum]   = useState('');
  const [cardNum,   setCardNum]   = useState('');
  const [cardExp,   setCardExp]   = useState('');
  const [cardCvv,   setCardCvv]   = useState('');
  const [cardName,  setCardName]  = useState('');
  const [processing,setProcessing] = useState(false);

  const selectedMethod = PAYMENT_METHODS.find(m => m.id === method);
  const isMomo   = ['mtn','vodafone','airteltigo'].includes(method);
  const isCard   = method === 'card';
  const isWallet = method === 'wallet';

  const validate = () => {
    if (isMomo   && momoNum.replace(/\D/g,'').length < 10) { Alert.alert('Invalid Number', 'Enter a valid 10-digit mobile money number.'); return false; }
    if (isCard   && cardNum.replace(/\s/g,'').length < 16) { Alert.alert('Invalid Card', 'Enter your complete 16-digit card number.'); return false; }
    if (isCard   && !cardExp) { Alert.alert('Invalid Card', 'Enter the card expiry date.'); return false; }
    if (isCard   && cardCvv.length < 3) { Alert.alert('Invalid CVV', 'Enter a valid 3-digit CVV.'); return false; }
    if (isWallet && (profile?.wallet_balance || 0) < amount) { Alert.alert('Insufficient Balance', `Your wallet has ${fmt(profile?.wallet_balance || 0)}. Please top up.`); return false; }
    return true;
  };

  const processPayment = async () => {
    if (!validate()) return;
    setProcessing(true);

    try {
      // Simulate payment API call
      // In production: call your Paystack/MTN MoMo API via Supabase Edge Function
      await new Promise(r => setTimeout(r, 2200));

      // Record the payment in Supabase
      const paymentRecord = {
        user_id:        user.id,
        amount,
        method,
        status:         'completed',
        reference:      `SP-${Date.now()}`,
        booking_id:     bookingId || null,
        order_id:       orderId   || null,
        ride_id:        rideId    || null,
        created_at:     new Date().toISOString(),
      };

      const { error: payErr } = await supabase.from('payments').insert(paymentRecord);
      if (payErr) throw payErr;

      // Deduct from wallet if paying with wallet
      if (isWallet) {
        await supabase.rpc('deduct_wallet', { p_user_id: user.id, p_amount: amount });
      }

      // Record wallet transaction
      await supabase.from('wallet_transactions').insert({
        user_id:     user.id,
        amount:      -amount,
        type:        'payment',
        description: `Payment for ${title || 'service'}`,
        reference:   paymentRecord.reference,
        created_at:  new Date().toISOString(),
      });

      // Update booking/order status
      if (bookingId) {
        await supabase.from('bookings').update({ payment_status:'paid', status:'confirmed' }).eq('id', bookingId);
      }
      if (orderId) {
        await supabase.from('orders').update({ payment_status:'paid', status:'confirmed' }).eq('id', orderId);
      }
      if (rideId) {
        await supabase.from('rides').update({ payment_status:'paid', status:'completed' }).eq('id', rideId);
      }

      navigation.replace('PaymentSuccess', { amount, reference: paymentRecord.reference, title });
    } catch (err) {
      Alert.alert('Payment Failed', err.message || 'Transaction could not be processed. Try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>{title || 'Total Amount'}</Text>
          <Text style={styles.amountValue}>{fmt(amount)}</Text>
        </View>

        {/* Payment method selector */}
        <Text style={styles.sectionLabel}>Payment Method</Text>
        <View style={styles.methodGrid}>
          {PAYMENT_METHODS.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[styles.methodCard, method === m.id && styles.methodCardActive]}
              onPress={() => setMethod(m.id)}
            >
              <Text style={{ fontSize: 22 }}>{m.icon}</Text>
              <Text style={[styles.methodLabel, method === m.id && { color: m.color }]} numberOfLines={2}>
                {m.label}
              </Text>
              {method === m.id && (
                <View style={[styles.methodCheck, { backgroundColor: m.color }]}>
                  <Feather name="check" size={10} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Mobile money number */}
        {isMomo && (
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>{selectedMethod?.label} Number</Text>
            <TextInput
              style={styles.formInput}
              value={momoNum}
              onChangeText={setMomoNum}
              placeholder="e.g. 024 000 0000"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={13}
            />
            <Text style={styles.formHint}>
              You will receive a prompt on this number to authorize the payment.
            </Text>
          </View>
        )}

        {/* Card details */}
        {isCard && (
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Card Number</Text>
            <TextInput
              style={styles.formInput}
              value={cardNum}
              onChangeText={v => setCardNum(v.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim())}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={19}
            />
            <Text style={styles.formLabel}>Cardholder Name</Text>
            <TextInput
              style={styles.formInput}
              value={cardName}
              onChangeText={setCardName}
              placeholder="Name on card"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Expiry</Text>
                <TextInput
                  style={styles.formInput}
                  value={cardExp}
                  onChangeText={v => setCardExp(v.replace(/\D/g,'').replace(/^(.{2})/, '$1/').slice(0,5))}
                  placeholder="MM/YY"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>CVV</Text>
                <TextInput
                  style={styles.formInput}
                  value={cardCvv}
                  onChangeText={setCardCvv}
                  placeholder="•••"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                />
              </View>
            </View>
          </View>
        )}

        {/* Wallet balance info */}
        {isWallet && (
          <View style={styles.walletInfo}>
            <Feather name="info" size={14} color={colors.brand} />
            <Text style={styles.walletInfoTxt}>
              Your balance: {fmt(profile?.wallet_balance || 0)}.
              {(profile?.wallet_balance || 0) >= amount ? ' ✅ Sufficient for this payment.' : ' ❌ Insufficient. Please top up.'}
            </Text>
          </View>
        )}

        {/* Security info */}
        <View style={styles.securityRow}>
          <Feather name="shield" size={13} color="#10b981" />
          <Text style={styles.securityTxt}>256-bit SSL encrypted · Powered by Paystack</Text>
        </View>
      </ScrollView>

      {/* Pay button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payBtn, processing && styles.payBtnLoading]}
          onPress={processPayment}
          disabled={processing}
        >
          {processing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.payBtnTxt}>Pay {fmt(amount)}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  safe:             { flex:1, backgroundColor:colors.dark },
  header:           { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.06)' },
  headerTitle:      { fontSize:17, fontWeight:'700', color:colors.text },
  amountCard:       { backgroundColor:colors.dark3, borderRadius:16, padding:20, alignItems:'center', marginBottom:24, borderWidth:1, borderColor:colors.brand+'30' },
  amountLabel:      { fontSize:13, color:colors.textMuted, marginBottom:6 },
  amountValue:      { fontSize:32, fontWeight:'900', color:colors.text },
  sectionLabel:     { fontSize:12, fontWeight:'700', color:colors.textMuted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 },
  methodGrid:       { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:24 },
  methodCard:       { width:'47%', backgroundColor:colors.dark3, borderRadius:14, padding:14, borderWidth:2, borderColor:'rgba(255,255,255,0.08)', position:'relative', alignItems:'center', gap:6 },
  methodCardActive: { borderColor:colors.brand, backgroundColor:colors.brand+'08' },
  methodLabel:      { fontSize:11, fontWeight:'600', color:colors.textMuted, textAlign:'center' },
  methodCheck:      { position:'absolute', top:8, right:8, width:18, height:18, borderRadius:9, alignItems:'center', justifyContent:'center' },
  formSection:      { marginBottom:20 },
  formLabel:        { fontSize:12, fontWeight:'700', color:colors.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 },
  formInput:        { backgroundColor:colors.dark3, borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', paddingHorizontal:16, paddingVertical:14, fontSize:15, color:colors.text, marginBottom:12 },
  formHint:         { fontSize:12, color:colors.textMuted, lineHeight:17 },
  cardRow:          { flexDirection:'row', gap:12 },
  walletInfo:       { flexDirection:'row', alignItems:'flex-start', gap:8, backgroundColor:colors.brand+'10', borderRadius:12, padding:12, marginBottom:16, borderWidth:1, borderColor:colors.brand+'20' },
  walletInfoTxt:    { flex:1, fontSize:13, color:colors.text, lineHeight:18 },
  securityRow:      { flexDirection:'row', alignItems:'center', gap:6, justifyContent:'center', marginTop:8 },
  securityTxt:      { fontSize:12, color:colors.textMuted },
  footer:           { padding:16, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.06)', backgroundColor:colors.dark2 },
  payBtn:           { backgroundColor:colors.brand, borderRadius:14, paddingVertical:16, alignItems:'center', shadowColor:colors.brand, shadowOpacity:0.4, shadowRadius:16, shadowOffset:{width:0,height:4}, elevation:6 },
  payBtnLoading:    { opacity:0.7 },
  payBtnTxt:        { fontSize:17, fontWeight:'800', color:'#fff' },
});

}