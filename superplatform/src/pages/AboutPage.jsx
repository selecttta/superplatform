import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Globe, Shield, Heart, Award, MapPin, ArrowRight } from 'lucide-react';

const TEAM = [
    { name: 'Kwame Amponsah', role: 'CEO & Founder', emoji: '👨‍💼' },
    { name: 'Ama Asantewaa', role: 'CTO', emoji: '👩‍💻' },
    { name: 'Kofi Mensah', role: 'Head of Product', emoji: '👨‍🎨' },
    { name: 'Abena Osei', role: 'Head of Marketing', emoji: '👩‍🎤' },
];

const STATS = [
    { value: '8,400+', label: 'Active Users' },
    { value: '340+', label: 'Verified Providers' },
    { value: '50K+', label: 'Transactions' },
    { value: '7', label: 'Service Categories' },
];

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[var(--bg)] pt-16">
            {/* Hero */}
            <section className="relative py-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-brand-500/10 to-transparent pointer-events-none" />
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <span className="badge bg-brand-500/15 text-brand-400 mb-4 inline-flex">🇬🇭 Made in Ghana</span>
                    <h1 className="font-display font-black text-4xl md:text-5xl text-[var(--text)] leading-tight mb-5">
                        Building Africa's <span className="gradient-text">Super App</span>
                    </h1>
                    <p className="text-[var(--text-muted)] text-lg leading-relaxed max-w-2xl mx-auto">
                        SuperPlatform connects Ghanaians with verified professionals, quality products, and essential services —
                        all in one beautiful app. Transport. Shopping. Healthcare. Beauty. Real Estate. And more.
                    </p>
                </div>
            </section>

            {/* Stats */}
            <section className="max-w-5xl mx-auto px-6 pb-16">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {STATS.map((s, i) => (
                        <div key={i} className="card p-6 text-center">
                            <p className="font-display text-3xl font-black text-brand-400">{s.value}</p>
                            <p className="text-sm text-[var(--text)]/40 mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Mission & Values */}
            <section className="max-w-5xl mx-auto px-6 pb-16">
                <h2 className="heading-lg text-center mb-10">Our Values</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                        { icon: <Globe size={24} className="text-brand-400" />, title: 'Local First', desc: 'Built by Ghanaians, for Ghanaians. Every feature is designed for the local market.' },
                        { icon: <Shield size={24} className="text-emerald-400" />, title: 'Trust & Safety', desc: 'Every provider is ID-verified and background checked before going live.' },
                        { icon: <Heart size={24} className="text-red-400" />, title: 'Community', desc: 'We put our users and providers at the heart of everything we build.' },
                        { icon: <Award size={24} className="text-yellow-400" />, title: 'Excellence', desc: 'We obsess over quality — from product design to customer support.' },
                    ].map((v, i) => (
                        <div key={i} className="card p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 glass rounded-2xl flex items-center justify-center">{v.icon}</div>
                            <h3 className="font-semibold text-[var(--text)] mb-2">{v.title}</h3>
                            <p className="text-xs text-[var(--text)]/40 leading-relaxed">{v.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Team */}
            <section className="max-w-5xl mx-auto px-6 pb-16">
                <h2 className="heading-lg text-center mb-10">Meet the Team</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {TEAM.map((t, i) => (
                        <div key={i} className="card p-6 text-center hover:-translate-y-0.5 transition-all">
                            <div className="text-4xl mb-3">{t.emoji}</div>
                            <p className="font-semibold text-[var(--text)] text-sm">{t.name}</p>
                            <p className="text-xs text-[var(--text)]/40 mt-0.5">{t.role}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="max-w-4xl mx-auto px-6 pb-20">
                <div className="card p-10 text-center bg-gradient-to-br from-brand-600/20 to-dark-800">
                    <MapPin size={28} className="text-brand-400 mx-auto mb-4" />
                    <h2 className="heading-md mb-3">Based in Accra, serving all of Ghana</h2>
                    <p className="text-[var(--text-muted)] text-sm mb-6">Ready to experience the future of digital services?</p>
                    <Link to="/register" className="btn btn-primary btn-lg gap-2 inline-flex">
                        Join SuperPlatform <ArrowRight size={16} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
