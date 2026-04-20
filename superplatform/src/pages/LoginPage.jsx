import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [resent, setResent] = useState(false);
  const { signIn, resetPassword, resendVerification, loading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await signIn({ email, password });
    if (res?.needsVerification) {
      setPendingEmail(res.email || email);
      setUnverified(true);
      return;
    }
    if (res.success) {
      const dest = res.role === 'admin' ? '/empire' : res.role === 'provider' ? '/provider' : from || '/dashboard';
      navigate(dest, { replace: true });
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    const ok = await resetPassword(email);
    if (ok) setTab('login');
  };

  const handleResend = async () => {
    const ok = await resendVerification(pendingEmail);
    if (ok) setResent(true);
  };

  // ── Unverified email banner ───────────────────────────────────────────────
  if (unverified) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-yellow-500/15 rounded-full flex items-center justify-center mx-auto mb-5">
              <Mail size={28} className="text-yellow-400" />
            </div>
            <h2 className="heading-md mb-2">Verify Your Email</h2>
            <p className="text-muted text-sm mb-2 leading-relaxed">
              Your email address <strong className="text-[var(--text)]">{pendingEmail}</strong> has not been verified yet.
            </p>
            <p className="text-muted text-sm mb-8 leading-relaxed">
              Please check your inbox for a verification link. If you didn't receive it, you can request a new one below.
            </p>

            {resent ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 mb-6">
                <CheckCircle size={18} />
                <span className="text-sm font-medium">Verification email sent! Check your inbox.</span>
              </div>
            ) : (
              <button
                onClick={handleResend}
                disabled={loading}
                className="btn btn-primary w-full mb-4 gap-2"
              >
                {loading
                  ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</span>
                  : <><RefreshCw size={15} /> Resend Verification Email</>
                }
              </button>
            )}

            <button
              onClick={() => { setUnverified(false); setResent(false); }}
              className="text-sm text-[var(--text)]/40 hover:text-[var(--text)] transition-colors"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Left visual */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=80" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-900 via-dark-900/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-16">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center font-black text-[var(--text)]">S</div>
            <span className="font-display font-bold text-2xl text-[var(--text)]">SuperPlatform GH</span>
          </Link>
          <h2 className="font-display font-black text-5xl text-[var(--text)] mb-4 leading-tight">
            Everything you need,<br /><span className="gradient-text">in one platform.</span>
          </h2>
          <p className="text-[var(--text-muted)] max-w-sm text-lg">Transport, shopping, healthcare, beauty, real estate — all built for Ghana.</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 lg:max-w-md flex flex-col justify-center px-6 sm:px-10 py-16">
        <Link to="/" className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center font-black text-[var(--text)] text-sm">S</div>
          <span className="font-display font-bold text-lg"><span className="gradient-text">Super</span><span className="text-[var(--text)]">Platform</span></span>
        </Link>

        <div className="max-w-sm w-full mx-auto lg:ml-0">
          {tab === 'login' ? (
            <>
              <h1 className="heading-lg mb-1">Welcome back</h1>
              <p className="text-muted mb-8">Sign in to your account</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={15} />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="input pl-10" placeholder="you@example.com" required />
                  </div>
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={15} />
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      className="input pl-10 pr-10" placeholder="Your password" required />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text)]/30 hover:text-[var(--text-muted)] transition-colors">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div className="flex justify-end mt-1.5">
                    <button type="button" onClick={() => setTab('forgot')} className="text-xs text-brand-400 hover:text-brand-300">Forgot password?</button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full btn-lg mt-2">
                  {loading
                    ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</span>
                    : <span className="flex items-center gap-2">Sign In <ArrowRight size={16} /></span>}
                </button>
              </form>

              <p className="text-center text-sm text-muted mt-6">
                No account? <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">Create one free →</Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="heading-lg mb-1">Reset Password</h1>
              <p className="text-muted mb-8">Enter your email to receive a reset link.</p>
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={15} />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="input pl-10" placeholder="you@example.com" required />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <button type="button" onClick={() => setTab('login')} className="w-full text-center text-sm text-muted hover:text-[var(--text)] transition-colors">
                  ← Back to Login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
