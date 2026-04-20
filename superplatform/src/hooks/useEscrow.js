import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const PLATFORM_COMMISSION = 0.05; // 5%

/**
 * useEscrow — Manages marketplace escrow purchases
 *
 * Flow:
 *   1. Buyer pays (Paystack / MoMo / Wallet)
 *   2. `createEscrowOrder()` is called with payment reference
 *   3. Supabase RPC `create_marketplace_order` holds funds in escrow
 *   4. Seller sees order in their dashboard with "pending" status
 *   5. Admin or buyer confirms delivery → `releaseEscrow(orderId)`
 *   6. Seller wallet receives funds (minus 5% commission)
 */
export function useEscrow() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);

    /**
     * Calculate commission and seller payout for a given price
     */
    const calculateBreakdown = (price) => {
        const numPrice = Number(price) || 0;
        const commission = Math.round(numPrice * PLATFORM_COMMISSION * 100) / 100;
        const sellerAmount = Math.round((numPrice - commission) * 100) / 100;
        return { price: numPrice, commission, sellerAmount, commissionRate: PLATFORM_COMMISSION };
    };

    /**
     * Create an escrow order after payment is confirmed.
     * Calls the Supabase RPC `create_marketplace_order`.
     *
     * @param {Object} params
     * @param {string} params.productId — UUID of the product being purchased
     * @param {number} params.amount    — Total price paid by buyer
     * @param {string} params.paymentRef — Reference from Paystack/MoMo
     * @returns {Promise<{orderId: string}|null>}
     */
    const createEscrowOrder = useCallback(async ({ productId, amount, paymentRef }) => {
        if (!user) { toast.error('Please sign in first'); return null; }
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('create_marketplace_order', {
                p_buyer_id: user.id,
                p_product_id: productId,
                p_amount: amount,
                p_payment_ref: paymentRef,
            });

            if (error) throw error;

            // Mark product as reserved (remove from public listing)
            await supabase
                .from('products')
                .update({ status: 'sold' })
                .eq('id', productId);

            toast.success('Purchase secured in escrow! Seller will be notified. 🔒');
            return { orderId: data };
        } catch (err) {
            console.error('Escrow order error:', err);
            toast.error(err.message || 'Failed to create escrow order');
            return null;
        } finally {
            setLoading(false);
        }
    }, [user]);

    /**
     * Release escrow to seller after delivery confirmed.
     * Called by admin or buyer.
     *
     * @param {string} orderId — UUID of the order
     */
    const releaseEscrow = useCallback(async (orderId) => {
        if (!user) return;
        setLoading(true);
        try {
            const { error } = await supabase.rpc('release_escrow_to_seller', {
                p_order_id: orderId,
            });
            if (error) throw error;
            toast.success('Payment released to seller wallet! ✅');
        } catch (err) {
            toast.error(err.message || 'Failed to release escrow');
        } finally {
            setLoading(false);
        }
    }, [user]);

    /**
     * Refund buyer — for disputes resolved in buyer's favour.
     * Admin only.
     *
     * @param {string} orderId
     */
    const refundEscrow = useCallback(async (orderId) => {
        if (!user) return;
        setLoading(true);
        try {
            const { error } = await supabase.rpc('refund_escrow_to_buyer', {
                p_order_id: orderId,
            });
            if (error) throw error;
            toast.success('Buyer refunded successfully.');
        } catch (err) {
            toast.error(err.message || 'Failed to process refund');
        } finally {
            setLoading(false);
        }
    }, [user]);

    /**
     * Fetch seller's marketplace orders (orders where they are the seller)
     */
    const fetchSellerOrders = useCallback(async () => {
        if (!user) return [];
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    products(title, images, condition, category),
                    profiles!orders_user_id_fkey(full_name, phone)
                `)
                .eq('seller_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('fetchSellerOrders error:', err);
            return [];
        }
    }, [user]);

    /**
     * Fetch buyer's marketplace purchases
     */
    const fetchBuyerOrders = useCallback(async () => {
        if (!user) return [];
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    products(title, images, condition, category),
                    profiles!orders_seller_id_fkey(full_name, phone)
                `)
                .eq('user_id', user.id)
                .not('product_id', 'is', null)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (err) {
            return [];
        }
    }, [user]);

    return {
        loading,
        calculateBreakdown,
        createEscrowOrder,
        releaseEscrow,
        refundEscrow,
        fetchSellerOrders,
        fetchBuyerOrders,
        PLATFORM_COMMISSION,
    };
}
