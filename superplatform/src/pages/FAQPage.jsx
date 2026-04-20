import React, { useState } from 'react';
import { ChevronDown, Search, MessageCircle } from 'lucide-react';

const FAQS = [
    {
        cat: 'General', items: [
            { q: 'What is SuperPlatform?', a: 'SuperPlatform is Ghana\'s all-in-one digital marketplace. You can book rides, shop online, consult doctors, hire home services, find beauty professionals, browse real estate, and more — all from one app.' },
            { q: 'Is SuperPlatform free to use?', a: 'Yes. Creating an account and browsing is completely free. You only pay when you make a purchase or book a service.' },
            { q: 'Which areas do you serve?', a: 'We currently serve Greater Accra, Kumasi, and Tema. We\'re expanding to all major Ghanaian cities in 2024.' },
        ]
    },
    {
        cat: 'Payments', items: [
            { q: 'What payment methods do you accept?', a: 'We accept MTN MoMo, Vodafone Cash, AirtelTigo Money, Visa, and Mastercard. You can also pay from your SuperPlatform Wallet.' },
            { q: 'Is my payment information secure?', a: 'Absolutely. All payments are processed through Paystack, a PCI-DSS certified payment processor. We never store your card details on our servers.' },
            { q: 'How do refunds work?', a: 'Refunds are processed within 3–5 business days back to your original payment method. Contact support if your refund hasn\'t arrived.' },
        ]
    },
    {
        cat: 'Bookings & Orders', items: [
            { q: 'How do I cancel a booking?', a: 'Go to Dashboard → Bookings → select the booking → Cancel. Free cancellation is available up to 2 hours before the scheduled time.' },
            { q: 'How do I track my order?', a: 'Go to Dashboard → Orders → select the order. You\'ll see real-time status updates and estimated delivery time.' },
            { q: 'What if I\'m not satisfied with a service?', a: 'Contact us within 48 hours. We offer a satisfaction guarantee — if the service didn\'t meet expectations, we\'ll arrange a redo or refund.' },
        ]
    },
    {
        cat: 'For Providers', items: [
            { q: 'How do I become a provider?', a: 'Register → select "Provider" → complete onboarding (business info, category, ID verification) → submit for admin review. Approval takes 24–48 hours.' },
            { q: 'What commission does SuperPlatform charge?', a: 'We charge a 15% commission on each completed transaction. This covers platform maintenance, payment processing, and customer support.' },
            { q: 'When do I receive payouts?', a: 'Payouts are processed bi-weekly to your registered MoMo number. You can also request a manual payout at any time from your Provider Dashboard.' },
        ]
    },
];

function FAQItem({ q, a }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="card overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-all">
                <p className="flex-1 font-medium text-[var(--text)] text-sm">{q}</p>
                <ChevronDown size={16} className={`text-[var(--text)]/30 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="px-5 pb-4" style={{ animation: 'fadeUp .3s ease' }}>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">{a}</p>
                </div>
            )}
        </div>
    );
}

export default function FAQPage() {
    const [search, setSearch] = useState('');
    const [activeCat, setActiveCat] = useState('All');

    const filtered = FAQS.map(cat => ({
        ...cat,
        items: cat.items.filter(f =>
            f.q.toLowerCase().includes(search.toLowerCase()) ||
            f.a.toLowerCase().includes(search.toLowerCase())
        ),
    })).filter(cat => activeCat === 'All' || cat.cat === activeCat)
        .filter(cat => cat.items.length > 0);

    return (
        <div className="min-h-screen bg-[var(--bg)] pt-16">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <div className="text-center mb-10">
                    <span className="badge bg-brand-500/15 text-brand-400 mb-4 inline-flex">Help</span>
                    <h1 className="heading-lg mb-3">Frequently Asked Questions</h1>
                    <p className="text-[var(--text-muted)] text-sm">Find answers to common questions about SuperPlatform.</p>
                </div>

                {/* Search */}
                <div className="relative max-w-md mx-auto mb-8">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/30" size={16} />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        className="input pl-10" placeholder="Search questions…" />
                </div>

                {/* Category filter */}
                <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide">
                    {['All', ...FAQS.map(c => c.cat)].map(c => (
                        <button key={c} onClick={() => setActiveCat(c)}
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCat === c ? 'bg-brand-500 text-[var(--text)]' : 'glass text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                            {c}
                        </button>
                    ))}
                </div>

                {/* Questions */}
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-[var(--text)]/30">
                        <p>No matching questions found.</p>
                        <p className="text-sm mt-1">Try a different search or contact support.</p>
                    </div>
                ) : (
                    filtered.map(cat => (
                        <div key={cat.cat} className="mb-8">
                            <h2 className="heading-sm mb-4">{cat.cat}</h2>
                            <div className="space-y-2">
                                {cat.items.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
                            </div>
                        </div>
                    ))
                )}

                {/* CTA */}
                <div className="card p-8 text-center mt-12 bg-gradient-to-br from-brand-600/15 to-dark-800">
                    <MessageCircle size={24} className="text-brand-400 mx-auto mb-3" />
                    <h3 className="heading-sm mb-2">Still need help?</h3>
                    <p className="text-sm text-[var(--text)]/40 mb-5">Our support team is available 24/7 via chat or email.</p>
                    <button onClick={() => window.location.href = 'mailto:support@superplatform.app'} className="btn btn-primary gap-2">
                        <MessageCircle size={14} /> Contact Support
                    </button>
                </div>
            </div>
        </div>
    );
}
