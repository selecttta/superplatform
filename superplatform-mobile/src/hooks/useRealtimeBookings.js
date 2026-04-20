import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

/**
 * useRealtimeBookings — subscribes to live booking updates for the current user.
 * Returns bookings array that auto-updates when status changes.
 */
export function useRealtimeBookings() {
  const { user, role } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const col = role === 'provider' ? 'provider_id' : 'customer_id';
    const { data } = await supabase
      .from('bookings')
      .select(`*,
        customer:profiles!bookings_customer_id_fkey(full_name, avatar_url, phone),
        provider:profiles!bookings_provider_id_fkey(full_name, avatar_url, phone)
      `)
      .eq(col, user.id)
      .order('created_at', { ascending: false });
    setBookings(data || []);
    setLoading(false);
  }, [user, role]);

  useEffect(() => {
    load();
    if (!user) return;
    const col = role === 'provider' ? 'provider_id' : 'customer_id';
    const channel = supabase.channel(`bookings-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `${col}=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookings(b => [payload.new, ...b]);
          } else if (payload.eventType === 'UPDATE') {
            setBookings(b => b.map(x => x.id === payload.new.id ? { ...x, ...payload.new } : x));
          } else if (payload.eventType === 'DELETE') {
            setBookings(b => b.filter(x => x.id !== payload.old.id));
          }
        })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  const updateStatus = async (bookingId, status) => {
    const { error } = await supabase.from('bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', bookingId);
    if (!error) setBookings(b => b.map(x => x.id === bookingId ? { ...x, status } : x));
    return !error;
  };

  return { bookings, loading, refresh: load, updateStatus };
}
