import React, { useState, useEffect } from 'react';
import { X, CreditCard, Phone, Wallet, Check, Loader2, AlertCircle } from 'lucide-react';
import { PAYMENT_METHODS, CURRENCY } from '../../lib/constants';
import { fmt } from '../../utils/helpers';
import { usePayments } from '../../hooks/usePayments';
import { useWallet } from '../../hooks/useWallet';
import toast from 'react-hot-toast';

export default function PaymentModal({ amount, title, metadata = {}, onSuccess, onClose }) {
  const [method, setMethod] = useState('mtn');
  const [momoNum, setMomoNum] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const { loading, payWithCard, payWithMomo, payWithWallet } = usePayments();
  const { balance } = useWallet();

  const isMomo = ['mtn', 'vodafone', 'airteltigo'].includes(method);

  const handlePay = async () => {
    setError('');

    if (isMomo && !momoNum) { toast.error('Enter your mobile money number'); return; }
    if (method === 'card' && (!cardNum || !expiry || !cvv || !cardName)) { toast.error('Fill in all card details'); return; }
    if (method === 'wallet' && balance < amount) { toast.error('Insufficient wallet balance'); return; }

    const callbacks = {
      onSuccess: (res) => {
        setDone(true);
        setTimeout(() => { onSuccess?.(res); onClose?.(); }, 1500);
      },
      onClose: () => { onClose?.(); },
    };

    try {
      if (method === 'card') {
        await payWithCard({ amount, metadata, ...callbacks });
      } else if (isMomo) {
        await payWithMomo({ amount, phone: momoNum, metadata, ...callbacks });
      } else if (method === 'wallet') {
        await payWithWallet({ amount, metadata, onSuccess: callbacks.onSuccess });
      }
    } catch (err) {
      setError(err.message || 'Payment failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="w-full max-w-md card overflow-hidden" style={{ animation: 'fadeUp .3s ease' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div>
            <h3 className="heading-sm">Complete Payment</h3>
            <p className="text-muted text-sm mt-0.5">{title}</p>
          </div>
          <button onClick={onClose} className="p-2 btn-ghost rounded-xl"><X size={18} /></button>
        </div>

        {done ? (
          <div className="p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
              <Check size={28} className="text-emerald-400" />
            </div>
            <h3 className="heading-md mb-2">Payment Successful!</h3>
            <p className="text-muted text-sm">{fmt(amount)} paid successfully.</p>
          </div>
        ) : (
          <div className="p-5">
            {/* Amount */}
            <div className="glass rounded-2xl p-4 mb-5 text-center">
              <p className="text-muted text-xs mb-1">Total Amount</p>
              <p className="font-display text-3xl font-bold text-[var(--text)]">{fmt(amount)}</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Method selection */}
            <div className="space-y-2 mb-5">
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.id} onClick={() => setMethod(pm.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${method === pm.id ? 'border-brand-500 bg-brand-500/10' : 'border-white/8 bg-[var(--bg-card)] hover:border-white/15'
                    }`}>
                  <span className="text-2xl">{pm.icon}</span>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${method === pm.id ? 'text-brand-300' : 'text-[var(--text-muted)]'}`}>{pm.name}</p>
                    <p className="text-xs text-[var(--text)]/35">{pm.hint}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${method === pm.id ? 'border-brand-500 bg-brand-500' : 'border-white/20'}`}>
                    {method === pm.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>

            {/* MoMo number input */}
            {isMomo && (
              <div className="mb-4">
                <label className="label">Mobile Money Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text)]/30" size={15} />
                  <input value={momoNum} onChange={e => setMomoNum(e.target.value)}
                    className="input pl-9" placeholder="+233 XX XXX XXXX" type="tel" />
                </div>
                <p className="text-xs text-[var(--text)]/30 mt-1.5">You'll receive a prompt to approve the payment.</p>
              </div>
            )}

            {/* Card inputs */}
            {method === 'card' && (
              <div className="space-y-3 mb-4">
                <div className="glass rounded-xl p-3 flex items-center gap-2 text-xs text-brand-300">
                  <CreditCard size={14} />
                  <span>Secured by Paystack — Visa, Mastercard accepted</span>
                </div>
                <div>
                  <label className="label">Card Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text)]/30" size={15} />
                    <input value={cardNum} onChange={e => setCardNum(e.target.value)}
                      className="input pl-9" placeholder="1234 5678 9012 3456" maxLength={19} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="label">Expiry</label>
                    <input value={expiry} onChange={e => setExpiry(e.target.value)} className="input" placeholder="MM / YY" maxLength={7} />
                  </div>
                  <div>
                    <label className="label">CVV</label>
                    <input value={cvv} onChange={e => setCvv(e.target.value)} className="input" placeholder="123" maxLength={4} type="password" />
                  </div>
                </div>
                <div>
                  <label className="label">Name on Card</label>
                  <input value={cardName} onChange={e => setCardName(e.target.value)} className="input" placeholder="John Mensah" />
                </div>
              </div>
            )}

            {/* Wallet */}
            {method === 'wallet' && (
              <div className="mb-4">
                <div className={`glass rounded-xl p-4 flex items-center gap-3 ${balance < amount ? 'border border-red-500/30' : ''}`}>
                  <Wallet size={20} className="text-brand-400" />
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">SP Wallet Balance</p>
                    <p className={`text-xs ${balance >= amount ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmt(balance)} available {balance < amount && '— insufficient'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button onClick={handlePay} disabled={loading || (method === 'wallet' && balance < amount)}
              className="btn-primary w-full btn-lg relative">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {isMomo ? 'Sending prompt…' : 'Processing…'}
                </span>
              ) : `Pay ${fmt(amount)}`}
            </button>
            <p className="text-center text-xs text-[var(--text)]/25 mt-3">🔒 Secured by SSL encryption</p>
          </div>
        )}
      </div>
    </div>
  );
}
