import React from 'react';
import { APP_NAME } from '../lib/constants';

const sections = [
    { title: '1. Acceptance of Terms', body: `By accessing or using ${APP_NAME}, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.` },
    { title: '2. User Accounts', body: 'You must be at least 18 years old to create an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. Notify us immediately of any unauthorized use.' },
    { title: '3. Provider Obligations', body: 'Providers must submit accurate business information and ID documents for verification. Listings must accurately describe the service/product offered. Misleading or fraudulent listings will result in account suspension.' },
    { title: '4. Customer Obligations', body: 'Customers agree to provide accurate information when making bookings and orders. Cancellations are subject to the provider\'s cancellation policy. Chargebacks or payment disputes without legitimate cause may result in account restrictions.' },
    { title: '5. Payments', body: `All payments are processed securely through our payment partners (Paystack, MTN MoMo, Vodafone Cash). ${APP_NAME} charges a platform commission of up to 15% on each transaction. Providers receive payouts on a regular schedule.` },
    { title: '6. Reviews & Ratings', body: 'Users may leave honest reviews for services/products they have used. Reviews must be truthful and not defamatory. We reserve the right to remove reviews that violate our community guidelines.' },
    { title: '7. Intellectual Property', body: `All content, branding, and technology on ${APP_NAME} are owned by us or our licensors. You may not copy, modify, or distribute any part of the platform without written permission.` },
    { title: '8. Prohibited Conduct', body: 'You may not: use the platform for illegal activities, harass other users, post false or misleading content, attempt to hack or compromise platform security, create multiple accounts, or scrape data from the platform.' },
    { title: '9. Limitation of Liability', body: `${APP_NAME} acts as a marketplace connecting customers with providers. We are not responsible for the quality of services/products provided by third-party providers. Disputes should be resolved between the parties involved, with our mediation support available.` },
    { title: '10. Termination', body: 'We may suspend or terminate your account at any time for violation of these terms. You may delete your account at any time through your Profile settings.' },
    { title: '11. Governing Law', body: 'These terms are governed by the laws of the Republic of Ghana. Any disputes shall be resolved in the courts of Accra, Ghana.' },
    { title: '12. Contact', body: 'For questions about these Terms, contact legal@superplatform.app.' },
];

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[var(--bg)] pt-16">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <span className="badge bg-brand-500/15 text-brand-400 mb-4 inline-flex">Legal</span>
                <h1 className="heading-lg mb-2">Terms of Service</h1>
                <p className="text-[var(--text)]/40 text-sm mb-10">Last updated: January 2024</p>

                <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-10">
                    Please read these Terms of Service carefully before using {APP_NAME}.
                    By using our platform, you agree to comply with and be bound by the following terms.
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
