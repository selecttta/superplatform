import React from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, APP_NAME } from '../../lib/constants';

const LINK_MAP = {
  'About Us': '/about',
  'Careers': '/about',
  'Blog': '/about',
  'Press': '/about',
  'Investors': '/about',
  'Help Center': '/faq',
  'Safety Centre': '/faq',
  'Report an Issue': '/faq',
  'Contact Us': '/faq',
  'Terms of Service': '/terms',
  'Privacy Policy': '/privacy',
  'Cookie Policy': '/privacy',
  'Refund Policy': '/terms',
};

const LINKS = {
  Company: ['About Us', 'Careers', 'Blog', 'Press', 'Investors'],
  Support: ['Help Center', 'Safety Centre', 'Report an Issue', 'Contact Us'],
  Legal: ['Terms of Service', 'Privacy Policy', 'Cookie Policy', 'Refund Policy'],
};

export default function Footer() {
  return (
    <footer className="bg-[var(--bg-card)] border-t border-[var(--border)] pt-2 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 sm:gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center font-black text-[var(--text)]">S</div>
              <span className="font-display font-bold text-lg"><span className="gradient-text">Super</span><span className="text-[var(--text)]">Platform</span></span>
            </div>
            <p className="text-sm text-[var(--text)]/50 leading-relaxed mb-6 max-w-xs">
              Ghana's all-in-one super app. Transport, shopping, healthcare, beauty, real estate and more — built for Ghanaians.
            </p>
            {/* Social */}
            <div className="flex gap-2">
              {[
                { label: 'Facebook', icon: 'f' },
                { label: 'Twitter/X', icon: '𝕏' },
                { label: 'Instagram', icon: '◉' },
                { label: 'WhatsApp', icon: 'w' },
              ].map(s => (
                <button key={s.label} title={s.label} className="w-9 h-9 bg-[var(--bg-input)] rounded-xl flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all">
                  {s.icon}
                </button>
              ))}
            </div>
            {/* Payment logos */}
            <div className="mt-6">
              <p className="text-xs text-[var(--text)]/40 mb-2 uppercase tracking-wide">We accept</p>
              <div className="flex flex-wrap gap-2">
                {['MTN MoMo', 'Vodafone Cash', 'AirtelTigo', 'Visa', 'Mastercard'].map(p => (
                  <span key={p} className="px-2 py-1 bg-[var(--bg-input)] rounded-lg text-xs text-[var(--text)]/50">{p}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-4">Categories</h4>
            <ul className="space-y-2.5">
              {CATEGORIES.map(cat => (
                <li key={cat.id}>
                  <Link to={cat.path} className="text-sm text-[var(--text-muted)] hover:text-brand-500 transition-colors flex items-center gap-2">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-4">Company</h4>
            <ul className="space-y-2.5">
              {LINKS.Company.map(l => (
                <li key={l}><Link to={LINK_MAP[l] || '/'} className="text-sm text-[var(--text-muted)] hover:text-brand-500 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-4">Support</h4>
            <ul className="space-y-2.5 mb-6">
              {LINKS.Support.map(l => (
                <li key={l}><Link to={LINK_MAP[l] || '/faq'} className="text-sm text-[var(--text-muted)] hover:text-brand-500 transition-colors">{l}</Link></li>
              ))}
            </ul>
            <h4 className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {LINKS.Legal.map(l => (
                <li key={l}><Link to={LINK_MAP[l] || '/terms'} className="text-sm text-[var(--text-muted)] hover:text-brand-500 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Download app banner */}
        <div className="bg-[var(--bg-input)] rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border border-[var(--border)]">
          <div>
            <p className="font-semibold text-[var(--text)] text-sm">Get the mobile app</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Available on iOS & Android via Expo Go</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary btn-sm text-xs">📱 App Store</button>
            <button className="btn-secondary btn-sm text-xs">🤖 Google Play</button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--text)]/30">© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p className="text-xs text-[var(--text)]/30">Made with ❤️ in Ghana 🇬🇭</p>
        </div>
      </div>
    </footer>
  );
}
