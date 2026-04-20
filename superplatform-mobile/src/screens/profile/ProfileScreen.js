import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Switch, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt, initials } from '../../utils/helpers';
import { Card, Button, Divider, StatBox, Avatar, Badge } from '../../components/ui';

const TABS = ['Profile', 'Wallet', 'Settings', 'Notifications'];

export default function ProfileScreen({ navigation }) {
      
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useStyles(colors);
  
const { user, profile, role, signOut, updateProfile, uploadAvatar } = useAuthStore();
  const [tab,       setTab]       = useState('Profile');
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState({
    full_name: profile?.full_name || '',
    phone:     profile?.phone || '',
    location:  profile?.location || '',
    bio:       profile?.bio || '',
  });
  const [notifs,    setNotifs]    = useState({
    bookings: true, messages: true, promos: false, security: true,
  });

  const handleSave = async () => {
    setSaving(true);
    const result = await updateProfile(form);
    setSaving(false);
    if (result.success) { setEditing(false); Alert.alert('✅', 'Profile updated!'); }
    else Alert.alert('Error', result.error);
  };

  const handleAvatarPick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [1,1] });
    if (!r.canceled) {
      const res = await uploadAvatar(r.assets[0].uri);
      if (!res.success) Alert.alert('Error', 'Could not upload image.');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const walletBalance = profile?.wallet_balance || 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* ── PROFILE TAB ───────────────────────────────────── */}
        {tab === 'Profile' && (
          <>
            {/* Avatar + name */}
            <Card style={{ padding: 20, alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={handleAvatarPick} style={{ position: 'relative' }}>
                <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={80} />
                <View style={styles.avatarEdit}>
                  <Feather name="camera" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.userName}>{profile?.full_name || user?.email || 'User'}</Text>
                <Text style={styles.userEmail}>{profile?.email || user?.email}</Text>
                <Badge label={role?.charAt(0).toUpperCase() + role?.slice(1) || 'Customer'} color={colors.brand} />
              </View>
            </Card>

            {/* Edit form */}
            <Card style={{ padding: 16, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Personal Info</Text>
                <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)} disabled={saving}>
                  <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 14 }}>
                    {saving ? 'Saving…' : editing ? 'Save' : 'Edit'}
                  </Text>
                </TouchableOpacity>
              </View>
              {[
                { key:'full_name', label:'Full Name',    icon:'user',     keyboard:'default' },
                { key:'phone',     label:'Phone',        icon:'phone',    keyboard:'phone-pad' },
                { key:'location',  label:'Location',     icon:'map-pin',  keyboard:'default' },
                { key:'bio',       label:'Bio',          icon:'file-text',keyboard:'default', multi:true },
              ].map(f => (
                <View key={f.key} style={styles.fieldRow}>
                  <Feather name={f.icon} size={16} color={colors.textMuted} style={{ width: 20 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    {editing
                      ? <TextInput
                          style={[styles.field, f.multi && { height: 70, textAlignVertical: 'top' }]}
                          value={form[f.key]}
                          onChangeText={v => setForm(x => ({ ...x, [f.key]: v }))}
                          keyboardType={f.keyboard}
                          multiline={f.multi}
                          placeholderTextColor={colors.textMuted}
                        />
                      : <Text style={styles.fieldValue}>{profile?.[f.key] || '—'}</Text>
                    }
                  </View>
                </View>
              ))}
            </Card>

            {/* Sign out */}
            <Button label="Sign Out" variant="danger" onPress={handleSignOut} icon="log-out" />
          </>
        )}

        {/* ── WALLET TAB ────────────────────────────────────── */}
        {tab === 'Wallet' && (
          <>
            <Card style={{ padding: 24, alignItems: 'center', gap: 4, borderColor: colors.brand + '30' }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>SP Wallet Balance</Text>
              <Text style={{ color: colors.text, fontSize: 44, fontWeight: '900' }}>{fmt(walletBalance)}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Available for payments & withdrawals</Text>
            </Card>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button label="+ Top Up" variant="primary" style={{ flex: 1 }}
                onPress={() => Alert.alert('Top Up', 'Select an amount to add to your wallet:\n\nGH₵50, GH₵100, GH₵200, GH₵500', [
                  { text: 'GH₵50',  onPress: () => {} },
                  { text: 'GH₵100', onPress: () => {} },
                  { text: 'Cancel', style: 'cancel' },
                ])} />
              <Button label="↑ Withdraw" variant="secondary" style={{ flex: 1 }}
                onPress={() => Alert.alert('Withdraw', 'Enter the amount to withdraw to your mobile money account.')} />
            </View>

            <SectionTitle title="Transaction History" />
            {[
              { label:'Ride Payment',     amount:-45,  date:'Today',       method:'Wallet',  positive:false },
              { label:'Wallet Top-up',    amount:200,  date:'Yesterday',   method:'MTN MoMo',positive:true  },
              { label:'Home Service',     amount:-120, date:'Jan 20',      method:'Wallet',  positive:false },
              { label:'Wallet Top-up',    amount:100,  date:'Jan 18',      method:'Card',    positive:true  },
            ].map((t, i) => (
              <Card key={i} style={{ padding: 14, flexDirection:'row', gap:14, alignItems:'center' }}>
                <View style={[styles.txIcon, { backgroundColor: t.positive ? '#10b98120' : '#ef444420' }]}>
                  <Feather name={t.positive ? 'arrow-down-left' : 'arrow-up-right'} size={16} color={t.positive ? '#10b981' : '#ef4444'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{t.label}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t.date} · {t.method}</Text>
                </View>
                <Text style={{ color: t.positive ? '#10b981' : '#ef4444', fontWeight: '800', fontSize: 16 }}>
                  {t.positive ? '+' : ''}{fmt(t.amount)}
                </Text>
              </Card>
            ))}
          </>
        )}

        {/* ── SETTINGS TAB ──────────────────────────────────── */}
        {tab === 'Settings' && (
          <>
            <SectionTitle title="Account" />
            {[
              { icon:'lock',      label:'Change Password',    onPress: () => Alert.alert('Reset Password', 'A reset link will be sent to your email.') },
              { icon:'bell',      label:'Notification Preferences', onPress: () => setTab('Notifications') },
              { icon:'credit-card',label:'Payment Methods',   onPress: () => setTab('Wallet') },
              { icon:'shield',    label:'Privacy & Security', onPress: () => {} },
              { icon:'help-circle',label:'Help & Support',    onPress: () => {} },
              { icon:'file-text', label:'Terms of Service',   onPress: () => {} },
            ].map(item => (
              <Card key={item.label} style={{ padding: 14 }} onPress={item.onPress}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.dark4, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={item.icon} size={17} color={colors.textMuted} />
                  </View>
                  <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{item.label}</Text>
                  <Feather name="chevron-right" size={16} color={colors.textMuted} />
                </View>
              </Card>
            ))}
            <Divider />
            <SectionTitle title="Appearance" />
            <Card style={{ padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.dark4, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={isDark ? 'moon' : 'sun'} size={17} color={colors.textMuted} />
                </View>
                <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>Dark Mode</Text>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#374151', true: colors.brand + '80' }}
                  thumbColor={isDark ? colors.brand : '#6b7280'}
                />
              </View>
            </Card>
            <Divider />
            <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center' }}>
              SuperPlatform GH v1.0.0 · Made in Ghana 🇬🇭
            </Text>
          </>
        )}

        {/* ── NOTIFICATIONS TAB ─────────────────────────────── */}
        {tab === 'Notifications' && (
          <>
            <SectionTitle title="Notification Preferences" />
            {[
              { key:'bookings', label:'Booking Updates',      sub:'Confirmations, reminders, status changes' },
              { key:'messages', label:'New Messages',          sub:'Chat messages from providers & customers' },
              { key:'promos',   label:'Promotions & Offers',  sub:'Deals, discounts & seasonal promotions' },
              { key:'security', label:'Security Alerts',       sub:'Login attempts & account changes' },
            ].map(item => (
              <Card key={item.key} style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{item.label}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{item.sub}</Text>
                  </View>
                  <Switch
                    value={notifs[item.key]}
                    onValueChange={v => setNotifs(n => ({ ...n, [item.key]: v }))}
                    trackColor={{ false: '#374151', true: colors.brand + '80' }}
                    thumbColor={notifs[item.key] ? colors.brand : '#6b7280'}
                  />
                </View>
              </Card>
            ))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }) {
  return <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>;
}

function useStyles(colors) {
  return StyleSheet.create({
  tabScroll:    { flexGrow:0, paddingVertical:12 },
  tab:          { paddingHorizontal:16, paddingVertical:8, borderRadius:20, backgroundColor:colors.dark3, borderWidth:1, borderColor:colors.border },
  tabActive:    { backgroundColor:colors.brand, borderColor:colors.brand },
  tabText:      { color:colors.textMuted, fontWeight:'600', fontSize:13 },
  tabTextActive:{ color:'#fff' },
  avatarEdit:   { position:'absolute', bottom:0, right:0, width:24, height:24, borderRadius:12, backgroundColor:colors.brand, alignItems:'center', justifyContent:'center' },
  userName:     { color:colors.text, fontSize:20, fontWeight:'800' },
  userEmail:    { color:colors.textMuted, fontSize:13, marginBottom:6 },
  fieldRow:     { flexDirection:'row', gap:12, alignItems:'flex-start', paddingVertical:10, borderBottomWidth:1, borderBottomColor:colors.border },
  fieldLabel:   { color:colors.textMuted, fontSize:11, fontWeight:'600', marginBottom:2 },
  fieldValue:   { color:colors.text, fontSize:14 },
  field:        { color:colors.text, fontSize:14, borderBottomWidth:1, borderBottomColor:colors.brand, paddingVertical:4 },
  txIcon:       { width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center' },
});

}