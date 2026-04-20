import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingCart, Menu, X, ChevronDown, Bell, User, Settings, LogOut,
  Wallet, LayoutDashboard, Heart, Search, MessageCircle, ChevronRight, Sun, Moon
} from 'lucide-react';
import { useWebTheme } from '../../App';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useFavStore } from '../../store/favStore';
import { useNotifications } from '../../hooks/useNotifications';
import { CATEGORIES, APP_NAME } from '../../lib/constants';
import { initials, fmtDate } from '../../utils/helpers';

// Notifications are now fetched from Supabase via useNotifications hook

const SEARCH_ITEMS = [
  ...(CATEGORIES || []).map(c => ({ label: c.name, type: 'Category', path: c.path, icon: c.icon })),
  { label: 'Shop Products', type: 'Page', path: '/ecommerce', icon: '🛍️' },
  { label: 'Find Doctors', type: 'Page', path: '/health', icon: '🏥' },
  { label: 'Home Services', type: 'Page', path: '/home-services', icon: '🔧' },
  { label: 'Beauty & Fashion', type: 'Page', path: '/beauty', icon: '💄' },
  { label: 'Book a Ride', type: 'Page', path: '/transport', icon: '🚗' },
  { label: 'Real Estate', type: 'Page', path: '/real-estate', icon: '🏠' },
  { label: 'Rentals', type: 'Page', path: '/rentals', icon: '🔑' },
];

const NAV_LINKS = [
  { label: 'Shop', to: '/ecommerce' },
  { label: 'Rides', to: '/transport' },
  { label: 'Property', to: '/real-estate' },
];

