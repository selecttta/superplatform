import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function useListings({ providerId, status, category } = {}) {
    const { user } = useAuthStore();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            let q = supabase
                .from('listings')
                .select('*, profiles(full_name)')
                .order('created_at', { ascending: false });
            if (providerId) q = q.eq('provider_id', providerId);
            if (status) q = q.eq('status', status);
            if (category) q = q.eq('category', category);
            const { data, error } = await q;
            if (!error && data) setListings(data);
        } catch {
            setListings([]);
        } finally {
            setLoading(false);
        }
    }, [providerId, status, category]);

    useEffect(() => { fetch(); }, [fetch]);

    const createListing = async ({ title, price, description, category: cat, images }) => {
        if (!user) { toast.error('Please sign in.'); return null; }
        setSubmitting(true);
        try {
            const { data, error } = await supabase.from('listings').insert({
                provider_id: user.id,
                title: title.trim().slice(0, 200),
                price: Number(price),
                description: description?.trim().slice(0, 1000) || '',
                category: cat,
                images: images || [],
                status: 'pending',
                created_at: new Date().toISOString(),
            }).select().single();
            if (error) throw error;
            toast.success('Listing submitted for admin review!');
            await fetch();
            return data;
        } catch (err) {
            toast.error(err.message || 'Failed to create listing.');
            return null;
        } finally {
            setSubmitting(false);
        }
    };

    const updateListing = async (id, updates) => {
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('listings')
                .update({ ...updates, status: 'pending-edit', updated_at: new Date().toISOString() })
                .eq('id', id)
                .eq('provider_id', user?.id);
            if (error) throw error;
            toast.success('Listing updated — awaiting admin re-approval.');
            await fetch();
        } catch (err) {
            toast.error(err.message || 'Update failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const approveListing = async (id) => {
        try {
            await supabase.from('listings').update({ status: 'active' }).eq('id', id);
            toast.success('Listing approved & published!');
            await fetch();
        } catch (err) {
            toast.error(err.message || 'Approval failed.');
        }
    };

    const rejectListing = async (id) => {
        try {
            await supabase.from('listings').update({ status: 'rejected' }).eq('id', id);
            toast.success('Listing rejected.');
            await fetch();
        } catch (err) {
            toast.error(err.message || 'Rejection failed.');
        }
    };

    return { listings, loading, submitting, createListing, updateListing, approveListing, rejectListing, refetch: fetch };
}
