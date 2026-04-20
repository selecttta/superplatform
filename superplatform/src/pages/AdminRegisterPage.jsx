import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, Check, ArrowRight, Shield, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

function PwStrength({ password }) {
  const len = password.length;
  const strength = len === 0 ? 0 : len < 6 ? 1 : len < 10 ? 2 : 3;
  const colors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-emerald-500'];
  const labels = ['', 'Weak', 'Medium', 'Strong'];
  return password ? (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3].map(n => <div key={n} className={`h-1 flex-1 rounded-full ${n <= strength ? colors[strength] : 'bg-white/[0.06]'} transition-all`} />)}
      </div>
      <span className="text-xs text-white/30">{labels[strength]}</span>
    </div>
  ) : null;
}

export default function AdminRegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [resent, setResent] = useState(false);
  const { signUp, resendVerification, loading } = useAuthStore();
  const navigate = useNavigate();

  const pwMatch = form.password === form.confirm;
  const pwOk = form.password.length >= 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pwMatch || !pwOk) return;
    setError('');

    // Register with admin role
    const res = await signUp({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      phone: form.phone,
      role: 'admin',
    });

    if (res.duplicate) {
      setError(res.error);
      return;
    }
    if (!res.success) {
      setError(res.error || 'Registration failed.');
      return;
    }
    if (res.needsVerification) {
      setVerifyEmail(res.email || form.email);
    }
  };

  const handleResend = async () => {
    const ok = await resendVerification(verifyEmail);
    if (ok) setResent(true);
  };

  // ── Verification screen ────────────────────────────────────────────────
  if (verifyEmail) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-sm" style={{ animation: 'fadeUp .5s ease' }}>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center backdrop-blur-xl">
            <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <Mail size={28} className="text-brand-400" />
            </div>
            <h2 className="font-display font-bold text-xl text-white mb-2">Verify Your Email</h2>
            <p className="text-white/40 text-sm mb-1">We sent a verification link to:</p>
            <p className="font-semibold text-white mb-6">{verifyEmail}</p>
            <p className="text-white/25 text-xs mb-5">Check your inbox and click the verification link, then return here to sign in.</p>

            {resent ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 mb-5 text-sm">
                <CheckCircle size={16} />
                <span>Email resent successfully!</span>
              </div>
            ) : (
              <button
                onClick={handleResend}
                disabled={loading}
                className="w-full bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.08] text-white rounded-xl py-2.5 text-sm transition-colors mb-4 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                ) : (
                  <><RefreshCw size={14} /> Resend Email</>
                )}
              </button>
            )}

            <button
              onClick={() => navigate('/empire/login')}
              className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-sm" style={{ animation: 'fadeUp .5s ease' }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-500/30 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-500/20 shadow-lg shadow-brand-500/10">
            <Shield size={28} className="text-brand-400" />
          </div>
          <h1 className="font-display font-black text-2xl text-white mb-1">
            Admin Registration
          </h1>
          <p className="text-white/30 text-sm">Create your administrator account</p>
        </div>

        {/* Form */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl p-3 mb-5">
              <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-all"
                  placeholder="Administrator Name" required />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                <input type="email" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setError(''); }}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-all"
                  placeholder="admin@superplatform.com" required />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                Phone <span className="text-white/15">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-all"
                  placeholder="+233 24 000 0000" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-all"
                  placeholder="Minimum 8 characters" required minLength={8} />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <PwStrength password={form.password} />
            </div>

            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">Confirm Password *</label>
              <input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
                className={`w-full bg-white/[0.04] border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-all ${form.confirm && !pwMatch ? 'border-red-500/50' : 'border-white/[0.08]'}`}
                placeholder="Repeat your password" required />
              {form.confirm && !pwMatch && <p className="text-xs text-red-400 mt-1">Passwords don't match</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !pwOk || !pwMatch}
              className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Admin Account <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-white/25 text-sm mt-6">
            Already registered?{' '}
            <button onClick={() => navigate('/empire/login')} className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign in →
            </button>
          </p>
        </div>

        <p className="text-center text-white/15 text-xs mt-6">
          SuperPlatform GH — Restricted Access
        </p>
      </div>
    </div>
  );
}
