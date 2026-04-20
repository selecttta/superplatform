import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function useWallet() {
    const { user, profile } = useAuthStore();
    const [balance, setBalance] = useState(profile?.wallet_balance ?? 0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBalance = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await supabase
                .from('profiles')
                .select('wallet_balance')
                .eq('id', user.id)
                .single();
            if (data) setBalance(data.wallet_balance ?? 0);
        } catch { /* ignore */ }
    }, [user]);

    const fetchTransactions = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(100);
            if (!error && data) setTransactions(data);
        } catch {
            setTransactions([]);
        } finally { setLoading(false); }
    }, [user]);

    useEffect(() => {
        fetchBalance();
        fetchTransactions();
    }, [fetchBalance, fetchTransactions]);

    // Real-time subscription for balance changes
    useEffect(() => {
        if (!user) return;
        const sub = supabase
            .channel(`wallet:${user.id}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'wallet_transactions',
                filter: `user_id=eq.${user.id}`,
            }, () => {
                fetchBalance();
                fetchTransactions();
            })
            .subscribe();
        return () => { sub.unsubscribe(); };
    }, [user, fetchBalance, fetchTransactions]);

    return { balance, transactions, loading, refetch: () => { fetchBalance(); fetchTransactions(); } };
}
