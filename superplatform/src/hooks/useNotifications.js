import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function useNotifications() {
    const { user } = useAuthStore();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const subRef = useRef(null);

    const fetch = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);
            if (!error && data) setNotifications(data);
        } catch {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetch();
        if (!user) return;
        // Real-time subscription
        subRef.current = supabase
            .channel(`notifications:${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'notifications',
                filter: `user_id=eq.${user.id}`,
            }, (payload) => {
                setNotifications(prev => [payload.new, ...prev]);
            })
            .subscribe();
        return () => { subRef.current?.unsubscribe(); };
    }, [user, fetch]);

    const markRead = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
        try {
            await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
        } catch { /* optimistic — ignore error */ }
    };

    const markAllRead = async () => {
        if (!user) return;
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        try {
            await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', user.id).eq('is_read', false);
        } catch { /* optimistic */ }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return { notifications, loading, unreadCount, markRead, markAllRead, refetch: fetch };
}
