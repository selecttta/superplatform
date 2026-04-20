import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmtDate } from '../../utils/helpers';

export default function NotificationsScreen({ navigation }) {
      
  const { colors } = useTheme();
  const s = useStyles(colors);
  
const { user } = useAuthStore();
  const [notifs, setNotifs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('notifications').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(50);
      setNotifs(data || []);
    } catch {}
  };

  useEffect(() => { load(); }, [user]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const ICON_MAP = { booking:'calendar', message:'message-circle', payment:'credit-card', system:'bell', promotion:'tag' };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}>
        {notifs.length === 0 ? (
          <View style={s.empty}>
            <Feather name="bell-off" size={48} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No notifications yet</Text>
            <Text style={s.emptyText}>You'll see updates about bookings, messages, and promotions here.</Text>
          </View>
        ) : notifs.map(n => (
          <TouchableOpacity key={n.id} style={[s.item, !n.is_read && s.itemUnread]}>
            <View style={[s.iconWrap, { backgroundColor: colors.brand + '20' }]}>
              <Feather name={ICON_MAP[n.type] || 'bell'} size={18} color={colors.brand} />
            </View>
            <View style={s.itemBody}>
              <Text style={s.itemTitle}>{n.title || 'Notification'}</Text>
              <Text style={s.itemMsg} numberOfLines={2}>{n.body || n.message}</Text>
              <Text style={s.itemDate}>{fmtDate(n.created_at)}</Text>
            </View>
            {!n.is_read && <View style={s.dot} />}
          </TouchableOpacity>
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.dark },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.dark3, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title:     { fontSize: 18, fontWeight: '800', color: colors.text },
  empty:     { alignItems: 'center', padding: 48 },
  emptyTitle:{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  item:      { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', gap: 12 },
  itemUnread:{ backgroundColor: colors.brand + '08' },
  iconWrap:  { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', shrink: 0 },
  itemBody:  { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3 },
  itemMsg:   { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  itemDate:  { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 6 },
});

}