import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from '../../components/ui';

export default function ChatListScreen({ navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
const { user } = useAuthStore();
  const [convs,     setConvs]     = useState([]);
  const [search,    setSearch]    = useState('');
  const [refreshing,setRefreshing]= useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('conversations')
        .select(`
          id, updated_at,
          customer:profiles!conversations_customer_id_fkey(id, full_name, avatar_url),
          provider:profiles!conversations_provider_id_fkey(id, full_name, avatar_url),
          messages(body, created_at, is_read, sender_id)
        `)
        .or(`customer_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });
      setConvs(data || []);
    } catch {}
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase.channel(`convlist-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const getPeer = (conv) => {
    if (!conv) return null;
    return conv.customer?.id === user?.id ? conv.provider : conv.customer;
  };

  const getLastMsg = (conv) => {
    const msgs = conv.messages || [];
    return msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  };

  const getUnread = (conv) => {
    return (conv.messages || []).filter(m => !m.is_read && m.sender_id !== user?.id).length;
  };

  const fmtTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const filtered = convs.filter(c => {
    const peer = getPeer(c);
    return !search || (peer?.full_name || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
      <View style={styles.searchRow}>
        <Feather name="search" size={15} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        renderItem={({ item: conv }) => {
          const peer   = getPeer(conv);
          const last   = getLastMsg(conv);
          const unread = getUnread(conv);
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('ChatDetail', {
                conversationId: conv.id,
                providerId: peer?.id,
                name: peer?.full_name || 'Chat',
              })}
              style={[styles.row, unread > 0 && styles.rowUnread]}
              activeOpacity={0.8}
            >
              <View style={{ position: 'relative' }}>
                <Avatar name={peer?.full_name} uri={peer?.avatar_url} size={50} />
                <View style={styles.onlineDot} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[styles.peerName, unread > 0 && { color: '#fff', fontWeight: '800' }]} numberOfLines={1}>
                    {peer?.full_name || 'Unknown'}
                  </Text>
                  <Text style={styles.time}>{fmtTime(last?.created_at)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.lastMsg, unread > 0 && { color: colors.text }]} numberOfLines={1}>
                    {last?.sender_id === user?.id ? 'You: ' : ''}{last?.body || 'No messages yet'}
                  </Text>
                  {unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 80, gap: 12 }}>
            <Feather name="message-square" size={52} color={colors.dark5} />
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>No conversations yet</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 }}>
              Find a provider in any category and tap Chat to start a conversation.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  searchRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, backgroundColor: colors.dark3, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  searchInput:  { flex: 1, color: colors.text, fontSize: 14 },
  row:          { flexDirection: 'row', gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  rowUnread:    { backgroundColor: colors.dark2 },
  onlineDot:    { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', borderWidth: 2, borderColor: colors.dark },
  peerName:     { color: colors.text, fontWeight: '600', fontSize: 15, flex: 1 },
  time:         { color: colors.textMuted, fontSize: 12 },
  lastMsg:      { color: colors.textMuted, fontSize: 13, flex: 1 },
  unreadBadge:  { backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  unreadText:   { color: '#fff', fontSize: 11, fontWeight: '800' },
});

}