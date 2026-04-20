import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { makeCall } from '../../utils/helpers';
import { Avatar } from '../../components/ui';

export default function ChatDetailScreen({ route, navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
const { conversationId, providerId, name = 'Chat', phone } = route.params || {};
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [convId,   setConvId]   = useState(conversationId);
  const flatRef = useRef(null);

  const ensureConversation = useCallback(async () => {
    if (convId) return convId;
    if (!user || !providerId) return null;
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(customer_id.eq.${user.id},provider_id.eq.${providerId}),and(customer_id.eq.${providerId},provider_id.eq.${user.id})`)
        .maybeSingle();
      if (existing?.id) { setConvId(existing.id); return existing.id; }
      const { data: created } = await supabase
        .from('conversations')
        .insert({ customer_id: user.id, provider_id: providerId, created_at: new Date().toISOString() })
        .select().single();
      if (created?.id) { setConvId(created.id); return created.id; }
    } catch {}
    return null;
  }, [user, providerId, convId]);

  const loadMessages = useCallback(async (cId) => {
    if (!cId) return;
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url)')
      .eq('conversation_id', cId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    await supabase.from('messages').update({ is_read: true })
      .eq('conversation_id', cId).neq('sender_id', user?.id).eq('is_read', false);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let channel;
    (async () => {
      const cId = await ensureConversation();
      await loadMessages(cId);
      if (!cId) return;
      channel = supabase.channel(`chat-${cId}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${cId}` },
          async (payload) => {
            const { data } = await supabase
              .from('messages')
              .select('*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url)')
              .eq('id', payload.new.id).single();
            if (data) {
              setMessages(m => [...m, data]);
              if (data.sender_id !== user?.id)
                await supabase.from('messages').update({ is_read: true }).eq('id', data.id);
            }
          })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [ensureConversation, loadMessages]);

  useEffect(() => {
    if (messages.length) setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const sendMessage = async () => {
    const body = text.trim();
    if (!body || !user) return;
    setText('');
    const cId = convId || await ensureConversation();
    if (!cId) return;
    const receiverId = providerId;
    await supabase.from('messages').insert({
      conversation_id: cId,
      sender_id:       user.id,
      receiver_id:     receiverId,
      body,
      is_read:         false,
      created_at:      new Date().toISOString(),
    });
  };

  const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const isMine  = (msg) => msg.sender_id === user?.id;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      {phone && (
        <TouchableOpacity onPress={() => makeCall(phone)} style={styles.callBtn}>
          <Feather name="phone" size={18} color="#10b981" />
          <Text style={{ color: '#10b981', fontWeight: '600', fontSize: 13 }}>Call</Text>
        </TouchableOpacity>
      )}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item: msg }) => {
            const mine = isMine(msg);
            return (
              <View style={[styles.msgRow, mine && styles.msgRowMine]}>
                {!mine && <Avatar name={msg.sender?.full_name} uri={msg.sender?.avatar_url} size={32} />}
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{msg.body}</Text>
                  <Text style={[styles.bubbleTime, mine && { color: 'rgba(255,255,255,0.6)' }]}>{fmtTime(msg.created_at)}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            !loading && (
              <View style={{ alignItems: 'center', marginTop: 60, gap: 8 }}>
                <Feather name="message-circle" size={48} color={colors.dark5} />
                <Text style={{ color: colors.textMuted, fontSize: 15 }}>No messages yet</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Send a message to start the conversation</Text>
              </View>
            )
          }
        />
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={`Message ${name}…`}
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            onSubmitEditing={sendMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity onPress={sendMessage} disabled={!text.trim()} style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}>
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  screen:        { flex: 1, backgroundColor: colors.dark },
  callBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', padding: 12, paddingBottom: 0 },
  msgRow:        { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  msgRowMine:    { flexDirection: 'row-reverse' },
  bubble:        { maxWidth: '75%', padding: 12, borderRadius: 18, gap: 4 },
  bubbleMine:    { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  bubbleOther:   { backgroundColor: colors.dark3, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText:    { color: colors.text, fontSize: 15, lineHeight: 20 },
  bubbleTextMine:{ color: '#fff' },
  bubbleTime:    { color: colors.textMuted, fontSize: 10, alignSelf: 'flex-end' },
  inputBar:      { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.dark2 },
  input:         { flex: 1, backgroundColor: colors.dark3, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
  sendBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});

}