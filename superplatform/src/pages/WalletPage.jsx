import React, { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, Clock, CreditCard, TrendingUp, Download } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { usePayments } from '../hooks/usePayments';
import { useAuthStore } from '../store/authStore';
import { fmt, fmtDate, fmtTime } from '../utils/helpers';
import PaymentModal from '../components/common/PaymentModal';

const TX_ICONS = {
    topup: <ArrowDownLeft size={16} className="text-emerald-400" />,
    payment: <ArrowUpRight size={16} className="text-red-400" />,
    refund: <ArrowDownLeft size={16} className="text-blue-400" />,
    payout: <ArrowUpRight size={16} className="text-orange-400" />,
    commission: <ArrowUpRight size={16} className="text-purple-400" />,
    adjustment: <CreditCard size={16} className="text-[var(--text-muted)]" />,
};

export default function WalletPage() {
    const { profile } = useAuthStore();
    const { balance, transactions, loading } = useWallet();
    const [showTopup, setShowTopup] = useState(false);
    const [topupAmount, setTopupAmount] = useState('');
    const [showPayModal, setShowPayModal] = useState(false);
    const [filter, setFilter] = useState('all');

    const quickAmounts = [50, 100, 200, 500, 1000];

    const filtered = filter === 'all'
        ? transactions
        : transactions.filter(t => t.type === filter);

    const totalIn = transactions.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="heading-lg">My Wallet</h1>
                    <p className="text-muted">Manage your SuperPlatform balance</p>
                </div>
            </div>

            {/* Balance Card */}
            <div className="card p-6 mb-6 bg-gradient-to-br from-brand-600/20 to-brand-900/20 border-brand-500/20">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-brand-500/20 rounded-2xl flex items-center justify-center">
                        <Wallet size={24} className="text-brand-400" />
                    </div>
                    <div>
                        <p className="text-muted text-sm">Available Balance</p>
                        <p className="font-display text-4xl font-bold text-[var(--text)]">{fmt(balance)}</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setShowTopup(true)}
                        className="btn-primary flex items-center gap-2 px-5">
                        <Plus size={16} /> Top Up
                    </button>
                    <button className="btn-ghost flex items-center gap-2 px-5 border border-[var(--border)]">
                        <Download size={16} /> Withdraw
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="card p-4">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <ArrowDownLeft size={14} /> <span className="text-xs text-muted">Total In</span>
                    </div>
                    <p className="font-semibold text-[var(--text)]">{fmt(totalIn)}</p>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-2 text-red-400 mb-1">
                        <ArrowUpRight size={14} /> <span className="text-xs text-muted">Total Out</span>
                    </div>
                    <p className="font-semibold text-[var(--text)]">{fmt(totalOut)}</p>
                </div>
                <div className="card p-4 col-span-2 md:col-span-1">
                    <div className="flex items-center gap-2 text-brand-400 mb-1">
                        <TrendingUp size={14} /> <span className="text-xs text-muted">Transactions</span>
                    </div>
                    <p className="font-semibold text-[var(--text)]">{transactions.length}</p>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {['all', 'topup', 'payment', 'refund', 'payout', 'commission'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-all ${filter === f ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-muted)]'
                            }`}>
                        {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Transaction History */}
            <div className="card divide-y divide-white/5">
                <div className="p-4 border-b border-[var(--border)]">
                    <h3 className="heading-sm flex items-center gap-2">
                        <Clock size={16} /> Transaction History
                    </h3>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-[var(--text)]/30">
                        <div className="w-6 h-6 border-2 border-white/20 border-t-brand-400 rounded-full animate-spin mx-auto mb-3" />
                        Loading transactions...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-[var(--text)]/30">
                        <Wallet size={32} className="mx-auto mb-3 text-[var(--text)]/10" />
                        <p>No transactions yet</p>
                    </div>
                ) : (
                    filtered.map((tx, i) => (
                        <div key={tx.id || i} className="p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                            <div className="w-9 h-9 bg-[var(--bg-card)] rounded-xl flex items-center justify-center shrink-0">
                                {TX_ICONS[tx.type] || <CreditCard size={16} className="text-[var(--text)]/40" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--text)] truncate">{tx.description || tx.type}</p>
                                <p className="text-xs text-[var(--text)]/30">
                                    {tx.created_at ? `${fmtDate(tx.created_at)} · ${fmtTime(tx.created_at)}` : '—'}
                                    {tx.reference && ` · ${tx.reference}`}
                                </p>
                            </div>
                            <span className={`text-sm font-semibold ${Number(tx.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {Number(tx.amount) >= 0 ? '+' : ''}{fmt(Math.abs(tx.amount))}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Top-up Modal */}
            {showTopup && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-4"
                    onClick={e => e.target === e.currentTarget && setShowTopup(false)}>
                    <div className="w-full max-w-sm card p-6" style={{ animation: 'fadeUp .3s ease' }}>
                        <h3 className="heading-sm mb-4">Top Up Wallet</h3>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {quickAmounts.map(a => (
                                <button key={a} onClick={() => setTopupAmount(String(a))}
                                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${topupAmount === String(a)
                                            ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                                            : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-muted)]'
                                        }`}>
                                    {fmt(a)}
                                </button>
                            ))}
                        </div>

                        <div className="mb-4">
                            <label className="label">Custom Amount</label>
                            <input value={topupAmount} onChange={e => setTopupAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                className="input" placeholder="Enter amount" type="text" />
                        </div>

                        <button
                            onClick={() => { setShowTopup(false); setShowPayModal(true); }}
                            disabled={!topupAmount || Number(topupAmount) <= 0}
                            className="btn-primary w-full">
                            Continue to Payment
                        </button>
                    </div>
                </div>
            )}

            {showPayModal && (
                <PaymentModal
                    amount={Number(topupAmount)}
                    title="Wallet Top-Up"
                    metadata={{ isTopup: true }}
                    onSuccess={() => { setShowPayModal(false); setTopupAmount(''); }}
                    onClose={() => setShowPayModal(false)}
                />
            )}
        </div>
    );
}
