import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function useRides() {
    const { user } = useAuthStore();
    const [rides, setRides] = useState([]);
    const [activeRide, setActiveRide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const subRef = useRef(null);

    const fetchRides = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('rides')
                .select(`
                    *,
                    driver:provider_profiles!rides_driver_id_fkey(
                        id,
                        profiles!provider_profiles_id_fkey(full_name, avatar_url)
                    ),
                    vehicle:transport_vehicles!rides_vehicle_id_fkey(make, model, color, plate_number)
                `)
                .or(`customer_id.eq.${user.id},driver_id.eq.${user.id}`)
                .order('requested_at', { ascending: false })
                .limit(50);
            if (!error && data) {
                setRides(data);
                const active = data.find(r => ['pending', 'confirmed', 'in_progress'].includes(r.status));
                setActiveRide(active || null);
            }
        } catch { setRides([]); } finally { setLoading(false); }
    }, [user]);

    useEffect(() => { fetchRides(); }, [fetchRides]);

    // Real-time subscription for ride updates
    useEffect(() => {
        if (!user) return;
        subRef.current = supabase
            .channel(`rides:${user.id}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'rides',
                filter: `customer_id=eq.${user.id}`,
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setRides(prev => [payload.new, ...prev]);
                    setActiveRide(payload.new);
                } else if (payload.eventType === 'UPDATE') {
                    setRides(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r));
                    if (['pending', 'confirmed', 'in_progress'].includes(payload.new.status)) {
                        setActiveRide(prev => prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev);
                    } else {
                        setActiveRide(null);
                    }
                    if (payload.new.status === 'confirmed') toast.success('Driver accepted your ride! 🚗');
                    if (payload.new.status === 'in_progress') toast('Your ride has started! 🛣️', { icon: '🚗' });
                    if (payload.new.status === 'completed') toast.success('Ride completed! Rate your driver ⭐');
                }
            })
            .subscribe();
        return () => { subRef.current?.unsubscribe(); };
    }, [user]);

    const requestRide = async ({ pickupAddress, dropoffAddress, pickupLocation, dropoffLocation, fare }) => {
        if (!user) { toast.error('Please sign in to book a ride'); return null; }
        setSubmitting(true);
        try {
            const { data, error } = await supabase.from('rides').insert({
                customer_id: user.id,
                pickup_address: pickupAddress,
                dropoff_address: dropoffAddress,
                pickup_location: pickupLocation || null,
                dropoff_location: dropoffLocation || null,
                total_fare: fare || null,
                status: 'pending',
            }).select().single();
            if (error) throw error;
            toast.success('Ride requested! Looking for a driver… 🔍');
            await fetchRides();
            return data;
        } catch (err) {
            toast.error(err.message || 'Failed to request ride');
            return null;
        } finally { setSubmitting(false); }
    };

    const updateRideStatus = async (rideId, status) => {
        try {
            const updates = {
                status,
                ...(status === 'in_progress' ? { started_at: new Date().toISOString() } : {}),
                ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
                ...(status === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}),
            };
            const { error } = await supabase.from('rides').update(updates).eq('id', rideId);
            if (error) throw error;
            await fetchRides();
        } catch (err) { toast.error(err.message || 'Update failed'); }
    };

    const rateRide = async (rideId, rating, review) => {
        try {
            await supabase.from('rides').update({
                customer_rating: rating,
                customer_review: review || null,
            }).eq('id', rideId).eq('customer_id', user.id);
            toast.success('Thanks for rating! ⭐');
            await fetchRides();
        } catch (err) { toast.error(err.message || 'Rating failed'); }
    };

    const cancelRide = async (rideId, reason) => {
        try {
            await supabase.from('rides').update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancellation_reason: reason || null,
            }).eq('id', rideId);
            setActiveRide(null);
            toast('Ride cancelled', { icon: '❌' });
            await fetchRides();
        } catch (err) { toast.error(err.message || 'Cancel failed'); }
    };

    return { rides, activeRide, loading, submitting, requestRide, updateRideStatus, rateRide, cancelRide, refetch: fetchRides };
}
