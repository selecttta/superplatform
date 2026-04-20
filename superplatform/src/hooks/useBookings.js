import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function useBookings({ providerId, customerId } = {}) {
    const { user } = useAuthStore();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetch = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        setLoading(true);
        try {
            let q = supabase
                .from('bookings')
                .select('*, profiles!bookings_customer_id_fkey(full_name, email)')
                .order('created_at', { ascending: false });
            if (providerId) q = q.eq('provider_id', providerId);
            else if (customerId) q = q.eq('customer_id', customerId);
            else q = q.or(`customer_id.eq.${user.id},provider_id.eq.${user.id}`);
            const { data, error } = await q;
            if (!error && data) setBookings(data);
        } catch {
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }, [user, providerId, customerId]);

    useEffect(() => { fetch(); }, [fetch]);

    const createBooking = async ({ providerName, serviceName, scheduledAt, amount, notes, listingId, providerId: bookProviderId }) => {
        if (!user) { toast.error('Please sign in to book.'); return null; }
        setSubmitting(true);
        try {
            const scheduled = scheduledAt ? new Date(scheduledAt) : null;
            const { data, error } = await supabase.from('bookings').insert({
                customer_id: user.id,
                provider_id: bookProviderId || providerId || null,
                service_id: listingId || null,
                scheduled_date: scheduled ? scheduled.toISOString().split('T')[0] : null,
                scheduled_time: scheduled ? scheduled.toTimeString().slice(0, 5) : null,
                quoted_price: amount || null,
                notes: notes || '',
                status: 'pending',
            }).select().single();
            if (error) throw error;
            toast.success('Booking confirmed! 🎉');
            await fetch();
            return data;
        } catch (err) {
            toast.error(err.message || 'Booking failed. Please try again.');
            return null;
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (bookingId, status) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', bookingId);
            if (error) throw error;
            await fetch();
            toast.success(`Booking ${status}!`);
        } catch (err) {
            toast.error(err.message || 'Update failed.');
        }
    };

    return { bookings, loading, submitting, createBooking, updateStatus, refetch: fetch };
}
