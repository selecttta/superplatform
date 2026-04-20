import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function useReviews(targetId, targetType) {
    const { user } = useAuthStore();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchReviews = useCallback(async () => {
        if (!targetId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('*, profiles(full_name)')
                .eq('target_id', String(targetId))
                .eq('target_type', targetType)
                .order('created_at', { ascending: false });
            if (!error && data) setReviews(data);
        } catch {
            // Supabase not configured — use empty
        } finally {
            setLoading(false);
        }
    }, [targetId, targetType]);

    useEffect(() => { fetchReviews(); }, [fetchReviews]);

    const submitReview = async ({ rating, comment }) => {
        if (!user) { toast.error('Please sign in to leave a review.'); return false; }
        setSubmitting(true);
        try {
            const { error } = await supabase.from('reviews').insert({
                reviewer_id: user.id,
                target_id: String(targetId),
                target_type: targetType,
                rating,
                comment,
                verified: true,
                created_at: new Date().toISOString(),
            });
            if (error) {
                if (error.code === '23505') { toast.error('You already reviewed this item.'); return false; }
                throw error;
            }
            await fetchReviews();
            return true;
        } catch (err) {
            toast.error(err.message || 'Failed to submit review.');
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    return { reviews, loading, submitting, submitReview, refetch: fetchReviews };
}
