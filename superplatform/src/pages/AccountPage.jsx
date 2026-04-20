import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    MessageCircle, Package, Star, CreditCard, MapPin,
    HeadphonesIcon, Settings, Lock, ChevronRight, Zap, User, LogOut
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { initials } from '../utils/helpers';

const ACCOUNT_ITEMS = [
    { icon: <MessageCircle size={18} />, label: 'Messages', path: '/chat', color: 'text-brand-400' },
    { icon: <Package size={18} />, label: 'Your Orders', path: '/dashboard?tab=orders', color: 'text-blue-400' },
    { icon: <Star size={18} />, label: 'Your Reviews', path: '/dashboard?tab=bookings', color: 'text-yellow-400' },
    { icon: <CreditCard size={18} />, label: 'Credit Balance', path: '/dashboard?tab=wallet', color: 'text-emerald-400' },
    { icon: <MapPin size={18} />, label: 'Address', path: '/profile', color: 'text-pink-400' },
    { icon: <Settings size={18} />, label: 'Settings', path: '/profile', color: 'text-[var(--text-muted)]' },
];

export default function AccountPage() {
    const { user, profile, role, signOut } = useAuthStore();
    const navigate = useNavigate();

    const dashPath = role === 'admin' ? '/empire' : role === 'provider' ? '/provider' : '/dashboard';

    if (!user) {
        // Guest: show upsell
        return (
            <div className="min-h-screen bg-[var(--bg)] pt-16">
                <div className="max-w-lg mx-auto px-4 py-10">

                    {/* Guest hero */}
                    <div className="text-center mb-8" style={{ animation: 'fadeUp .4s ease' }}>
                        <div className="w-20 h-20 bg-gradient-to-br from-brand-500/30 to-brand-700/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-500/20">
                            <User size={36} className="text-brand-400" />
                        </div>
                        <h1 className="font-display font-black text-2xl text-[var(--text)] mb-2">
                            Get the Full Experience
                        </h1>
                        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                            Sign in to manage your orders, chat with providers, track bookings and access exclusive deals.
                        </p>
                    </div>

                    {/* CTA buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        <Link to="/login"
                            className="btn btn-primary btn-lg text-center flex items-center justify-center gap-2">
                            <Zap size={16} /> Sign In
                        </Link>
                        <Link to="/register"
                            className="btn btn-secondary btn-lg text-center">
                            Join Free
                        </Link>
                    </div>

                    {/* Locked items list */}
                    <div className="card overflow-hidden">
                        <div className="px-4 py-3 border-b border-[var(--border)]">
                            <p className="text-xs text-[var(--text)]/40 uppercase tracking-wide font-semibold">What you get with an account</p>
                        </div>
                        {ACCOUNT_ITEMS.map((item, i) => (
                            <Link
                                key={i}
                                to="/login"
                                className="flex items-center gap-4 px-4 py-4 border-b border-[var(--border)] last:border-0 hover:bg-white/3 transition-colors group"
                            >
                                <div className={`shrink-0 ${item.color} opacity-60`}>{item.icon}</div>
                                <span className="flex-1 text-sm text-[var(--text-muted)] font-medium">{item.label}</span>
                                <Lock size={13} className="text-[var(--text)]/20 shrink-0" />
                            </Link>
                        ))}
                    </div>

                    {/* Support */}
                    <div className="mt-4 card p-4 flex items-center gap-3 hover:border-white/12 transition-colors cursor-pointer"
                        onClick={() => navigate('/login')}>
                        <HeadphonesIcon size={18} className="text-brand-400 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-[var(--text)]">Customer Support</p>
                            <p className="text-xs text-[var(--text)]/40">Get help with your orders or bookings</p>
                        </div>
                        <ChevronRight size={16} className="text-[var(--text)]/20 ml-auto shrink-0" />
                    </div>
                </div>
            </div>
        );
    }

    // Logged in
    return (
        <div className="min-h-screen bg-[var(--bg)] pt-16">
            <div className="max-w-lg mx-auto px-4 py-8">

                {/* Profile header */}
                <div className="card p-5 mb-6 flex items-center gap-4" style={{ animation: 'fadeUp .4s ease' }}>
                    <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center font-bold text-[var(--text)] text-xl shrink-0">
                        {initials(profile?.full_name || 'U')}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--text)] truncate">{profile?.full_name || 'Account'}</p>
                        <p className="text-xs text-[var(--text)]/40 truncate">{profile?.email}</p>
                        <span className="badge badge-orange mt-1.5 capitalize text-[10px]">{role}</span>
                    </div>
                    <Link to={dashPath} className="btn btn-ghost btn-sm gap-1.5 text-xs shrink-0">
                        Dashboard →
                    </Link>
                </div>

                {/* Account menu */}
                <div className="card overflow-hidden mb-4" style={{ animation: 'fadeUp .4s ease .05s both' }}>
                    {ACCOUNT_ITEMS.map((item, i) => (
                        <Link
                            key={i}
                            to={item.path}
                            className="flex items-center gap-4 px-4 py-4 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-input)] transition-colors group"
                        >
                            <div className={`shrink-0 ${item.color}`}>{item.icon}</div>
                            <span className="flex-1 text-sm text-[var(--text)] font-medium">{item.label}</span>
                            <ChevronRight size={15} className="text-[var(--text)]/20 group-hover:text-[var(--text-muted)] transition-colors shrink-0" />
                        </Link>
                    ))}
                    <Link
                        to="/profile"
                        className="flex items-center gap-4 px-4 py-4 border-b border-[var(--border)] hover:bg-[var(--bg-input)] transition-colors group"
                    >
                        <HeadphonesIcon size={18} className="text-purple-400 shrink-0" />
                        <span className="flex-1 text-sm text-[var(--text)] font-medium">Customer Support</span>
                        <ChevronRight size={15} className="text-[var(--text)]/20 group-hover:text-[var(--text-muted)] transition-colors shrink-0" />
                    </Link>
                </div>

                {/* Sign out */}
                <button
                    onClick={() => { signOut(); navigate('/'); }}
                    className="w-full card p-4 flex items-center gap-3 hover:border-red-500/25 hover:bg-red-500/5 transition-all group"
                    style={{ animation: 'fadeUp .4s ease .1s both' }}
                >
                    <LogOut size={18} className="text-red-400 shrink-0" />
                    <span className="text-sm font-medium text-red-400">Sign Out</span>
                </button>
            </div>
        </div>
    );
}
