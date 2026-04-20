import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const { signIn, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const res = await signIn({ email, password });
    if (res.success) {
      if (res.role === 'admin') {
        navigate('/empire', { replace: true });
      } else {
        // Not an admin — sign them out and show error
        await useAuthStore.getState().signOut();
        setError('Access denied. This portal is restricted.');
      }
    } else if (res.needsVerification) {
      setError('Please verify your email before signing in.');
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm" style={{ animation: 'fadeUp .5s ease' }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-500/30 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-500/20 shadow-lg shadow-brand-500/10">
            <Shield size={28} className="text-brand-400" />
          </div>
          <h1 className="font-display font-black text-2xl text-white mb-1">
            Command Center
          </h1>
          <p className="text-white/30 text-sm">Authorized personnel only</p>
        </div>

        {/* Form */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 mb-5 text-sm text-red-400 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={15} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-all"
                  placeholder="admin@superplatform.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={15} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-all"
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Access Dashboard <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/15 text-xs mt-6">
          SuperPlatform GH — Restricted Access
        </p>
      </div>
    </div>
  );
}
