import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const PAYSTACK_PUBLIC_KEY = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxx';
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';

/**
 * Load Paystack inline JS once
 */
let paystackLoaded = false;
function loadPaystackScript() {
    return new Promise((resolve, reject) => {
        if (paystackLoaded || window.PaystackPop) { paystackLoaded = true; resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://js.paystack.co/v1/inline.js';
        s.onload = () => { paystackLoaded = true; resolve(); };
        s.onerror = () => reject(new Error('Failed to load Paystack'));
        document.head.appendChild(s);
    });
}

export function usePayments() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [txLoading, setTxLoading] = useState(false);

    // ── Paystack Card Payment ────────────────────────────────────────────────
    const payWithCard = useCallback(async ({ amount, email, metadata = {}, onSuccess, onClose }) => {
        if (!user) { toast.error('Please sign in first'); return; }
        setLoading(true);
        try {
            await loadPaystackScript();
            const reference = `SP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            // Record pending payment in DB
            await supabase.from('payments').insert({
                user_id: user.id,
                amount,
                method: 'card',
                status: 'pending',
                reference,
                booking_id: metadata.bookingId || null,
                order_id: metadata.orderId || null,
                ride_id: metadata.rideId || null,
                meta: metadata,
            });

            const handler = window.PaystackPop.setup({
                key: PAYSTACK_PUBLIC_KEY,
                email: email || user.email,
                amount: Math.round(amount * 100), // Paystack uses pesewas
                currency: 'GHS',
                ref: reference,
                metadata: { user_id: user.id, ...metadata },
                callback: async (response) => {
                    // Verify payment server-side
                    await supabase.from('payments').update({
                        status: 'completed',
                        meta: { ...metadata, paystack_ref: response.reference },
                    }).eq('reference', reference);

                    // Update linked entity payment status (enum: 'completed')
                    if (metadata.bookingId) {
                        await supabase.from('bookings').update({ payment_status: 'completed' }).eq('id', metadata.bookingId);
                    }
                    if (metadata.orderId) {
                        await supabase.from('orders').update({ payment_status: 'completed' }).eq('id', metadata.orderId);
                    }
                    if (metadata.rideId) {
                        await supabase.from('rides').update({ payment_status: 'completed' }).eq('id', metadata.rideId);
                    }
                    if (metadata.isTopup) {
                        await supabase.rpc('topup_wallet', { p_user_id: user.id, p_amount: amount, p_ref: reference });
                        await supabase.from('wallet_transactions').insert({
                            user_id: user.id, amount, type: 'topup',
                            description: 'Card top-up via Paystack', reference,
                        });
                    }

                    toast.success('Payment successful! ✅');
                    onSuccess?.(response);
                    setLoading(false);
                },
                onClose: () => {
                    setLoading(false);
                    onClose?.();
                },
            });
            handler.openIframe();
        } catch (err) {
            toast.error(err.message || 'Payment failed');
            setLoading(false);
        }
    }, [user]);

    // ── MTN MoMo Payment ─────────────────────────────────────────────────────
    const payWithMomo = useCallback(async ({ amount, phone, metadata = {}, onSuccess, onClose }) => {
        if (!user) { toast.error('Please sign in first'); return; }
        setLoading(true);
        try {
            const { data: session } = await supabase.auth.getSession();
            const token = session?.session?.access_token;

            const res = await fetch(`${SUPABASE_URL}/functions/v1/process-momo-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    phone,
                    amount,
                    currency: 'GHS',
                    bookingId: metadata.bookingId || null,
                    orderId: metadata.orderId || null,
                    rideId: metadata.rideId || null,
                    idempotencyKey: `momo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'MoMo payment failed');

            toast.success('MoMo prompt sent! Check your phone to approve. 📱');

            // Poll for confirmation (webhook will update status)
            const reference = result.reference;
            let attempts = 0;
            const pollInterval = setInterval(async () => {
                attempts++;
                const { data: payment } = await supabase
                    .from('payments')
                    .select('status')
                    .eq('reference', reference)
                    .single();

                if (payment?.status === 'completed') {
                    clearInterval(pollInterval);
                    toast.success('Payment confirmed! ✅');
                    onSuccess?.({ reference });
                    setLoading(false);
                } else if (payment?.status === 'failed' || attempts > 60) {
                    clearInterval(pollInterval);
                    if (attempts > 60) toast.error('Payment timed out. Please try again.');
                    else toast.error('Payment failed. Please try again.');
                    onClose?.();
                    setLoading(false);
                }
            }, 3000);
        } catch (err) {
            toast.error(err.message || 'MoMo payment failed');
            setLoading(false);
        }
    }, [user]);

    // ── Wallet Payment ────────────────────────────────────────────────────────
    const payWithWallet = useCallback(async ({ amount, metadata = {}, onSuccess }) => {
        if (!user) { toast.error('Please sign in first'); return; }
        setLoading(true);
        try {
            // Check balance
            const { data: profile } = await supabase
                .from('profiles').select('wallet_balance').eq('id', user.id).single();
            if (!profile || profile.wallet_balance < amount) {
                toast.error('Insufficient wallet balance');
                setLoading(false);
                return;
            }

            await supabase.rpc('deduct_wallet', { p_user_id: user.id, p_amount: amount });

            const reference = `WAL-${Date.now()}`;
            await supabase.from('payments').insert({
                user_id: user.id, amount, method: 'wallet', status: 'completed', reference,
                booking_id: metadata.bookingId || null,
                order_id: metadata.orderId || null,
                ride_id: metadata.rideId || null,
                meta: metadata,
            });
            await supabase.from('wallet_transactions').insert({
                user_id: user.id, amount: -amount, type: 'payment',
                description: metadata.description || 'Wallet payment', reference,
                booking_id: metadata.bookingId || null,
                order_id: metadata.orderId || null,
            });

            // Update linked entity payment status
            if (metadata.bookingId) await supabase.from('bookings').update({ payment_status: 'completed' }).eq('id', metadata.bookingId);
            if (metadata.orderId) await supabase.from('orders').update({ payment_status: 'completed' }).eq('id', metadata.orderId);
            if (metadata.rideId) await supabase.from('rides').update({ payment_status: 'completed' }).eq('id', metadata.rideId);

            toast.success('Paid from wallet! ✅');
            onSuccess?.({ reference });
        } catch (err) {
            toast.error(err.message || 'Wallet payment failed');
        } finally {
            setLoading(false);
        }
    }, [user]);

    // ── Fetch Transaction History ─────────────────────────────────────────────
    const fetchTransactions = useCallback(async () => {
        if (!user) return;
        setTxLoading(true);
        try {
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);
            if (!error && data) setTransactions(data);
        } catch { /* ignore */ } finally { setTxLoading(false); }
    }, [user]);

    return { loading, payWithCard, payWithMomo, payWithWallet, transactions, txLoading, fetchTransactions };
}
