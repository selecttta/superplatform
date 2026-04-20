import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Alert, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt, fmtDate } from '../../utils/helpers';
import { Card, Badge, StatBox, Button, Avatar, SectionHeader, Divider, EmptyState } from '../../components/ui';

const TABS = ['Overview', 'Providers', 'Listings', 'Users', 'Orders', 'Bookings', 'Transactions'];

export default function AdminDashboardScreen({ navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
  const [tab,          setTab]          = useState('Overview');
  const [stats,        setStats]        = useState({ users: 0, providers: 0, revenue: 0, bookings: 0, orders: 0 });
  const [providers,    setProviders]    = useState([]);
  const [listings,     setListings]     = useState([]);
  const [users,        setUsers]        = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [orders,       setOrders]       = useState([]);
  const [bookings,     setBookings]     = useState([]);
  const [categoryRevenue, setCategoryRevenue] = useState([]);
  const [refreshing,   setRefreshing]   = useState(false);

  const load = useCallback(async () => {
    try {
      // Stats
      const [{ count: uCount }, { count: pCount }, { data: txns }, { count: bkCount }, { count: ordCount }] = await Promise.all([
        supabase.from('profiles').select('*', { count:'exact', head:true }).eq('role','customer'),
        supabase.from('profiles').select('*', { count:'exact', head:true }).eq('role','provider'),
        supabase.from('wallet_transactions').select('amount').eq('type','payment'),
        supabase.from('bookings').select('*', { count:'exact', head:true }),
        supabase.from('orders').select('*', { count:'exact', head:true }),
      ]);
      setStats({
        users:     uCount || 0,
        providers: pCount || 0,
        revenue:   (txns || []).reduce((s, t) => s + (t.amount || 0), 0),
        bookings:  bkCount || 0,
        orders:    ordCount || 0,
      });

      // Category revenue — computed from real provider profiles + wallet transactions
      const { data: provProfiles } = await supabase
        .from('profiles').select('id, category').eq('role', 'provider').eq('is_approved', true);
      const { data: allTxns } = await supabase
        .from('wallet_transactions').select('user_id, amount').eq('type', 'payment');
      
      // Aggregate revenue by category
      const catMap = {};
      (provProfiles || []).forEach(p => {
        if (p.category) catMap[p.id] = p.category;
      });
      const revByCategory = {};
      (allTxns || []).forEach(t => {
        const cat = catMap[t.user_id];
        if (cat) revByCategory[cat] = (revByCategory[cat] || 0) + (t.amount || 0);
      });
      
      const CATEGORY_COLORS = {
        transport: '#3b82f6', 'home-services': '#10b981', health: '#ef4444',
        'beauty-fashion': '#ec4899', 'e-commerce': '#f97316', 'real-estate': '#8b5cf6',
        rentals: '#06b6d4',
      };
      const CATEGORY_NAMES = {
        transport: 'Transport', 'home-services': 'Home Services', health: 'Health',
        'beauty-fashion': 'Beauty', 'e-commerce': 'E-Commerce', 'real-estate': 'Real Estate',
        rentals: 'Rentals',
      };
      const catArr = Object.entries(revByCategory).map(([cat, rev]) => ({
        name: CATEGORY_NAMES[cat] || cat, revenue: rev, color: CATEGORY_COLORS[cat] || '#6b7280',
      })).sort((a, b) => b.revenue - a.revenue);
      setCategoryRevenue(catArr);

      // Pending providers
      const { data: provData } = await supabase
        .from('profiles').select('*')
        .eq('role', 'provider').eq('onboarding_complete', true)
        .order('created_at', { ascending: false }).limit(30);
      setProviders(provData || []);

      // Pending listings
      const { data: listData } = await supabase
        .from('listings').select('*, profiles(full_name, avatar_url)')
        .order('created_at', { ascending: false }).limit(30);
      setListings(listData || []);

      // All users
      const { data: userData } = await supabase
        .from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
      setUsers(userData || []);

      // Orders
      const { data: ordData } = await supabase
        .from('orders').select('*, profiles:customer_id(full_name)').order('created_at', { ascending: false }).limit(30);
      setOrders(ordData || []);

      // Bookings
      const { data: bkData } = await supabase
        .from('bookings').select('*, customer:customer_id(full_name), provider:provider_id(full_name)')
        .order('created_at', { ascending: false }).limit(30);
      setBookings(bkData || []);

      // Transactions
      const { data: txnData } = await supabase
        .from('wallet_transactions').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(30);
      setTransactions(txnData || []);

    } catch (err) {
      console.warn('Admin load error:', err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Approve / reject provider
  const handleProvider = async (id, approve) => {
    Alert.alert(
      approve ? 'Approve Provider?' : 'Reject Provider?',
      approve ? 'This provider will be able to receive bookings immediately.' : 'The provider application will be rejected.',
      [
        { text:'Cancel', style:'cancel' },
        {
          text: approve ? 'Approve' : 'Reject',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            await supabase.from('profiles').update({
              is_approved: approve,
              approved_at: approve ? new Date().toISOString() : null,
            }).eq('id', id);
            setProviders(p => p.map(x => x.id === id ? { ...x, is_approved: approve } : x));
          },
        },
      ]
    );
  };

  // Approve / reject listing
  const handleListing = async (id, approve) => {
    const newStatus = approve ? 'approved' : 'rejected';
    await supabase.from('listings').update({ status: newStatus, reviewed_at: new Date().toISOString() }).eq('id', id);
    setListings(l => l.map(x => x.id === id ? { ...x, status: newStatus } : x));
  };

  // Suspend / activate user
  const handleUser = async (id, suspend) => {
    await supabase.from('profiles').update({ is_suspended: suspend }).eq('id', id);
    setUsers(u => u.map(x => x.id === id ? { ...x, is_suspended: suspend } : x));
  };

  // Update order status
  const updateOrderStatus = async (id, newStatus) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    setOrders(o => o.map(x => x.id === id ? { ...x, status: newStatus } : x));
  };

  // Update booking status
  const updateBookingStatus = async (id, newStatus) => {
    await supabase.from('bookings').update({ status: newStatus }).eq('id', id);
    setBookings(b => b.map(x => x.id === id ? { ...x, status: newStatus } : x));
  };

  const pendingProviders = providers.filter(p => p.is_approved === false);
  const pendingListings  = listings.filter(l => l.status === 'pending');
  const maxCatRevenue = categoryRevenue.length > 0 ? Math.max(...categoryRevenue.map(c => c.revenue)) : 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            {t === 'Providers' && pendingProviders.length > 0 && (
              <View style={styles.alertDot}><Text style={styles.alertDotText}>{pendingProviders.length}</Text></View>
            )}
            {t === 'Listings' && pendingListings.length > 0 && (
              <View style={styles.alertDot}><Text style={styles.alertDotText}>{pendingListings.length}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}>

        {/* ── OVERVIEW ──────────────────────────────────────── */}
        {tab === 'Overview' && (
          <View style={{ padding: 16, gap: 16 }}>
            <Text style={styles.title}>Admin Dashboard</Text>

            {(pendingProviders.length > 0 || pendingListings.length > 0) && (
              <Card style={{ padding: 14, borderColor: '#f59e0b50', backgroundColor: '#f59e0b10' }}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Feather name="alert-triangle" size={18} color="#f59e0b" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 14 }}>Action Required</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {pendingProviders.length} provider{pendingProviders.length !== 1 ? 's' : ''} &amp; {pendingListings.length} listing{pendingListings.length !== 1 ? 's' : ''} pending review
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatBox label="Total Users"     value={stats.users.toLocaleString()}     icon="users"      color="#3b82f6" />
              <StatBox label="Providers"       value={stats.providers.toLocaleString()} icon="briefcase"  color="#10b981" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatBox label="Platform Revenue" value={fmt(stats.revenue)} icon="dollar-sign" color={colors.brand} />
              <StatBox label="Commission (15%)" value={fmt(stats.revenue * 0.15)} icon="percent" color="#8b5cf6" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatBox label="Total Orders"    value={stats.orders.toLocaleString()}    icon="package"    color="#06b6d4" />
              <StatBox label="Total Bookings"  value={stats.bookings.toLocaleString()}  icon="calendar"   color="#ec4899" />
            </View>

            {/* Category Breakdown — REAL DATA */}
            <SectionHeader title="Category Breakdown" />
            {categoryRevenue.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>No category revenue data yet</Text>
            ) : (
              categoryRevenue.map((cat) => (
                <View key={cat.name} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontSize: 13 }}>{cat.name}</Text>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{fmt(cat.revenue)}</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: colors.dark4, borderRadius: 3 }}>
                    <View style={{ width: `${(cat.revenue / maxCatRevenue) * 100}%`, height: 6, backgroundColor: cat.color, borderRadius: 3 }} />
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── PROVIDERS ─────────────────────────────────────── */}
        {tab === 'Providers' && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              {pendingProviders.length} pending · {providers.filter(p => p.is_approved).length} approved
            </Text>
            {providers.length === 0
              ? <EmptyState icon="briefcase" title="No provider applications" subtitle="Provider applications will appear here" />
              : providers.map(prov => (
                  <Card key={prov.id} style={{ padding: 14, gap: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                      <Avatar name={prov.full_name} uri={prov.avatar_url} size={44} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{prov.full_name}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{prov.email}</Text>
                        {prov.category && <Text style={{ color: colors.brand, fontSize: 12, marginTop: 2 }}>{prov.category} · {prov.specialty}</Text>}
                        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Applied {fmtDate(prov.created_at)}</Text>
                      </View>
                      <Badge
                        label={prov.is_approved ? 'Approved' : prov.is_approved === false && prov.onboarding_complete ? 'Pending' : 'Draft'}
                        color={prov.is_approved ? '#10b981' : '#f59e0b'}
                      />
                    </View>
                    {!prov.is_approved && prov.onboarding_complete && (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={() => handleProvider(prov.id, true)}
                          style={[styles.actionBtn, { backgroundColor: '#10b98120', borderColor: '#10b98150' }]}>
                          <Feather name="check" size={14} color="#10b981" />
                          <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 13 }}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleProvider(prov.id, false)}
                          style={[styles.actionBtn, { backgroundColor: '#ef444420', borderColor: '#ef444450' }]}>
                          <Feather name="x" size={14} color="#ef4444" />
                          <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </Card>
                ))
            }
          </View>
        )}

        {/* ── LISTINGS ──────────────────────────────────────── */}
        {tab === 'Listings' && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              {pendingListings.length} pending · {listings.filter(l => l.status === 'approved').length} live
            </Text>
            {listings.length === 0
              ? <EmptyState icon="list" title="No listings" subtitle="Provider listings will appear here" />
              : listings.map(listing => (
                  <Card key={listing.id} style={{ padding: 14, gap: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      {listing.images?.[0]
                        ? <Image source={{ uri: listing.images[0] }} style={{ width: 52, height: 52, borderRadius: 10 }} />
                        : <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: colors.dark4, alignItems: 'center', justifyContent: 'center' }}>
                            <Feather name="image" size={20} color={colors.textMuted} />
                          </View>
                      }
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }} numberOfLines={2}>{listing.title}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{listing.profiles?.full_name || 'Provider'} · {listing.category}</Text>
                        <Text style={{ color: colors.brand, fontWeight: '700', marginTop: 2 }}>{fmt(listing.price)}</Text>
                      </View>
                      <Badge
                        label={listing.status || 'pending'}
                        color={listing.status === 'approved' ? '#10b981' : listing.status === 'rejected' ? '#ef4444' : '#f59e0b'}
                      />
                    </View>
                    {listing.status === 'pending' && (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={() => handleListing(listing.id, true)}
                          style={[styles.actionBtn, { flex:1, backgroundColor:'#10b98120', borderColor:'#10b98150' }]}>
                          <Feather name="check" size={14} color="#10b981" />
                          <Text style={{ color:'#10b981', fontWeight:'700', fontSize:13 }}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleListing(listing.id, false)}
                          style={[styles.actionBtn, { flex:1, backgroundColor:'#ef444420', borderColor:'#ef444450' }]}>
                          <Feather name="x" size={14} color="#ef4444" />
                          <Text style={{ color:'#ef4444', fontWeight:'700', fontSize:13 }}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </Card>
                ))
            }
          </View>
        )}

        {/* ── USERS ─────────────────────────────────────────── */}
        {tab === 'Users' && (
          <View style={{ padding: 16, gap: 12 }}>
            {users.length === 0
              ? <EmptyState icon="users" title="No users" subtitle="Users will appear here" />
              : users.map(u => (
              <Card key={u.id} style={{ padding: 14, flexDirection:'row', gap:12, alignItems:'center' }}>
                <Avatar name={u.full_name} uri={u.avatar_url} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color:colors.text, fontWeight:'700' }}>{u.full_name || u.email}</Text>
                  <Text style={{ color:colors.textMuted, fontSize:12 }}>{u.role} · Joined {fmtDate(u.created_at)}</Text>
                </View>
                <View style={{ gap: 6, alignItems: 'flex-end' }}>
                  <Badge label={u.is_suspended ? 'Suspended' : 'Active'} color={u.is_suspended ? '#ef4444' : '#10b981'} />
                  <TouchableOpacity onPress={() => handleUser(u.id, !u.is_suspended)}>
                    <Text style={{ color: u.is_suspended ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: '600' }}>
                      {u.is_suspended ? 'Activate' : 'Suspend'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* ── ORDERS ─────────────────────────────────────────── */}
        {tab === 'Orders' && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              {orders.filter(o => o.status === 'pending').length} pending · {orders.length} total
            </Text>
            {orders.length === 0
              ? <EmptyState icon="package" title="No orders yet" subtitle="Customer orders will appear here" />
              : orders.map(o => (
                <Card key={o.id} style={{ padding: 14, gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{o.profiles?.full_name || 'Customer'}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        #{o.id?.slice(0, 8)} · {fmtDate(o.created_at)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge
                        label={o.status || 'pending'}
                        color={o.status === 'delivered' || o.status === 'completed' ? '#10b981' : o.status === 'cancelled' ? '#ef4444' : '#f59e0b'}
                      />
                      <Text style={{ color: colors.text, fontWeight: '800' }}>{fmt(o.total || 0)}</Text>
                    </View>
                  </View>
                  {(o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing') && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {o.status === 'pending' && (
                        <TouchableOpacity onPress={() => updateOrderStatus(o.id, 'confirmed')}
                          style={[styles.actionBtn, { flex:1, backgroundColor:'#3b82f620', borderColor:'#3b82f650' }]}>
                          <Feather name="check" size={14} color="#3b82f6" />
                          <Text style={{ color:'#3b82f6', fontWeight:'700', fontSize:12 }}>Confirm</Text>
                        </TouchableOpacity>
                      )}
                      {(o.status === 'confirmed' || o.status === 'processing') && (
                        <TouchableOpacity onPress={() => updateOrderStatus(o.id, 'delivered')}
                          style={[styles.actionBtn, { flex:1, backgroundColor:'#10b98120', borderColor:'#10b98150' }]}>
                          <Feather name="truck" size={14} color="#10b981" />
                          <Text style={{ color:'#10b981', fontWeight:'700', fontSize:12 }}>Mark Delivered</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => updateOrderStatus(o.id, 'cancelled')}
                        style={[styles.actionBtn, { flex:1, backgroundColor:'#ef444420', borderColor:'#ef444450' }]}>
                        <Feather name="x" size={14} color="#ef4444" />
                        <Text style={{ color:'#ef4444', fontWeight:'700', fontSize:12 }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              ))
            }
          </View>
        )}

        {/* ── BOOKINGS ──────────────────────────────────────── */}
        {tab === 'Bookings' && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              {bookings.filter(b => b.status === 'pending').length} pending · {bookings.length} total
            </Text>
            {bookings.length === 0
              ? <EmptyState icon="calendar" title="No bookings yet" subtitle="Customer bookings will appear here" />
              : bookings.map(b => (
                <Card key={b.id} style={{ padding: 14, gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{b.customer?.full_name || 'Customer'}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        Provider: {b.provider?.full_name || '—'} · {fmtDate(b.created_at)}
                      </Text>
                      {b.service_name && <Text style={{ color: colors.brand, fontSize: 12, marginTop: 2 }}>{b.service_name}</Text>}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge
                        label={b.status || 'pending'}
                        color={b.status === 'completed' ? '#10b981' : b.status === 'cancelled' ? '#ef4444' : '#f59e0b'}
                      />
                      <Text style={{ color: colors.text, fontWeight: '800' }}>{fmt(b.total_price || 0)}</Text>
                    </View>
                  </View>
                  {(b.status === 'pending' || b.status === 'confirmed') && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {b.status === 'pending' && (
                        <TouchableOpacity onPress={() => updateBookingStatus(b.id, 'confirmed')}
                          style={[styles.actionBtn, { flex:1, backgroundColor:'#3b82f620', borderColor:'#3b82f650' }]}>
                          <Feather name="check" size={14} color="#3b82f6" />
                          <Text style={{ color:'#3b82f6', fontWeight:'700', fontSize:12 }}>Confirm</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => updateBookingStatus(b.id, 'completed')}
                        style={[styles.actionBtn, { flex:1, backgroundColor:'#10b98120', borderColor:'#10b98150' }]}>
                        <Feather name="check-circle" size={14} color="#10b981" />
                        <Text style={{ color:'#10b981', fontWeight:'700', fontSize:12 }}>Complete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => updateBookingStatus(b.id, 'cancelled')}
                        style={[styles.actionBtn, { flex:1, backgroundColor:'#ef444420', borderColor:'#ef444450' }]}>
                        <Feather name="x" size={14} color="#ef4444" />
                        <Text style={{ color:'#ef4444', fontWeight:'700', fontSize:12 }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              ))
            }
          </View>
        )}

        {/* ── TRANSACTIONS ──────────────────────────────────── */}
        {tab === 'Transactions' && (
          <View style={{ padding: 16, gap: 12 }}>
            {transactions.length === 0
              ? <EmptyState icon="credit-card" title="No transactions" subtitle="Transaction history will appear here" />
              : transactions.map(txn => (
              <Card key={txn.id} style={{ padding: 14, flexDirection:'row', gap:12, alignItems:'center' }}>
                <View style={[styles.txnIcon, { backgroundColor: txn.amount >= 0 ? '#10b98120' : '#ef444420' }]}>
                  <Feather name={txn.amount >= 0 ? 'arrow-down-left' : 'arrow-up-right'} size={18} color={txn.amount >= 0 ? '#10b981' : '#ef4444'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color:colors.text, fontWeight:'700' }} numberOfLines={1}>{txn.description || 'Payment'}</Text>
                  <Text style={{ color:colors.textMuted, fontSize:12 }}>{txn.profiles?.full_name} · {txn.payment_method}</Text>
                  <Text style={{ color:colors.textMuted, fontSize:11 }}>{fmtDate(txn.created_at)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.text, fontWeight:'800', fontSize:15 }}>{fmt(Math.abs(txn.amount))}</Text>
                  <Badge label={txn.status || 'completed'} color={txn.status === 'completed' ? '#10b981' : '#f59e0b'} />
                </View>
              </Card>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  title:        { color:colors.text, fontSize:24, fontWeight:'800' },
  tabScroll:    { flexGrow:0, paddingVertical:12 },
  tab:          { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:colors.dark3, borderWidth:1, borderColor:colors.border },
  tabActive:    { backgroundColor:colors.brand, borderColor:colors.brand },
  tabText:      { color:colors.textMuted, fontWeight:'600', fontSize:13 },
  tabTextActive:{ color:'#fff' },
  alertDot:     { backgroundColor:'#ef4444', borderRadius:8, paddingHorizontal:5, paddingVertical:1 },
  alertDotText: { color:'#fff', fontSize:10, fontWeight:'700' },
  actionBtn:    { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:10, borderRadius:12, borderWidth:1 },
  txnIcon:      { width:44, height:44, borderRadius:12, alignItems:'center', justifyContent:'center' },
});

}