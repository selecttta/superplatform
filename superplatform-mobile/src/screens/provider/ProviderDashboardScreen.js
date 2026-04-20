import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  FlatList, Image, Alert, Switch, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt, fmtDate } from '../../utils/helpers';
import { Card, Button, Badge, StatBox, SectionHeader, Divider, Avatar, EmptyState } from '../../components/ui';

const TABS = ['Overview', 'Listings', 'Bookings', 'Earnings', 'Settings'];
const ONBOARDING_STEPS = ['Business Info', 'Category & Services', 'ID Verification', 'Submit'];
const CATEGORIES = ['Transport', 'Home Services', 'Beauty & Fashion', 'Health', 'E-Commerce', 'Real Estate', 'Rentals'];
const STATUS_COLORS = { pending:'#f59e0b', confirmed:'#3b82f6', completed:'#10b981', cancelled:'#ef4444' };

export default function ProviderDashboardScreen({ navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
const { user, profile, updateProfile } = useAuthStore();
  const [tab,        setTab]        = useState('Overview');
  const [step,       setStep]       = useState(0);
  const [isOnline,   setIsOnline]   = useState(false);
  const [listings,   setListings]   = useState([]);
  const [bookings,   setBookings]   = useState([]);
  const [earnings,   setEarnings]   = useState({ total: 0, month: 0, pending: 0 });
  const [refreshing, setRefreshing] = useState(false);

  // Onboarding form state
  const [form, setForm] = useState({
    businessName: '', phone: '', location: '', bio: '',
    category: '', specialties: '',
    idType: 'National ID', idNumber: '', idImg: null,
  });

  const isOnboarded     = profile?.onboarding_complete;
  const isPendingApproval = profile?.is_approved === false && isOnboarded;

  const load = useCallback(async () => {
    if (!user) return;
    try {
      // Load listings
      const { data: listData } = await supabase
        .from('listings').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setListings(listData || []);

      // Load bookings
      const { data: bookData } = await supabase
        .from('bookings').select('*, profiles!bookings_customer_id_fkey(full_name, avatar_url)').eq('provider_id', user.id).order('created_at', { ascending: false }).limit(20);
      setBookings(bookData || []);

      // Load earnings summary
      const { data: txns } = await supabase
        .from('wallet_transactions').select('amount, created_at').eq('user_id', user.id).eq('type', 'payment');
      const now   = new Date();
      const total = (txns || []).reduce((s, t) => s + (t.amount || 0), 0);
      const month = (txns || []).filter(t => new Date(t.created_at).getMonth() === now.getMonth()).reduce((s, t) => s + t.amount, 0);
      setEarnings({ total, month, pending: total * 0.1 });
    } catch {}
  }, [user]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Toggle online status
  const toggleOnline = async (val) => {
    setIsOnline(val);
    await supabase.from('profiles').update({ is_online: val }).eq('id', user.id);
  };

  // Submit onboarding
  const submitOnboarding = async () => {
    if (!form.businessName || !form.category || !form.idNumber) {
      Alert.alert('Missing Info', 'Please complete all required fields.');
      return;
    }
    try {
      await supabase.from('profiles').update({
        full_name:           form.businessName,
        phone:               form.phone,
        location:            form.location,
        bio:                 form.bio,
        category:            form.category.toLowerCase().replace(/ & | /g, '-'),
        specialty:           form.specialties,
        id_type:             form.idType,
        id_number:           form.idNumber,
        onboarding_complete: true,
        is_approved:         false,
        updated_at:          new Date().toISOString(),
      }).eq('id', user.id);
      await updateProfile({ onboarding_complete: true });
      Alert.alert('✅ Submitted!', 'Your application is under review. We\'ll notify you within 24 hours.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Add listing
  const addListing = () => navigation.navigate('AddListing');

  // Toggle listing status
  const toggleListing = async (id, currentStatus) => {
    const newStatus = currentStatus === 'approved' ? 'paused' : 'pending';
    await supabase.from('listings').update({ status: newStatus }).eq('id', id);
    setListings(l => l.map(i => i.id === id ? { ...i, status: newStatus } : i));
  };

  // ── ONBOARDING FLOW ───────────────────────────────────────────────────────
  if (!isOnboarded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          {/* Progress */}
          <Text style={styles.title}>Become a Provider</Text>
          <View style={{ gap: 8 }}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((step + 1) / ONBOARDING_STEPS.length) * 100}%` }]} />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              Step {step + 1} of {ONBOARDING_STEPS.length}: {ONBOARDING_STEPS[step]}
            </Text>
          </View>

          {/* Step 1: Business Info */}
          {step === 0 && (
            <Card style={{ padding: 16, gap: 4 }}>
              <Text style={styles.stepTitle}>Business Information</Text>
              {[
                { key:'businessName', label:'Business / Full Name', placeholder:'e.g. Kofi Electric Services' },
                { key:'phone',        label:'Phone Number',         placeholder:'+233 24 000 0000', keyboard:'phone-pad' },
                { key:'location',     label:'Service Location',     placeholder:'e.g. East Legon, Accra' },
                { key:'bio',          label:'About Your Business',  placeholder:'Describe your services…', multi:true },
              ].map(f => (
                <View key={f.key}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={[styles.field, f.multi && { height: 90, textAlignVertical: 'top' }]}
                    placeholder={f.placeholder} placeholderTextColor={colors.textMuted}
                    value={form[f.key]} onChangeText={v => setForm(x => ({ ...x, [f.key]: v }))}
                    keyboardType={f.keyboard || 'default'} multiline={f.multi}
                  />
                </View>
              ))}
            </Card>
          )}

          {/* Step 2: Category */}
          {step === 1 && (
            <Card style={{ padding: 16, gap: 8 }}>
              <Text style={styles.stepTitle}>Category & Services</Text>
              <Text style={styles.fieldLabel}>Select Your Category</Text>
              <View style={{ gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat} onPress={() => setForm(x => ({ ...x, category: cat }))}
                    style={[styles.catOption, form.category === cat && { borderColor: colors.brand, backgroundColor: colors.brand + '15' }]}>
                    <Text style={[styles.catOptionText, form.category === cat && { color: colors.brand }]}>{cat}</Text>
                    {form.category === cat && <Feather name="check" size={16} color={colors.brand} />}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Specific Specialties</Text>
              <TextInput style={styles.field} placeholder="e.g. Plumbing, Electrical, AC repair"
                placeholderTextColor={colors.textMuted} value={form.specialties}
                onChangeText={v => setForm(x => ({ ...x, specialties: v }))} />
            </Card>
          )}

          {/* Step 3: ID Verification */}
          {step === 2 && (
            <Card style={{ padding: 16, gap: 8 }}>
              <Text style={styles.stepTitle}>Identity Verification</Text>
              <View style={styles.verifyNote}>
                <Feather name="shield" size={16} color='#3b82f6' />
                <Text style={{ color: colors.textMuted, fontSize: 13, flex: 1 }}>
                  We verify all providers to ensure customer safety. Your data is encrypted and secure.
                </Text>
              </View>
              <Text style={styles.fieldLabel}>ID Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['National ID', 'Passport', "Driver's License", 'Voter ID'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setForm(x => ({ ...x, idType: t }))}
                    style={[styles.catOption, form.idType === t && { borderColor: colors.brand, backgroundColor: colors.brand + '15' }]}>
                    <Text style={[styles.catOptionText, form.idType === t && { color: colors.brand }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>ID Number</Text>
              <TextInput style={styles.field} placeholder="Enter your ID number"
                placeholderTextColor={colors.textMuted} value={form.idNumber}
                onChangeText={v => setForm(x => ({ ...x, idNumber: v }))} />
              <TouchableOpacity
                onPress={async () => {
                  const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });
                  if (!r.canceled) setForm(x => ({ ...x, idImg: r.assets[0].uri }));
                }}
                style={styles.uploadBtn}>
                <Feather name="upload" size={16} color={colors.brand} />
                <Text style={{ color: colors.brand, fontWeight: '600' }}>
                  {form.idImg ? 'ID Uploaded ✓' : 'Upload ID Photo'}
                </Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Step 4: Review */}
          {step === 3 && (
            <Card style={{ padding: 16, gap: 10 }}>
              <Text style={styles.stepTitle}>Review & Submit</Text>
              {[
                { label:'Business Name', value: form.businessName },
                { label:'Category',      value: form.category },
                { label:'Location',      value: form.location },
                { label:'ID Type',       value: form.idType },
              ].map(f => (
                <View key={f.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{f.label}</Text>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{f.value || '—'}</Text>
                </View>
              ))}
              <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 }}>
                By submitting, you agree to SuperPlatform's provider terms of service. Your application will be reviewed within 24 hours.
              </Text>
            </Card>
          )}

          {/* Navigation buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {step > 0 && (
              <Button label="← Back" variant="secondary" style={{ flex: 1 }} onPress={() => setStep(s => s - 1)} />
            )}
            <Button
              label={step < ONBOARDING_STEPS.length - 1 ? 'Continue →' : '🚀 Submit Application'}
              style={{ flex: 2 }}
              onPress={step < ONBOARDING_STEPS.length - 1 ? () => setStep(s => s + 1) : submitOnboarding}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── PENDING APPROVAL ──────────────────────────────────────────────────────
  if (isPendingApproval) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⏳</Text>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>Application Under Review</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
          Our team is reviewing your application. You'll receive an SMS notification within 24 hours.
        </Text>
        <Card style={{ padding: 16, gap: 10, width: '100%' }}>
          {[
            { icon:'check-circle', label:'Profile submitted', done: true },
            { icon:'clock',        label:'Admin review in progress', done: false },
            { icon:'bell',         label:'Approval notification', done: false },
            { icon:'star',         label:'Start taking bookings', done: false },
          ].map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Feather name={s.icon} size={18} color={s.done ? '#10b981' : colors.textMuted} />
              <Text style={{ color: s.done ? colors.text : colors.textMuted, fontSize: 14 }}>{s.label}</Text>
            </View>
          ))}
        </Card>
      </SafeAreaView>
    );
  }

  // ── MAIN DASHBOARD ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}>

        {/* ── OVERVIEW ──────────────────────────────────────── */}
        {tab === 'Overview' && (
          <View style={{ padding: 16, gap: 16 }}>
            {/* Online toggle */}
            <Card style={{ padding: 16, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <View>
                <Text style={{ color:colors.text, fontWeight:'700', fontSize:16 }}>
                  {isOnline ? '🟢 You\'re Online' : '⚫ You\'re Offline'}
                </Text>
                <Text style={{ color:colors.textMuted, fontSize:12, marginTop:2 }}>
                  {isOnline ? 'Customers can find and book you' : 'You won\'t receive new bookings'}
                </Text>
              </View>
              <Switch value={isOnline} onValueChange={toggleOnline} trackColor={{ false:'#374151', true: colors.brand + '80' }} thumbColor={isOnline ? colors.brand : '#6b7280'} />
            </Card>

            {/* Stats */}
            <View style={{ flexDirection:'row', gap:10 }}>
              <StatBox label="Total Earned" value={fmt(earnings.total)} icon="dollar-sign" color="#10b981" />
              <StatBox label="This Month"   value={fmt(earnings.month)} icon="trending-up" color="#3b82f6" />
            </View>
            <View style={{ flexDirection:'row', gap:10 }}>
              <StatBox label="Active Listings" value={listings.filter(l => l.status === 'approved').length.toString()} icon="list" color={colors.brand} />
              <StatBox label="Total Bookings"  value={bookings.length.toString()} icon="calendar" color="#8b5cf6" />
            </View>

            {/* Recent bookings preview */}
            <SectionHeader title="Recent Bookings" action="View All" onAction={() => setTab('Bookings')} />
            {bookings.slice(0, 3).map(b => (
              <Card key={b.id} style={{ padding: 14, flexDirection:'row', gap:12, alignItems:'center' }}>
                <Avatar name={b.profiles?.full_name} uri={b.profiles?.avatar_url} size={40} />
                <View style={{ flex:1 }}>
                  <Text style={{ color:colors.text, fontWeight:'600' }}>{b.profiles?.full_name || 'Customer'}</Text>
                  <Text style={{ color:colors.textMuted, fontSize:12 }}>{fmtDate(b.scheduled_at) || fmtDate(b.created_at)}</Text>
                </View>
                <View style={{ alignItems:'flex-end', gap:4 }}>
                  <Badge label={b.status || 'pending'} color={STATUS_COLORS[b.status] || '#6b7280'} />
                  <Text style={{ color:colors.text, fontWeight:'700' }}>{fmt(b.total_price || 0)}</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* ── LISTINGS ──────────────────────────────────────── */}
        {tab === 'Listings' && (
          <View style={{ padding: 16, gap: 14 }}>
            <Button label="+ Add New Listing" onPress={addListing} />
            {listings.length === 0
              ? <EmptyState icon="list" title="No listings yet" subtitle="Add your first service or product listing" action="Add Listing" onAction={addListing} />
              : listings.map(listing => (
                  <Card key={listing.id} style={{ padding: 14 }}>
                    <View style={{ flexDirection:'row', gap:12, alignItems:'center' }}>
                      {listing.images?.[0] && <Image source={{ uri:listing.images[0] }} style={{ width:56, height:56, borderRadius:12 }} />}
                      <View style={{ flex:1 }}>
                        <Text style={{ color:colors.text, fontWeight:'700' }} numberOfLines={1}>{listing.title}</Text>
                        <Text style={{ color:colors.brand, fontWeight:'700', marginTop:2 }}>{fmt(listing.price)}</Text>
                      </View>
                      <View style={{ alignItems:'flex-end', gap:6 }}>
                        <Badge
                          label={listing.status === 'approved' ? 'Live' : listing.status === 'pending' ? 'Pending' : listing.status}
                          color={listing.status === 'approved' ? '#10b981' : listing.status === 'pending' ? '#f59e0b' : '#6b7280'}
                        />
                        {listing.status === 'approved' && (
                          <TouchableOpacity onPress={() => toggleListing(listing.id, listing.status)}>
                            <Text style={{ color:'#ef4444', fontSize:12 }}>Pause</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </Card>
                ))
            }
          </View>
        )}

        {/* ── BOOKINGS ──────────────────────────────────────── */}
        {tab === 'Bookings' && (
          <View style={{ padding: 16, gap: 12 }}>
            {bookings.length === 0
              ? <EmptyState icon="calendar" title="No bookings yet" subtitle="Bookings from customers will appear here" />
              : bookings.map(b => (
                  <Card key={b.id} style={{ padding: 14, gap: 10 }}>
                    <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                      <View style={{ flexDirection:'row', gap:10, alignItems:'center' }}>
                        <Avatar name={b.profiles?.full_name} uri={b.profiles?.avatar_url} size={40} />
                        <View>
                          <Text style={{ color:colors.text, fontWeight:'700' }}>{b.profiles?.full_name || 'Customer'}</Text>
                          <Text style={{ color:colors.textMuted, fontSize:12 }}>{fmtDate(b.scheduled_at || b.created_at)}</Text>
                        </View>
                      </View>
                      <Badge label={b.status || 'pending'} color={STATUS_COLORS[b.status] || '#6b7280'} />
                    </View>
                    <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                      <Text style={{ color:colors.textMuted, fontSize:13 }}>{b.notes || 'Standard service booking'}</Text>
                      <Text style={{ color:colors.text, fontWeight:'700' }}>{fmt(b.total_price || 0)}</Text>
                    </View>
                    {(b.status === 'pending' || b.status === 'confirmed') && (
                      <View style={{ flexDirection:'row', gap:8 }}>
                        <Button label="✓ Confirm" variant="green" size="sm" style={{ flex:1 }}
                          onPress={async () => {
                            await supabase.from('bookings').update({ status:'confirmed' }).eq('id', b.id);
                            setBookings(bk => bk.map(x => x.id === b.id ? { ...x, status:'confirmed' } : x));
                          }} />
                        <Button label="✗ Decline" variant="danger" size="sm" style={{ flex:1 }}
                          onPress={async () => {
                            await supabase.from('bookings').update({ status:'cancelled' }).eq('id', b.id);
                            setBookings(bk => bk.map(x => x.id === b.id ? { ...x, status:'cancelled' } : x));
                          }} />
                      </View>
                    )}
                  </Card>
                ))
            }
          </View>
        )}

        {/* ── EARNINGS ──────────────────────────────────────── */}
        {tab === 'Earnings' && (
          <View style={{ padding: 16, gap: 16 }}>
            <Card style={{ padding: 20, gap: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Total Earned (All Time)</Text>
              <Text style={{ color: colors.text, fontSize: 36, fontWeight: '800' }}>{fmt(earnings.total)}</Text>
              <Text style={{ color: '#10b981', fontSize: 13 }}>↑ {fmt(earnings.month)} this month</Text>
            </Card>
            <View style={{ flexDirection:'row', gap:10 }}>
              <Card style={{ flex:1, padding:14, gap:4 }}>
                <Text style={{ color:colors.textMuted, fontSize:12 }}>Pending Payout</Text>
                <Text style={{ color:colors.text, fontSize:20, fontWeight:'800' }}>{fmt(earnings.pending)}</Text>
              </Card>
              <Card style={{ flex:1, padding:14, gap:4 }}>
                <Text style={{ color:colors.textMuted, fontSize:12 }}>Platform Commission</Text>
                <Text style={{ color:'#ef4444', fontSize:20, fontWeight:'800' }}>15%</Text>
              </Card>
            </View>
            <Button label="Request Payout" variant="primary" size="lg"
              onPress={() => Alert.alert('Payout Requested', 'Your payout will be processed within 2 business days to your registered mobile money number.')} />
          </View>
        )}

        {/* ── SETTINGS ──────────────────────────────────────── */}
        {tab === 'Settings' && (
          <View style={{ padding: 16, gap: 16 }}>
            <Card style={{ padding: 16, gap: 12 }}>
              <Text style={{ color:colors.text, fontSize:16, fontWeight:'700' }}>Business Details</Text>
              
              <Text style={styles.fieldLabel}>Business Name</Text>
              <TextInput style={styles.field} value={profile?.business_name || profile?.full_name} 
                         editable={false} />
                         
              <Text style={styles.fieldLabel}>Contact Number</Text>
              <TextInput style={styles.field} value={profile?.phone} 
                         editable={false} />
            </Card>

            <Card style={{ padding: 16, gap: 12 }}>
              <Text style={{ color:colors.text, fontSize:16, fontWeight:'700' }}>Privacy & Communication</Text>
              
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                <View style={{ flex:0.9 }}>
                  <Text style={{ color:colors.text, fontWeight:'600' }}>Receive Direct Chats</Text>
                  <Text style={{ color:colors.textMuted, fontSize:12, marginTop:2 }}>Allow customers to message you.</Text>
                </View>
                <Switch value={profile?.privacy_settings?.disable_chats !== true} onValueChange={() => {
                  const current = profile?.privacy_settings || {};
                  updateProfile({ privacy_settings: { ...current, disable_chats: !(current.disable_chats === true) }});
                }} trackColor={{ false:'#374151', true: colors.brand + '80' }} thumbColor={profile?.privacy_settings?.disable_chats !== true ? colors.brand : '#6b7280'} />
              </View>

              <Divider />
              
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', opacity:0.5 }}>
                <View style={{ flex:0.9 }}>
                  <Text style={{ color:colors.text, fontWeight:'600' }}>Disable Feedback</Text>
                  <Text style={{ color:colors.textMuted, fontSize:12, marginTop:2 }}>VIP / Enterprise Only feature.</Text>
                </View>
                <Switch value={false} disabled />
              </View>
            </Card>

            <Card style={{ padding: 16, gap: 12 }}>
              <Text style={{ color:colors.text, fontSize:16, fontWeight:'700' }}>Notifications</Text>
              
              {['Account Alerts', 'Promotions', 'Seller Tips'].map((n) => (
                <View key={n} style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <Text style={{ color:colors.text, fontWeight:'600' }}>{n}</Text>
                  <Switch value={true} onValueChange={() => {}} trackColor={{ false:'#374151', true: colors.brand + '80' }} thumbColor={colors.brand} />
                </View>
              ))}
            </Card>
            
            <Button label="Logout" variant="danger" onPress={() => useAuthStore.getState().signOut()} />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  title:       { color:colors.text, fontSize:24, fontWeight:'800' },
  progressBar: { height:4, backgroundColor:colors.dark4, borderRadius:2, overflow:'hidden' },
  progressFill:{ height:4, backgroundColor:colors.brand, borderRadius:2 },
  stepTitle:   { color:colors.text, fontSize:17, fontWeight:'700', marginBottom:12 },
  fieldLabel:  { color:colors.textMuted, fontSize:12, fontWeight:'600', marginBottom:6, marginTop:10 },
  field:       { backgroundColor:colors.dark4, borderRadius:12, padding:12, color:colors.text, fontSize:14, borderWidth:1, borderColor:colors.border },
  catOption:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:12, borderRadius:12, borderWidth:1, borderColor:colors.border, backgroundColor:colors.dark3 },
  catOptionText:{ color:colors.textMuted, fontSize:14, fontWeight:'600' },
  verifyNote:  { flexDirection:'row', gap:10, backgroundColor:'#3b82f610', borderRadius:12, padding:12, alignItems:'flex-start' },
  uploadBtn:   { flexDirection:'row', gap:8, alignItems:'center', borderWidth:1, borderColor:colors.brand, borderStyle:'dashed', borderRadius:12, padding:14, justifyContent:'center', marginTop:8 },
  tabScroll:   { flexGrow:0, paddingVertical:12 },
  tab:         { paddingHorizontal:16, paddingVertical:8, borderRadius:20, backgroundColor:colors.dark3, borderWidth:1, borderColor:colors.border },
  tabActive:   { backgroundColor:colors.brand, borderColor:colors.brand },
  tabText:     { color:colors.textMuted, fontWeight:'600', fontSize:13 },
  tabTextActive:{ color:'#fff' },
});

}