import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function useOrders() {
    const { user } = useAuthStore();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetch = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('customer_id', user.id)
                .order('created_at', { ascending: false });
            if (!error && data) setOrders(data);
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetch(); }, [fetch]);

    const createOrder = async ({ items, total, address, notes }) => {
        if (!user) { toast.error('Please sign in to place an order.'); return null; }
        setSubmitting(true);
        try {
            const { data, error } = await supabase.from('orders').insert({
                customer_id: user.id,
                items: JSON.stringify(items),
                total,
                address: address || 'Accra, Ghana',
                notes: notes || '',
                status: 'confirmed',
                created_at: new Date().toISOString(),
            }).select().single();
            if (error) throw error;
            toast.success('Order placed successfully! 🎉');
            await fetch();
            return data;
        } catch (err) {
            toast.error(err.message || 'Order failed. Please try again.');
            return null;
        } finally {
            setSubmitting(false);
        }
    };

    return { orders, loading, submitting, createOrder, refetch: fetch };
}