// Map category id to providers/services list
function getCategoryProviders(catId) {
  const map = {
    transport: [
      { name: 'Book a Ride', sub: 'GPS-tracked instant rides', path: '/transport' },
      { name: 'Deliveries', sub: 'Same-day parcel delivery', path: '/transport' },
      { name: 'Airport Transfers', sub: 'Professional drivers', path: '/transport' },
    ],
    'home-services': [
      { name: 'Plumbing', sub: 'Leaks, pipes & installation', path: '/home-services' },
      { name: 'Electrical', sub: 'Wiring, sockets & lighting', path: '/home-services' },
      { name: 'Cleaning', sub: 'Deep cleaning service', path: '/home-services' },
    ],
    beauty: [
      { name: 'Salons', sub: 'Hair, nails & makeup', path: '/beauty' },
      { name: 'Fashion Shop', sub: 'Trending styles & designers', path: '/beauty' },
      { name: 'Skincare', sub: 'Premium beauty products', path: '/beauty' },
    ],
    health: [
      { name: 'Find Doctors', sub: 'Verified medical professionals', path: '/health' },
      { name: 'Lab Tests', sub: 'Book tests, get results fast', path: '/health' },
      { name: 'Pharmacy', sub: 'Order medicines online', path: '/health' },
    ],
    ecommerce: [
      { name: 'Shop Products', sub: 'New & used items', path: '/ecommerce' },
      { name: 'Sell an Item', sub: 'List your product', path: '/sell' },
      { name: 'Flash Deals', sub: 'Daily discounts', path: '/ecommerce' },
    ],
    'real-estate': [
      { name: 'Buy Property', sub: 'Houses, apartments, land', path: '/real-estate' },
      { name: 'Rent Property', sub: 'Short & long-term rentals', path: '/real-estate' },
      { name: 'Commercial', sub: 'Offices & retail spaces', path: '/real-estate' },
    ],
    rentals: [
      { name: 'Car Rentals', sub: 'Self-drive & chauffeur', path: '/rentals' },
      { name: 'Event Spaces', sub: 'Halls & venues', path: '/rentals' },
      { name: 'Equipment', sub: 'Generators, tents, PA', path: '/rentals' },
    ],
  };
  return map[catId] || [];
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileCatSelected, setMobileCatSelected] = useState(CATEGORIES[0]?.id || '');

  const catRef = useRef(null);
  const userRef = useRef(null);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const notifRef = useRef(null);
  const notifTimer = useRef(null);
  const { user, profile, role, signOut } = useAuthStore();
  const cartCount = useCartStore(s => s.count());
  const favCount = useFavStore(s => s.count());
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useWebTheme();
  const { notifications: notifs, unreadCount, markRead } = useNotifications();

  useEffect(() => {
    setMobileOpen(false); setCatOpen(false); setUserOpen(false);
    setSearchOpen(false); setSearchQuery(''); setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) { setSearchOpen(false); setSearchQuery(''); }
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const dashPath = role === 'admin' ? '/empire' : role === 'provider' ? '/provider' : '/dashboard';

  const suggestions = searchQuery.trim().length >= 2
    ? SEARCH_ITEMS.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 7)
    : [];

  const handleSuggestionClick = (item) => {
    navigate(item.path);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (suggestions.length > 0) navigate(suggestions[0].path);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Mark a single notification as read and navigate
  const handleNotifClick = (notif) => {
    markRead(notif.id);
    const notifPath = role === 'admin' ? '/empire' : role === 'provider' ? '/provider' : '/dashboard';
    navigate(`${notifPath}?tab=notifications`);
    setNotifOpen(false);
  };

  const navCls = `fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? (isDark ? 'bg-[var(--bg)]/95 backdrop-blur-2xl border-b border-[var(--border)] shadow-2xl shadow-black/40' : 'bg-white/95 backdrop-blur-2xl border-b border-black/5 shadow-xl shadow-black/10') : 'bg-transparent'
    }`;

  const mobileCatProviders = getCategoryProviders(mobileCatSelected);

  return (
    <>
      <nav className={navCls}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center gap-2 sm:gap-3">

          {/* ── Logo ──────────────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center font-black text-[var(--text)] text-sm shadow-lg shadow-brand-500/30">S</div>
            <span className="font-display font-bold text-lg hidden sm:block">
              <span className="gradient-text">Super</span><span className="text-[var(--text)]">Platform</span>
            </span>
          </Link>

          {/* ── LEFT NAV: Categories + quick links (desktop) ── */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            {/* Categories dropdown */}
            <div className="relative" ref={catRef}>
              <button onClick={() => setCatOpen(v => !v)}
                className="btn-ghost text-sm flex items-center gap-1.5 rounded-xl">
                Categories
                <ChevronDown size={13} className={`transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`} />
              </button>
              {catOpen && (
                <div className="absolute left-0 top-full mt-2 w-80 card shadow-2xl shadow-black/50 overflow-hidden" style={{ animation: 'fadeUp .2s ease' }}>
                  <div className="p-2 grid grid-cols-2 gap-1">
                    {CATEGORIES.map(cat => (
                      <Link key={cat.id} to={cat.path} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-input)] transition-colors group">
                        <p className="text-sm font-medium text-[var(--text)] group-hover:text-brand-400 transition-colors">{cat.name}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {NAV_LINKS.map(l => (
              <Link key={l.to} to={l.to} className="btn-ghost text-sm rounded-xl">{l.label}</Link>
            ))}
          </div>

          {/* ── Spacer ────────────────────────────────────────────── */}
          <div className="flex-1" />

          {/* ── MOBILE: Full-width search bar ─────────────────────── */}
          <div className="flex md:hidden flex-1 items-center min-w-0 mx-1">
            <div className="relative w-full" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text)]/30 pointer-events-none" size={14} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="input pl-9 text-xs w-full h-9 rounded-full border-[var(--border)] bg-[var(--bg-card)]/90"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text)]/40">
                  <X size={12} />
                </button>
              )}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 card shadow-2xl shadow-black/50 overflow-hidden z-50" style={{ animation: 'fadeUp .15s ease' }}>
                  {suggestions.map((item, i) => (
                    <button key={i} onClick={() => { navigate(item.path); setSearchQuery(''); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-input)] transition-colors text-left">
                      <span className="text-base shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text)] truncate">{item.label}</p>
                      </div>
                      <span className="text-xs text-[var(--text)]/30 shrink-0">{item.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Desktop Icons ─────────────────────────────── */}
          {/* Desktop Search */}
          <div className="relative hidden md:block" ref={searchRef}>
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text)]/30" size={14} />
                  <input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); }}
                    placeholder="Search services, products…"
                    className="input pl-9 pr-8 py-2 text-sm h-9 rounded-full border-[var(--border)] bg-[var(--bg-card)]/90 w-56 focus:w-72 transition-all duration-200"
                  />
                  <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text)]/40 hover:text-[var(--text)]">
                    <X size={12} />
                  </button>
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute top-full right-0 left-0 mt-1 card shadow-2xl shadow-black/50 overflow-hidden z-50 min-w-[260px]" style={{ animation: 'fadeUp .15s ease' }}>
                    {suggestions.map((item, i) => (
                      <button key={i} onClick={() => handleSuggestionClick(item)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-input)] transition-colors text-left">
                        <span className="text-base shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--text)] truncate">{item.label}</p>
                        </div>
                        <span className="text-xs text-[var(--text)]/30 shrink-0">{item.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            ) : (
              <button onClick={openSearch} className="p-2 btn-ghost rounded-xl">
                <Search size={19} />
              </button>
            )}
          </div>

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="p-2 btn-ghost rounded-xl hidden md:flex" aria-label="Toggle theme">
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {/* Desktop Cart */}
          <Link to="/ecommerce" className="relative p-2 btn-ghost rounded-xl hidden md:flex">
            <ShoppingCart size={19} />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 rounded-full text-[10px] font-bold flex items-center justify-center text-[var(--text)]">{cartCount}</span>
            )}
          </Link>

          {/* Desktop Favorites */}
          <Link to="/favorites" className="relative p-2 btn-ghost rounded-xl hidden md:flex">
            <Heart size={19} className={favCount > 0 ? 'text-red-400 fill-red-400' : ''} />
            {favCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-[var(--text)]">{favCount}</span>
            )}
          </Link>

          {/* Notifications — desktop (logged in) */}
          {user && (
            <>
              {/* Desktop Chat */}
              <Link to="/chat" className="relative p-2 btn-ghost rounded-xl hidden md:flex">
                <MessageCircle size={19} />
              </Link>

              {/* Notifications */}
              <div
                className="relative hidden md:flex"
                ref={notifRef}
                onMouseEnter={() => { clearTimeout(notifTimer.current); setNotifOpen(true); }}
                onMouseLeave={() => { notifTimer.current = setTimeout(() => setNotifOpen(false), 200); }}
              >
                <button
                  onClick={() => setNotifOpen(v => !v)}
                  className="relative p-2 btn-ghost rounded-xl"
                  aria-label="Notifications"
                >
                  <Bell size={19} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 rounded-full text-[10px] font-bold flex items-center justify-center text-[var(--text)] leading-none">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-80 card shadow-2xl shadow-black/50 overflow-hidden z-50"
                    style={{ animation: 'fadeUp .2s ease' }}
                    onMouseEnter={() => clearTimeout(notifTimer.current)}
                    onMouseLeave={() => { notifTimer.current = setTimeout(() => setNotifOpen(false), 200); }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                      <p className="text-sm font-semibold text-[var(--text)]">Notifications</p>
                      {unreadCount > 0 && (
                        <span className="badge badge-orange text-[10px]">{unreadCount} new</span>
                      )}
                    </div>

                    {/* List */}
                    <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                      {notifs.map(n => (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-input)] transition-colors text-left ${n.is_read ? '' : 'bg-brand-500/5'}`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 transition-colors ${n.is_read ? 'bg-white/15' : 'bg-brand-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${n.is_read ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'}`}>{n.title}</p>
                            <p className="text-xs text-[var(--text)]/40 mt-0.5 truncate">{n.body}</p>
                          </div>
                          <span className="text-[11px] text-[var(--text)]/25 shrink-0 whitespace-nowrap mt-0.5">{n.created_at ? fmtDate(n.created_at) : ''}</span>
                        </button>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-[var(--border)]">
                      <button
                        onClick={() => {
                          const notifPath = role === 'admin' ? '/empire' : role === 'provider' ? '/provider' : '/dashboard';
                          navigate(`${notifPath}?tab=notifications`);
                          setNotifOpen(false);
                        }}
                        className="w-full text-xs text-brand-400 hover:text-brand-300 transition-colors text-center py-1"
                      >
                        View all notifications →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop User menu */}
              <div className="relative hidden md:block" ref={userRef}>
                <button onClick={() => setUserOpen(v => !v)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[var(--bg-input)] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-[var(--text)] font-bold text-xs shrink-0">
                    {initials(profile?.full_name || profile?.email)}
                  </div>
                  <span className="hidden md:block text-sm text-[var(--text-muted)] max-w-[80px] truncate">{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                  <ChevronDown size={12} className="text-[var(--text)]/30 hidden md:block" />
                </button>
                {userOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 card shadow-2xl shadow-black/50 overflow-hidden" style={{ animation: 'fadeUp .2s ease' }}>
                    <div className="p-3 border-b border-[var(--border)]">
                      <p className="text-sm font-semibold text-[var(--text)] truncate">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-[var(--text)]/40 truncate">{profile?.email}</p>
                      <span className="badge badge-orange mt-1.5 capitalize">{role}</span>
                    </div>
                    <div className="p-1.5">
                      <Link to={dashPath} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--bg-input)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                        <LayoutDashboard size={14} /> Dashboard
                      </Link>
                      <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--bg-input)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                        <User size={14} /> Profile
                      </Link>
                      <Link to="/favorites" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--bg-input)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                        <Heart size={14} /> Favorites
                      </Link>
                      <Link to="/chat" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--bg-input)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                        <MessageCircle size={14} /> Messages
                      </Link>
                      <Link to="/profile?tab=payment" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--bg-input)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                        <Wallet size={14} /> Wallet
                      </Link>
                      <div className="divider" />
                      <button onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-500/10 text-sm text-red-400 transition-colors">
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Desktop: Not logged in */}
          {!user && (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" className="btn-ghost text-sm rounded-xl">Login</Link>
              <Link to="/register" className="btn-primary text-sm btn-sm">Join Free</Link>
            </div>
          )}

          {/* Mobile: Notification icon + Account icon (replaces hamburger for those) */}
          <div className="flex md:hidden items-center gap-0.5 shrink-0">
            {user && (
              <div
                className="relative"
                ref={notifRef}
              >
                <button
                  onClick={() => setNotifOpen(v => !v)}
                  className="relative p-2 btn-ghost rounded-xl"
                  aria-label="Notifications"
                >
                  <Bell size={19} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 rounded-full text-[10px] font-bold flex items-center justify-center text-[var(--text)] leading-none">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-72 card shadow-2xl shadow-black/50 overflow-hidden z-50"
                    style={{ animation: 'fadeUp .2s ease' }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                      <p className="text-sm font-semibold text-[var(--text)]">Notifications</p>
                      {unreadCount > 0 && <span className="badge badge-orange text-[10px]">{unreadCount} new</span>}
                    </div>
                    <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                      {notifs.map(n => (
                        <button key={n.id} onClick={() => handleNotifClick(n)}
                          className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-input)] text-left ${n.is_read ? '' : 'bg-brand-500/5'}`}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read ? 'bg-white/15' : 'bg-brand-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${n.is_read ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'}`}>{n.title}</p>
                            <p className="text-xs text-[var(--text)]/40 mt-0.5 line-clamp-2">{n.body}</p>
                          </div>
                          <span className="text-[10px] text-[var(--text)]/25 shrink-0 ml-1">{n.created_at ? fmtDate(n.created_at) : ''}</span>
                        </button>
                      ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-[var(--border)]">
                      <button onClick={() => {
                        const notifPath = role === 'admin' ? '/empire' : role === 'provider' ? '/provider' : '/dashboard';
                        navigate(`${notifPath}?tab=notifications`); setNotifOpen(false);
                      }} className="w-full text-xs text-brand-400 text-center py-1">View all →</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Account icon → /account page on mobile */}
            <button
              onClick={() => navigate('/account')}
              className="p-2 btn-ghost rounded-xl"
              aria-label="Account"
            >
              {user ? (
                <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-[var(--text)] font-bold text-xs">
                  {initials(profile?.full_name || profile?.email || 'U')}
                </div>
              ) : (
                <User size={19} />
              )}
            </button>

            {/* Hamburger — categories/menu */}
            <button onClick={() => setMobileOpen(v => !v)} className="p-2 btn-ghost rounded-xl">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ── Mobile menu — split pane categories ───────────────── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg)]/98 backdrop-blur-2xl" style={{ animation: 'fadeIn .2s ease' }}>
            {/* Split pane */}
            <div className="flex h-[60vh] overflow-hidden">
              {/* Left: Category list */}
              <div className="w-1/3 border-r border-[var(--border)] overflow-y-auto">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setMobileCatSelected(cat.id)}
                    className={`w-full flex flex-col items-center gap-1 p-3 transition-colors text-center ${mobileCatSelected === cat.id
                      ? 'bg-brand-500/15 border-r-2 border-brand-500'
                      : 'hover:bg-[var(--bg-input)]'
                      }`}
                  >
                    <span className={`text-[10px] font-medium leading-tight ${mobileCatSelected === cat.id ? 'text-brand-400' : 'text-[var(--text-muted)]'}`}>
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Right: Providers/services for selected category */}
              <div className="flex-1 overflow-y-auto p-2">
                {(() => {
                  const cat = CATEGORIES.find(c => c.id === mobileCatSelected);
                  return (
                    <>
                      {cat && (
                        <div className="px-2 pt-1 pb-2 mb-1 border-b border-[var(--border)]">
                          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{cat.name}</p>
                        </div>
                      )}
                      {mobileCatProviders.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text)]/20 text-xs">No providers yet</div>
                      ) : (
                        mobileCatProviders.map((prov, i) => (
                          <button
                            key={i}
                            onClick={() => { navigate(prov.path); setMobileOpen(false); }}
                            className="w-full flex items-center gap-2 p-2.5 rounded-xl hover:bg-[var(--bg-input)] transition-colors text-left mb-0.5"
                          >
                            {prov.img ? (
                              <img src={prov.img} alt={prov.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] flex items-center justify-center text-sm shrink-0 font-bold text-[var(--text-muted)]">
                                {prov.name[0]}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-[var(--text)] truncate">{prov.name}</p>
                              {prov.sub && <p className="text-[10px] text-[var(--text)]/40 truncate">{prov.sub}</p>}
                            </div>
                            <ChevronRight size={12} className="text-[var(--text)]/20 shrink-0" />
                          </button>
                        ))
                      )}
                      <Link
                        to={cat?.path || '/'}
                        onClick={() => setMobileOpen(false)}
                        className="w-full flex items-center justify-center gap-1.5 mt-3 px-3 py-2 rounded-xl bg-brand-500/10 text-brand-400 text-xs font-semibold hover:bg-brand-500/20 transition-colors"
                      >
                        View all {cat?.name} →
                      </Link>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Auth at bottom */}
            <div className="p-4 border-t border-[var(--border)]">
              {user ? (
                <div className="flex gap-2">
                  <Link to={dashPath} onClick={() => setMobileOpen(false)} className="flex-1 btn-secondary text-sm text-center py-2.5">
                    Dashboard
                  </Link>
                  <button onClick={signOut} className="flex-1 btn-ghost text-sm text-red-400 py-2.5">
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary text-sm text-center py-2.5">Login</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary text-sm text-center py-2.5">Join Free</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
