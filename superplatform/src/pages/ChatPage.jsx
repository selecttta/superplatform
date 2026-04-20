import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Search, Phone, MoreVertical, ArrowLeft, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { initials } from '../utils/helpers';

function Avatar({ name = '', size = 11 }) {
  const colors = ['from-brand-600 to-brand-800','from-red-600 to-red-800','from-emerald-600 to-emerald-800','from-violet-600 to-violet-800','from-blue-600 to-blue-800'];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`w-${size} h-${size} bg-gradient-to-br ${colors[idx]} rounded-full flex items-center justify-center text-sm font-bold text-[var(--text)] shrink-0`}>
      {initials(name)}
    </div>
  );
}

export default function ChatPage() {
  const { user, profile } = useAuthStore();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [convs,    setConvs]    = useState([]);
  const [selConv,  setSelConv]  = useState(null); // full conversation object
  const [msgs,     setMsgs]     = useState([]);
  const [input,    setInput]    = useState('');
  const [search,   setSearch]   = useState('');
  const [showList, setShowList] = useState(true);
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);

  // ── Load conversations ───────────────────────────────────────────────────
  const loadConvs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('conversations')
      .select(`id, updated_at,
        customer:profiles!conversations_customer_id_fkey(id, full_name, avatar_url),
        provider:profiles!conversations_provider_id_fkey(id, full_name, avatar_url),
        messages(body, created_at, is_read, sender_id)`)
      .or(`customer_id.eq.${user.id},provider_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });
    setConvs(data || []);
  }, [user]);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  // ── Handle incoming navigation state (from provider detail/chat buttons) ─
  useEffect(() => {
    const state = location.state;
    if (!state?.providerId || !user) return;
    (async () => {
      // Try to find existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select(`id, updated_at,
          customer:profiles!conversations_customer_id_fkey(id, full_name, avatar_url),
          provider:profiles!conversations_provider_id_fkey(id, full_name, avatar_url)`)
        .or(`and(customer_id.eq.${user.id},provider_id.eq.${state.providerId}),and(customer_id.eq.${state.providerId},provider_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        selectConversation(existing);
      } else {
        // Create new conversation
        const { data: created } = await supabase
          .from('conversations')
          .insert({ customer_id: user.id, provider_id: state.providerId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .select(`id, updated_at,
            customer:profiles!conversations_customer_id_fkey(id, full_name, avatar_url),
            provider:profiles!conversations_provider_id_fkey(id, full_name, avatar_url)`)
          .single();
        if (created) {
          selectConversation(created);
          loadConvs();
        }
      }
    })();
  // eslint-disable-next-line
  }, [location.state, user]);

  // ── Load messages for selected conversation ──────────────────────────────
  const loadMsgs = useCallback(async (convId) => {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMsgs(data || []);
    setLoading(false);
    // Mark as read
    await supabase.from('messages').update({ is_read: true })
      .eq('conversation_id', convId).neq('sender_id', user?.id).eq('is_read', false);
  }, [user]);

  const selectConversation = (conv) => {
    setSelConv(conv);
    setShowList(false);
    loadMsgs(conv.id);
    // Subscribe to new messages
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase.channel(`chat-${conv.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` },
        (payload) => {
          setMsgs(m => [...m, payload.new]);
          if (payload.new.sender_id !== user?.id) {
            supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id);
          }
        })
      .subscribe();
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  useEffect(() => () => { if (channelRef.current) supabase.removeChannel(channelRef.current); }, []);

  const sendMessage = async () => {
    const body = input.trim();
    if (!body || !selConv || !user) return;
    setInput('');
    const peer = getPeer(selConv);
    await supabase.from('messages').insert({
      conversation_id: selConv.id,
      sender_id:       user.id,
      receiver_id:     peer?.id,
      body,
      is_read:         false,
      created_at:      new Date().toISOString(),
    });
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', selConv.id);
  };

  const getPeer = (conv) => {
    if (!conv) return null;
    return conv.customer?.id === user?.id ? conv.provider : conv.customer;
  };

  const getLastMsg = (conv) => {
    const m = (conv.messages || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    return m[0];
  };

  const getUnread = (conv) => (conv.messages||[]).filter(m => !m.is_read && m.sender_id !== user?.id).length;

  const fmtTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (now - d < 60000) return 'now';
    if (now - d < 3600000) return `${Math.floor((now-d)/60000)}m`;
    if (now - d < 86400000) return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    return d.toLocaleDateString([], {day:'numeric',month:'short'});
  };

  const filtered = convs.filter(c => {
    const peer = getPeer(c);
    return !search || (peer?.full_name || '').toLowerCase().includes(search.toLowerCase());
  });

  const peer = selConv ? getPeer(selConv) : null;

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex">

        {/* Conversation List */}
        <div className={`${selConv && !showList ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-[var(--border)] shrink-0`}>
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="heading-sm mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text)]/30" size={14} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="input pl-9 text-sm" placeholder="Search conversations…" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-[var(--text-muted)] text-sm">No conversations yet</p>
                <p className="text-[var(--text)]/25 text-xs mt-1">Find a provider and tap Chat to start</p>
              </div>
            ) : filtered.map(c => {
              const p   = getPeer(c);
              const last = getLastMsg(c);
              const unread = getUnread(c);
              return (
                <button key={c.id} onClick={() => selectConversation(c)}
                  className={`w-full flex items-start gap-3 p-4 hover:bg-white/3 transition-colors border-b border-white/[0.04] text-left ${selConv?.id === c.id ? 'bg-[var(--bg-input)] border-l-2 border-l-brand-500' : ''}`}>
                  <div className="relative shrink-0">
                    <Avatar name={p?.full_name} />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-dark-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`font-medium text-sm truncate ${unread > 0 ? 'text-[var(--text)] font-semibold' : 'text-[var(--text-muted)]'}`}>{p?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-[var(--text)]/30 shrink-0 ml-2">{fmtTime(last?.created_at)}</p>
                    </div>
                    <p className={`text-xs line-clamp-1 ${unread > 0 ? 'text-[var(--text-muted)]' : 'text-[var(--text)]/40'}`}>
                      {last?.sender_id === user?.id ? 'You: ' : ''}{last?.body || 'No messages yet'}
                    </p>
                  </div>
                  {unread > 0 && (
                    <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-xs font-bold text-[var(--text)] shrink-0 mt-1">{unread > 9 ? '9+' : unread}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat window */}
        {selConv ? (
          <div className={`${showList ? 'hidden' : 'flex'} md:flex flex-1 flex-col min-w-0`}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-[var(--border)] glass-dark">
              <button onClick={() => setShowList(true)} className="md:hidden btn btn-ghost p-2">
                <ArrowLeft size={18} />
              </button>
              <Avatar name={peer?.full_name} />
              <div className="flex-1">
                <p className="font-semibold text-[var(--text)] text-sm">{peer?.full_name || 'Chat'}</p>
                <p className="text-xs text-emerald-400">● Online</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { const a=document.createElement('a'); a.href='tel:+233240000000'; a.click(); }}
                  className="btn btn-ghost p-2 rounded-xl"><Phone size={16}/></button>
                <button className="btn btn-ghost p-2 rounded-xl"><MoreVertical size={16}/></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading && <p className="text-center text-[var(--text)]/20 text-sm py-4">Loading…</p>}
              {!loading && msgs.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">👋</div>
                  <p className="text-[var(--text)]/40 text-sm">Send a message to start the conversation</p>
                </div>
              )}
              {msgs.map(msg => {
                const mine = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    {!mine && <Avatar name={peer?.full_name} size={7} />}
                    <div className={`max-w-[70%] ${mine ? 'items-end' : 'items-start ml-2'} flex flex-col gap-1`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${mine ? 'bg-brand-500 text-[var(--text)] rounded-br-sm' : 'bg-[var(--bg-card)] text-[var(--text)]/85 rounded-bl-sm'}`}>
                        {msg.body}
                      </div>
                      <p className="text-xs text-[var(--text)]/25 px-1">{fmtTime(msg.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[var(--border)] glass-dark">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                    rows={1}
                    className="input resize-none py-3 pr-4 max-h-32"
                    placeholder="Type a message… (Enter to send)"
                    style={{minHeight:'46px'}}
                  />
                </div>
                <button onClick={sendMessage} disabled={!input.trim()}
                  className="btn btn-primary rounded-xl p-3 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-center p-8">
            <div>
              <div className="text-6xl mb-4">💬</div>
              <h3 className="heading-md mb-2">Your Messages</h3>
              <p className="text-muted text-sm">Select a conversation from the left to start chatting.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
