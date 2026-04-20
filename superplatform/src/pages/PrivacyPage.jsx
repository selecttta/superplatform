import React from 'react';
import { APP_NAME } from '../lib/constants';

const sections = [
    { title: '1. Information We Collect', body: `When you use ${APP_NAME}, we collect information you provide directly — such as your name, email, phone number, and payment details. We also collect usage data automatically (device type, IP address, pages visited) to improve the platform.` },
    { title: '2. How We Use Your Information', body: 'We use collected data to: operate and improve the platform, process transactions, communicate with you about orders/bookings, provide customer support, enforce our terms, and comply with legal obligations.' },
    { title: '3. Information Sharing', body: 'We do not sell your personal data. We share information only with: service providers who help operate the platform (e.g. Paystack for payments), providers you choose to book with, and law enforcement when legally required.' },
    { title: '4. Data Security', body: 'We implement industry-standard measures including encryption (TLS), secure password hashing, Row Level Security on our database, and regular security audits. However, no method of transmission over the Internet is 100% secure.' },
    { title: '5. Your Rights', body: 'You can access, update, or delete your personal information at any time through your Profile settings, or by contacting privacy@superplatform.app. You may also request a copy of all data we hold about you.' },
    { title: '6. Cookies', body: 'We use essential cookies to maintain your session and preferences. We do not use third-party tracking cookies. You can disable cookies in your browser settings, but some features may not function properly.' },
    { title: '7. Children\'s Privacy', body: 'SuperPlatform is not intended for users under 18 years of age. We do not knowingly collect personal data from children.' },
    { title: '8. Changes to This Policy', body: 'We may update this Privacy Policy from time to time. We will notify you of any material changes via email or in-app notification. Continued use after changes constitutes acceptance.' },
    { title: '9. Contact Us', body: 'For privacy-related questions, contact us at privacy@superplatform.app or write to: SuperPlatform GH, East Legon, Accra, Ghana.' },
];

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[var(--bg)] pt-16">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <span className="badge bg-brand-500/15 text-brand-400 mb-4 inline-flex">Legal</span>
                <h1 className="heading-lg mb-2">Privacy Policy</h1>
                <p className="text-[var(--text)]/40 text-sm mb-10">Last updated: January 2024</p>

                <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-10">
                    At {APP_NAME}, we take your privacy seriously. This policy explains what data we collect,
                    how we use it, and your rights regarding your personal information.
                </p>

                <div className="space-y-8">
                    {sections.map((s, i) => (
                        <div key={i}>
                            <h2 className="font-semibold text-[var(--text)] mb-2">{s.title}</h2>
                            <p className="text-sm text-[var(--text-muted)] leading-relaxed">{s.body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
