import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, Check, ArrowRight, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const ROLES = [
  { id: 'customer', icon: '🛍️', title: 'Customer', desc: 'Shop, book services & explore' },
  { id: 'provider', icon: '🧑‍🔧', title: 'Service Provider', desc: 'List & sell your services/products' },
];

const STEPS = ['Choose Role', 'Your Details', 'Create Account'];

function PwStrength({ password }) {
  const len = password.length;
  const strength = len === 0 ? 0 : len < 6 ? 1 : len < 10 ? 2 : 3;
  const colors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-emerald-500'];
  const labels = ['', 'Weak', 'Medium', 'Strong'];
  return password ? (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3].map(n => <div key={n} className={`h-1 flex-1 rounded-full ${n <= strength ? colors[strength] : 'bg-[var(--bg-input)]'} transition-all`} />)}
      </div>
      <span className="text-xs text-[var(--text)]/40">{labels[strength]}</span>
    </div>
  ) : null;
}

// ── Email Verification Success Screen ────────────────────────────────────────
function VerifyEmailScreen({ email, onResend, loading }) {
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    const ok = await onResend(email);
    if (ok) setResent(true);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center font-black text-[var(--text)] text-sm">S</div>
          <span className="font-display font-bold text-lg"><span className="gradient-text">Super</span><span className="text-[var(--text)]">Platform GH</span></span>
        </Link>

        <div className="card p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={36} className="text-brand-400" />
          </div>

          <h2 className="heading-md mb-3">Check Your Email</h2>
          <p className="text-muted text-sm leading-relaxed mb-2">
            We sent a verification link to:
          </p>
          <p className="font-semibold text-[var(--text)] mb-6">{email}</p>

          <div className="bg-[var(--bg-card)] rounded-xl p-4 mb-6 text-sm text-left space-y-2">
            {[
              'Open the email from SuperPlatform GH',
              'Click the "Confirm your email" link',
              'Return here and sign in',
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                <span className="text-[var(--text-muted)]">{step}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-[var(--text)]/30 mb-5">Didn't receive the email? Check your spam folder or request a new one.</p>

          {resent ? (
            <div className="flex items-center justify-center gap-2 text-emerald-400 mb-4 text-sm">
              <CheckCircle size={16} />
              <span>Verification email resent successfully!</span>
            </div>
          ) : (
            <button
              onClick={handleResend}
              disabled={loading}
              className="btn btn-secondary w-full gap-2 mb-4"
            >
              {loading
                ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</span>
                : <><RefreshCw size={14} /> Resend Verification Email</>
              }
            </button>
          )}

          <Link to="/login" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Back to Sign In →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main Register Page ────────────────────────────────────────────────────────
export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState('customer');
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const { signUp, resendVerification, loading } = useAuthStore();

  const pwMatch = form.password === form.confirm;
  const pwOk = form.password.length >= 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pwMatch || !pwOk || !agreed) return;
    setError('');
    const res = await signUp({ email: form.email, password: form.password, fullName: form.fullName, phone: form.phone, role });

    if (res.duplicate) {
      setError(res.error);
      setStep(1); // Go back to email entry
      return;
    }

    if (!res.success) {
      setError(res.error || 'Registration failed. Please try again.');
      return;
    }

    if (res.needsVerification) {
      setVerifyEmail(res.email || form.email);
    }
  };

  // Show verification screen after successful signup
  if (verifyEmail) {
    return <VerifyEmailScreen email={verifyEmail} onResend={resendVerification} loading={loading} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center font-black text-[var(--text)] text-sm">S</div>
          <span className="font-display font-bold text-lg"><span className="gradient-text">Super</span><span className="text-[var(--text)]">Platform GH</span></span>
        </Link>

        <div className="card p-6 sm:p-8">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > i ? 'bg-emerald-500 text-[var(--text)]' : step === i ? 'bg-brand-500 text-[var(--text)]' : 'bg-[var(--bg-input)] text-[var(--text)]/30'}`}>
                    {step > i ? <Check size={13} /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:block ${step >= i ? 'text-[var(--text-muted)]' : 'text-[var(--text)]/25'}`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px ${step > i ? 'bg-emerald-500/50' : 'bg-[var(--bg-input)]'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 0 — Role */}
          {step === 0 && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <h2 className="heading-md mb-1">Create your account</h2>
              <p className="text-muted text-sm mb-6">How will you use SuperPlatform?</p>
              <div className="space-y-3 mb-8">
                {ROLES.map(r => (
                  <button key={r.id} onClick={() => setRole(r.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${role === r.id ? 'border-brand-500 bg-brand-500/10' : 'border-white/8 bg-[var(--bg-card)] hover:border-white/20'}`}>
                    <span className="text-3xl">{r.icon}</span>
                    <div className="text-left flex-1">
                      <p className={`font-semibold ${role === r.id ? 'text-brand-300' : 'text-[var(--text)]'}`}>{r.title}</p>
                      <p className="text-xs text-[var(--text)]/40 mt-0.5">{r.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${role === r.id ? 'border-brand-500 bg-brand-500' : 'border-white/20'}`}>
                      {role === r.id && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="btn-primary w-full btn-lg">
                Continue <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 1 — Details */}
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} style={{ animation: 'fadeUp .4s ease' }}>
              <h2 className="heading-md mb-1">Your details</h2>
              <p className="text-muted text-sm mb-6">Fill in your information to continue.</p>

              {/* Duplicate email error */}
              {error && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl p-3 mb-4">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="label">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={14} />
                    <input type="text" value={form.fullName} onChange={e => { setForm({ ...form, fullName: e.target.value }); setError(''); }}
                      className="input pl-10" placeholder="John Mensah" required />
                  </div>
                </div>
                <div>
                  <label className="label">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={14} />
                    <input type="email" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setError(''); }}
                      className="input pl-10" placeholder="john@example.com" required />
                  </div>
                </div>
                <div>
                  <label className="label">Phone Number <span className="text-[var(--text)]/25">(optional)</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={14} />
                    <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="input pl-10" placeholder="+233 24 000 0000" />
                  </div>
                </div>
                <div>
                  <label className="label">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={14} />
                    <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                      className="input pl-10 pr-10" placeholder="Minimum 8 characters" required minLength={8} />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text)]/30">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <PwStrength password={form.password} />
                </div>
                <div>
                  <label className="label">Confirm Password *</label>
                  <input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
                    className={`input ${form.confirm && !pwMatch ? 'border-red-500/70' : ''}`}
                    placeholder="Repeat your password" required />
                  {form.confirm && !pwMatch && <p className="text-xs text-red-400 mt-1">Passwords don't match</p>}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
                <button type="submit" disabled={!pwOk || !pwMatch} className="btn-primary flex-1">Review →</button>
              </div>
            </form>
          )}

          {/* Step 2 — Confirm & Create */}
          {step === 2 && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <h2 className="heading-md mb-1">Confirm & Submit</h2>
              <p className="text-muted text-sm mb-6">Review your details before creating your account.</p>
              <div className="glass rounded-2xl p-4 space-y-3 mb-5 text-sm">
                {[
                  { label: 'Name', val: form.fullName },
                  { label: 'Email', val: form.email },
                  { label: 'Phone', val: form.phone || '—' },
                  { label: 'Role', val: ROLES.find(r => r.id === role)?.title },
                ].map(item => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-muted">{item.label}</span>
                    <span className="text-[var(--text)] font-medium">{item.val}</span>
                  </div>
                ))}
              </div>

              {role === 'provider' && (
                <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-3 mb-4 text-xs text-yellow-300">
                  ⚠️ Provider accounts require admin approval before you can publish listings. You will be notified by email once approved.
                </div>
              )}

              <div className="bg-brand-500/8 border border-brand-500/20 rounded-xl p-3 mb-5 flex items-start gap-2">
                <Mail size={14} className="text-brand-400 mt-0.5 shrink-0" />
                <p className="text-xs text-brand-300">
                  A verification email will be sent to <strong>{form.email}</strong>. You must verify your email before you can sign in.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer mb-6">
                <div onClick={() => setAgreed(v => !v)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${agreed ? 'bg-brand-500 border-brand-500' : 'border-white/25'}`}>
                  {agreed && <Check size={11} className="text-[var(--text)]" />}
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  I agree to the <Link to="/terms" className="text-brand-400">Terms of Service</Link> and <Link to="/privacy" className="text-brand-400">Privacy Policy</Link>
                </span>
              </label>

              {error && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl p-3 mb-4">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleSubmit} disabled={loading || !agreed} className="btn-primary flex-1">
                  {loading
                    ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</span>
                    : 'Create Account'}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-muted mt-6">
            Already have an account? <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
