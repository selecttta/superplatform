import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, FileText, Check } from 'lucide-react';
import { fmt } from '../../utils/helpers';
import PaymentModal from './PaymentModal';
import toast from 'react-hot-toast';

const TIME_SLOTS = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM'];

export default function BookingModal({ service, provider, onClose }) {
  const [step, setStep]   = useState(1); // 1=details, 2=payment, 3=done
  const [date, setDate]   = useState('');
  const [time, setTime]   = useState('');
  const [addr, setAddr]   = useState('');
  const [notes, setNotes] = useState('');
  const [showPay, setShowPay] = useState(false);

  const minDate = new Date().toISOString().split('T')[0];
  const price   = service?.price || provider?.price || 0;
  const name    = service?.name  || provider?.name  || 'Service';

  const handleContinue = () => {
    if (!date || !time) { toast.error('Please select date and time.'); return; }
    setShowPay(true);
  };

  if (step === 3) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm card p-10 text-center" style={{animation:'fadeUp .3s ease'}}>
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-emerald-400" />
          </div>
          <h3 className="heading-md mb-2">Booking Confirmed!</h3>
          <p className="text-muted text-sm mb-1">{name}</p>
          <p className="text-[var(--text-muted)] text-sm">{date} at {time}</p>
          {addr && <p className="text-[var(--text)]/40 text-xs mt-1 flex items-center justify-center gap-1"><MapPin size={11}/>{addr}</p>}
          <div className="mt-6 p-4 glass rounded-xl text-sm">
            <p className="text-[var(--text-muted)]">Booking Reference</p>
            <p className="font-mono font-bold text-brand-400 mt-1">BK-{Math.random().toString(36).slice(2,8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="btn-primary w-full mt-6">Done</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-4"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="w-full max-w-md card overflow-hidden" style={{animation:'fadeUp .3s ease'}}>
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
            <div>
              <h3 className="heading-sm">Book Service</h3>
              <p className="text-muted text-sm mt-0.5">{name}</p>
            </div>
            <button onClick={onClose} className="p-2 btn-ghost rounded-xl"><X size={18} /></button>
          </div>

          <div className="p-5 space-y-4">
            {/* Date */}
            <div>
              <label className="label"><Calendar size={11} className="inline mr-1" />Preferred Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="input" min={minDate} />
            </div>

            {/* Time slots */}
            <div>
              <label className="label"><Clock size={11} className="inline mr-1" />Preferred Time</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(t => (
                  <button key={t} onClick={() => setTime(t)}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                      time === t ? 'bg-brand-500 text-[var(--text)]' : 'glass text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]'
                    }`}>{t}</button>
                ))}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="label"><MapPin size={11} className="inline mr-1" />Service Address</label>
              <input value={addr} onChange={e => setAddr(e.target.value)}
                className="input" placeholder="Your address or location" />
            </div>

            {/* Notes */}
            <div>
              <label className="label"><FileText size={11} className="inline mr-1" />Additional Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                className="input resize-none h-20" placeholder="Describe what needs to be done…" />
            </div>

            {/* Summary */}
            <div className="glass rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-[var(--text-muted)]">Service Fee</span>
              <span className="font-bold text-[var(--text)]">{fmt(price)}</span>
            </div>

            <button onClick={handleContinue} className="btn-primary w-full btn-lg">
              Continue to Payment →
            </button>
          </div>
        </div>
      </div>

      {showPay && (
        <PaymentModal
          amount={price}
          title={name}
          onSuccess={() => { setShowPay(false); setStep(3); }}
          onClose={() => setShowPay(false)}
        />
      )}
    </>
  );
}
