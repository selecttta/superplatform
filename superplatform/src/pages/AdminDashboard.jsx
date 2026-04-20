import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Package, DollarSign, AlertTriangle, BarChart3,
  Check, X, Eye, Shield, Settings, Bell, TrendingUp,
  Clock, ChevronRight, Search, Download, RefreshCw,
  Star, Trash2, Flag, MessageCircle, Tag, Home,
  ShoppingCart, Calendar, FileText, AlertOctagon,
  ChevronDown, Filter, ArrowUpRight, Menu
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fmt, fmtDate, fmtTime, STATUS_COLORS, initials } from '../utils/helpers';
import { CATEGORIES } from '../lib/constants';
import toast from 'react-hot-toast';

// ─── Sidebar nav items ──────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard',     label: 'Dashboard',      icon: Home },
  { id: 'providers',     label: 'Providers',      icon: Shield },
  { id: 'users',         label: 'Users',          icon: Users },
  { id: 'listings',      label: 'Listings',       icon: Package },
  { id: 'orders',        label: 'Orders',         icon: ShoppingCart },
  { id: 'bookings',      label: 'Bookings',       icon: Calendar },
  { id: 'payments',      label: 'Payments',       icon: DollarSign },
  { id: 'marketplace',   label: 'Marketplace',    icon: Tag },
  { id: 'reviews',       label: 'Reviews',        icon: Star },
  { id: 'reports',       label: 'Reports',        icon: BarChart3 },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'settings',      label: 'Settings',       icon: Settings },
];

// ─── Status badge helper ──────────────────────────────────────────────────────
const sBadge = (s) => STATUS_COLORS[s] || STATUS_COLORS[s?.toLowerCase?.()] || 'badge-gray';

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[var(--text)]/40 uppercase tracking-wide">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <p className="font-display text-2xl font-bold text-[var(--text)]">{value}</p>
      {sub && <p className="text-xs text-emerald-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Table wrapper ────────────────────────────────────────────────────────────
function DataTable({ columns, rows, empty }) {
  if (!rows.length) return (
    <div className="text-center py-16 text-[var(--text)]/30">
      <Package size={36} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">{empty || 'No data'}</p>
    </div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {columns.map(c => (
              <th key={c.key} className="text-left text-xs text-[var(--text)]/40 uppercase tracking-wide font-medium py-3 px-4 whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.03] transition-colors">
              {columns.map(c => (
                <td key={c.key} className="py-3 px-4 whitespace-nowrap">{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── CSV Export utility ───────────────────────────────────────────────────────
function exportCSV(filename, headers, rows) {
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success(`${filename} downloaded!`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [section, setSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Data
  const [providers, setProviders] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [marketItems, setMarketItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ users: 0, providers: 0, revenue: 0, commission: 0, pendingProviders: 0, pendingListings: 0 });
  const [revenueByCat, setRevenueByCat] = useState([]);

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: pendingProv },
        { data: allProv },
        { data: listData },
        { data: userData },
        { data: payData },
        { data: revData },
        { data: prodData },
        { data: ordData },
        { data: bkData },
        { data: notifData },
        { count: userCount },
        { count: provCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'provider').eq('is_approved', false).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'provider').order('created_at', { ascending: false }).limit(200),
        supabase.from('listings').select('*, profiles!listings_provider_id_fkey(full_name, email)').order('created_at', { ascending: false }).limit(200),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('reviews').select('*, profiles!reviews_reviewer_id_fkey(full_name)').order('created_at', { ascending: false }).limit(100),
        supabase.from('products').select('*, profiles!products_seller_id_fkey(full_name)').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('orders').select('*, profiles!orders_customer_id_fkey(full_name, email)').order('created_at', { ascending: false }).limit(200),
        supabase.from('bookings').select('*, customer:profiles!bookings_customer_id_fkey(full_name), provider:profiles!bookings_provider_id_fkey(full_name)').order('created_at', { ascending: false }).limit(200),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'provider'),
      ]);

      setProviders(pendingProv || []);
      setAllProviders(allProv || []);
      setListings(listData || []);
      setUsers(userData || []);
      setTransactions(payData || []);
      setReviews(revData || []);
      setMarketItems(prodData || []);
      setOrders(ordData || []);
      setBookings(bkData || []);
      setNotifications(notifData || []);

      // Calculate real stats
      const completedPay = (payData || []).filter(p => p.status === 'completed');
      const totalPaid = completedPay.reduce((s, p) => s + Number(p.amount || 0), 0);

      // Revenue by category — compute from bookings joined with categories
      const catMap = {};
      (bkData || []).filter(b => b.payment_status === 'paid' || b.status === 'completed').forEach(b => {
        const cat = b.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + Number(b.amount || 0);
      });
      // Also include order revenue
      (ordData || []).filter(o => o.payment_status === 'paid' || o.status === 'delivered').forEach(o => {
        catMap['ecommerce'] = (catMap['ecommerce'] || 0) + Number(o.total || 0);
      });
      const catList = Object.entries(catMap).map(([cat, amount]) => ({
        cat: CATEGORIES.find(c => c.id === cat)?.name || cat,
        amount,
        color: CATEGORIES.find(c => c.id === cat)?.color || '#666',
      })).sort((a, b) => b.amount - a.amount);
      setRevenueByCat(catList);

      setStats({
        users: userCount || userData?.length || 0,
        providers: provCount || 0,
        revenue: totalPaid,
        commission: completedPay.reduce((s, p) => s + Number(p.amount || 0) * 0.15, 0),
        pendingProviders: (pendingProv || []).length,
        pendingListings: (listData || []).filter(l => l.status === 'pending').length,
      });
    } catch (err) {
      console.error('Admin fetch error:', err);
      toast.error('Failed to load data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const approveProvider = async (id) => {
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
    if (error) { toast.error('Failed: ' + error.message); return; }
    setProviders(p => p.filter(x => x.id !== id));
    setAllProviders(p => p.map(x => x.id === id ? { ...x, is_approved: true } : x));
    toast.success('Provider approved!');
  };

  const rejectProvider = async (id) => {
    const { error } = await supabase.from('profiles').update({ is_approved: false, role: 'customer' }).eq('id', id);
    if (error) { toast.error('Failed: ' + error.message); return; }
    setProviders(p => p.filter(x => x.id !== id));
    toast.error('Provider rejected.');
  };

  const approveListing = async (id) => {
    const listing = listings.find(l => l.id === id);
    if (listing?.provider_id) {
      const provider = allProviders.find(p => p.id === listing.provider_id);
      if (provider && !provider.is_approved) {
        toast.error('Cannot approve listing: Provider application is not approved!');
        return;
      }
    }

    const { error } = await supabase.from('listings').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed'); return; }
    setListings(l => l.map(x => x.id === id ? { ...x, status: 'approved' } : x));
    toast.success('Listing approved!');
  };

  const rejectListing = async (id) => {
    const { error } = await supabase.from('listings').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed'); return; }
    setListings(l => l.map(x => x.id === id ? { ...x, status: 'rejected' } : x));
    toast.error('Listing rejected.');
  };

  const toggleUserStatus = async (u) => {
    const isSuspended = u.is_suspended;
    const { error } = await supabase.from('profiles').update({ is_suspended: !isSuspended }).eq('id', u.id);
    if (error) { toast.error('Failed'); return; }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_suspended: !isSuspended } : x));
    toast.success(isSuspended ? 'User reactivated' : 'User suspended');
  };

  const updateOrderStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) { toast.error('Failed'); return; }
    setOrders(prev => prev.map(x => x.id === id ? { ...x, status } : x));
    toast.success(`Order marked as ${status}`);
  };

  const updateBookingStatus = async (id, status) => {
    const update = { status };
    if (status === 'completed') update.completed_at = new Date().toISOString();
    const { error } = await supabase.from('bookings').update(update).eq('id', id);
    if (error) { toast.error('Failed'); return; }
    setBookings(prev => prev.map(x => x.id === id ? { ...x, ...update } : x));
    toast.success(`Booking ${status}`);
  };

  const deleteReview = async (id) => {
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) { toast.error('Failed'); return; }
    setReviews(r => r.filter(x => x.id !== id));
    toast.success('Review deleted');
  };

  const approveProduct = async (id) => {
    const product = marketItems.find(p => p.id === id);
    if (product?.seller_id && product?.seller_type === 'provider') {
      const provider = allProviders.find(p => p.id === product.seller_id);
      if (provider && !provider.is_approved) {
        toast.error('Cannot approve product: Provider application is not approved!');
        return;
      }
    }

    const { error } = await supabase.from('products').update({ status: 'approved' }).eq('id', id);
    if (error) { toast.error('Failed'); return; }
    setMarketItems(m => m.filter(x => x.id !== id));
    toast.success('Product approved!');
  };

  const rejectProduct = async (id) => {
    const { error } = await supabase.from('products').update({ status: 'rejected' }).eq('id', id);
    if (error) { toast.error('Failed'); return; }
    setMarketItems(m => m.filter(x => x.id !== id));
    toast.error('Product rejected.');
  };

  // ── Filtered data ────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredListings = statusFilter === 'all' ? listings : listings.filter(l => l.status === statusFilter);
  const filteredOrders = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);
  const filteredBookings = statusFilter === 'all' ? bookings : bookings.filter(b => b.status === statusFilter);
  const pendingCount = providers.length + listings.filter(l => l.status === 'pending').length + marketItems.length;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16 flex">

      {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
      <aside className={`fixed top-16 left-0 bottom-0 z-30 bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-16'}`}>
        {/* Toggle */}
        <button onClick={() => setSidebarOpen(o => !o)}
          className="flex items-center gap-2 px-4 py-4 border-b border-[var(--border)] hover:bg-white/5 transition-colors">
          <Menu size={18} className="text-[var(--text)]/60 shrink-0" />
          {sidebarOpen && <span className="text-xs font-semibold text-[var(--text)]/60 uppercase tracking-wider">Admin Panel</span>}
        </button>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          {NAV.map(item => {
            const Icon = item.icon;
            const isActive = section === item.id;
            const hasBadge = (item.id === 'providers' && providers.length > 0) ||
                             (item.id === 'listings' && listings.filter(l => l.status === 'pending').length > 0) ||
                             (item.id === 'marketplace' && marketItems.length > 0);
            return (
              <button key={item.id} onClick={() => { setSection(item.id); setStatusFilter('all'); setSearch(''); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all relative ${isActive
                  ? 'bg-red-500/10 text-red-400 border-r-2 border-red-500'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon size={17} className="shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
                {hasBadge && (
                  <span className={`${sidebarOpen ? 'ml-auto' : 'absolute top-1 right-1'} min-w-[18px] h-[18px] bg-yellow-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center px-1`}>
                    {item.id === 'providers' ? providers.length : item.id === 'listings' ? listings.filter(l => l.status === 'pending').length : marketItems.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Refresh */}
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {sidebarOpen && <span>{loading ? 'Loading…' : 'Refresh'}</span>}
        </button>
      </aside>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-16'}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* ══════════════ DASHBOARD ══════════════ */}
          {section === 'dashboard' && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="heading-md flex items-center gap-2">
                    Admin Dashboard <span className="badge badge-red text-xs">🛡️ Admin</span>
                  </h1>
                  <p className="text-muted text-sm mt-1">SuperPlatform GH Control Panel</p>
                </div>
                {pendingCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <AlertTriangle size={14} className="text-yellow-400" />
                    <span className="text-yellow-300 text-xs font-medium">{pendingCount} pending review</span>
                  </div>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Users" value={stats.users.toLocaleString()} sub="All registered" icon={<Users size={16} className="text-blue-400" />} color="bg-blue-500/10" />
                <StatCard label="Active Providers" value={stats.providers.toLocaleString()} icon={<Package size={16} className="text-emerald-400" />} color="bg-emerald-500/10" />
                <StatCard label="Total Revenue" value={fmt(stats.revenue)} icon={<DollarSign size={16} className="text-brand-400" />} color="bg-brand-500/10" />
                <StatCard label="Commission (15%)" value={fmt(Math.round(stats.commission))} icon={<BarChart3 size={16} className="text-violet-400" />} color="bg-violet-500/10" />
              </div>

              {/* Pending alerts */}
              {pendingCount > 0 && (
                <div className="glass rounded-2xl p-5 mb-6 flex flex-wrap items-center gap-4 border-yellow-500/20">
                  <AlertTriangle size={20} className="text-yellow-400 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-300">Action Required</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {providers.length > 0 && `${providers.length} provider(s)`}
                      {providers.length > 0 && listings.filter(l => l.status === 'pending').length > 0 && ' · '}
                      {listings.filter(l => l.status === 'pending').length > 0 && `${listings.filter(l => l.status === 'pending').length} listing(s)`}
                      {marketItems.length > 0 && ` · ${marketItems.length} product(s)`}
                      {' '}awaiting approval
                    </p>
                  </div>
                  <button onClick={() => setSection('providers')} className="btn btn-sm bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30">Review Now →</button>
                </div>
              )}

              {/* Revenue breakdown — REAL computed data */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="heading-sm mb-5">Revenue by Category</h3>
                  {revenueByCat.length === 0 ? (
                    <p className="text-[var(--text)]/30 text-sm text-center py-8">No revenue data yet</p>
                  ) : (
                    <div className="space-y-4">
                      {revenueByCat.map(item => {
                        const total = revenueByCat.reduce((s, r) => s + r.amount, 0);
                        const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
                        return (
                          <div key={item.cat}>
                            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
                              <span>{item.cat}</span>
                              <span>{fmt(Math.round(item.amount))} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="card p-6">
                  <h3 className="heading-sm mb-5">Recent Payments</h3>
                  <div className="space-y-3">
                    {transactions.slice(0, 6).map((tx, i) => (
                      <div key={tx.id || i} className="flex items-start gap-3 text-sm">
                        <span className="text-lg shrink-0">
                          {tx.status === 'completed' ? '✅' : tx.status === 'pending' ? '⏳' : '❌'}
                        </span>
                        <div className="flex-1">
                          <p className="text-[var(--text-muted)]">{fmt(tx.amount)} via {tx.method || 'Card'}</p>
                          <p className="text-xs text-[var(--text)]/30 mt-0.5">
                            {tx.reference || tx.id?.slice(0, 8)} · {tx.created_at ? fmtDate(tx.created_at) : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                    {transactions.length === 0 && <p className="text-[var(--text)]/30 text-sm">No transactions yet</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ PROVIDERS ══════════════ */}
          {section === 'providers' && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-md">Provider Management</h2>
                <div className="flex gap-2">
                  {['all', 'pending', 'approved'].map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${statusFilter === f ? 'bg-red-500 text-white' : 'glass text-[var(--text-muted)]'}`}>{f === 'all' ? `All (${allProviders.length})` : f === 'pending' ? `Pending (${providers.length})` : 'Approved'}</button>
                  ))}
                </div>
              </div>
              <div className="card overflow-hidden">
                <DataTable
                  empty="No providers found"
                  columns={[
                    { key: 'name', label: 'Provider', render: p => (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[var(--bg)] rounded-full flex items-center justify-center font-bold text-xs shrink-0">{initials(p.full_name || p.email)}</div>
                        <div>
                          <p className="font-medium text-[var(--text)]">{p.full_name || 'Unnamed'}</p>
                          <p className="text-xs text-[var(--text)]/40">{p.email}</p>
                        </div>
                      </div>
                    )},
                    { key: 'category', label: 'Category', render: p => <span className="text-[var(--text-muted)]">{p.category || '—'}</span> },
                    { key: 'phone', label: 'Phone', render: p => <span className="text-[var(--text-muted)]">{p.phone || '—'}</span> },
                    { key: 'id_verified', label: 'ID', render: p => <span className={`badge ${p.id_verified ? 'badge-green' : 'badge-red'}`}>{p.id_verified ? '✓ Verified' : 'Unverified'}</span> },
                    { key: 'status', label: 'Status', render: p => <span className={`badge ${p.is_approved ? 'badge-green' : 'badge-yellow'}`}>{p.is_approved ? 'Approved' : 'Pending'}</span> },
                    { key: 'joined', label: 'Joined', render: p => <span className="text-[var(--text)]/40 text-xs">{p.created_at ? fmtDate(p.created_at) : '—'}</span> },
                    { key: 'actions', label: 'Actions', render: p => !p.is_approved ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => approveProvider(p.id)} className="btn btn-sm bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"><Check size={13} /></button>
                        <button onClick={() => rejectProvider(p.id)} className="btn btn-sm bg-red-500/15 text-red-400 hover:bg-red-500/25"><X size={13} /></button>
                      </div>
                    ) : <span className="text-[var(--text)]/20 text-xs">—</span> },
                  ]}
                  rows={statusFilter === 'pending' ? providers : statusFilter === 'approved' ? allProviders.filter(p => p.is_approved) : allProviders}
                />
              </div>
            </div>
          )}

          {/* ══════════════ USERS ══════════════ */}
          {section === 'users' && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h2 className="heading-md">User Management ({filteredUsers.length})</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text)]/30" size={14} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    className="input pl-9 text-sm w-64" placeholder="Search by name or email…" />
                </div>
              </div>
              <div className="card overflow-hidden">
                <DataTable
                  empty="No users found"
                  columns={[
                    { key: 'user', label: 'User', render: u => (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--bg)] rounded-full flex items-center justify-center font-bold text-xs">{initials(u.full_name || u.email)}</div>
                        <div>
                          <p className="font-medium text-[var(--text)]">{u.full_name || 'User'}</p>
                          <p className="text-xs text-[var(--text)]/40">{u.email}</p>
                        </div>
                      </div>
                    )},
                    { key: 'role', label: 'Role', render: u => <span className={`badge capitalize ${u.role === 'provider' ? 'badge-blue' : u.role === 'admin' ? 'badge-purple' : 'badge-gray'}`}>{u.role}</span> },
                    { key: 'status', label: 'Status', render: u => <span className={`badge ${u.is_suspended ? 'badge-red' : 'badge-green'}`}>{u.is_suspended ? 'Suspended' : 'Active'}</span> },
                    { key: 'joined', label: 'Joined', render: u => <span className="text-[var(--text)]/40 text-xs">{u.created_at ? fmtDate(u.created_at) : '—'}</span> },
                    { key: 'actions', label: '', render: u => (
                      <button onClick={() => toggleUserStatus(u)}
                        className={`btn btn-sm ${u.is_suspended ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        {u.is_suspended ? 'Activate' : 'Suspend'}
                      </button>
                    )},
                  ]}
                  rows={filteredUsers}
                />
              </div>
            </div>
          )}

          {/* ══════════════ LISTINGS ══════════════ */}
          {section === 'listings' && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-md">Listing Moderation</h2>
                <div className="flex gap-2">
                  {['all', 'pending', 'approved', 'rejected'].map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${statusFilter === f ? 'bg-red-500 text-white' : 'glass text-[var(--text-muted)]'}`}>
                      {f} {f === 'pending' ? `(${listings.filter(l => l.status === 'pending').length})` : ''}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card overflow-hidden">
                <DataTable
                  empty="No listings found"
                  columns={[
                    { key: 'listing', label: 'Listing', render: l => (
                      <div className="flex items-center gap-3">
                        {l.images?.[0] ? <img src={l.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" /> : <span className="text-2xl">📦</span>}
                        <div>
                          <p className="font-medium text-[var(--text)]">{l.title}</p>
                          <p className="text-xs text-[var(--text)]/40">{l.profiles?.full_name || 'Provider'}</p>
                        </div>
                      </div>
                    )},
                    { key: 'category', label: 'Category', render: l => <span className="badge badge-gray text-xs">{l.category}</span> },
                    { key: 'price', label: 'Price', render: l => <span className="font-bold text-brand-400">{fmt(l.price)}</span> },
                    { key: 'status', label: 'Status', render: l => <span className={`badge ${sBadge(l.status)}`}>{l.status}</span> },
                    { key: 'date', label: 'Created', render: l => <span className="text-[var(--text)]/40 text-xs">{l.created_at ? fmtDate(l.created_at) : ''}</span> },
                    { key: 'actions', label: 'Actions', render: l => l.status === 'pending' ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => approveListing(l.id)} className="btn btn-sm bg-emerald-500/15 text-emerald-400"><Check size={13} /></button>
                        <button onClick={() => rejectListing(l.id)} className="btn btn-sm bg-red-500/15 text-red-400"><X size={13} /></button>
                      </div>
                    ) : <span className="text-[var(--text)]/20 text-xs">—</span> },
                  ]}
                  rows={filteredListings}
                />
              </div>
            </div>
          )}

          {/* ══════════════ ORDERS ══════════════ */}
          {section === 'orders' && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-md">Order Management</h2>
                <div className="flex gap-2">
                  {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${statusFilter === f ? 'bg-red-500 text-white' : 'glass text-[var(--text-muted)]'}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="card overflow-hidden">
                <DataTable
                  empty="No orders yet"
                  columns={[
                    { key: 'id', label: 'Order ID', render: o => <span className="font-mono text-xs text-[var(--text-muted)]">{o.id?.slice(0, 8)}</span> },
                    { key: 'customer', label: 'Customer', render: o => <span className="text-[var(--text)]">{o.profiles?.full_name || 'Customer'}</span> },
                    { key: 'total', label: 'Total', render: o => <span className="font-bold text-[var(--text)]">{fmt(o.total)}</span> },
                    { key: 'payment', label: 'Payment', render: o => <span className={`badge ${sBadge(o.payment_status)}`}>{o.payment_status}</span> },
                    { key: 'status', label: 'Status', render: o => <span className={`badge ${sBadge(o.status)}`}>{o.status}</span> },
                    { key: 'date', label: 'Date', render: o => <span className="text-[var(--text)]/40 text-xs">{o.created_at ? fmtDate(o.created_at) : ''}</span> },
                    { key: 'actions', label: '', render: o => {
                      const next = { pending: 'confirmed', confirmed: 'processing', processing: 'shipped', shipped: 'delivered' }[o.status];
                      return next ? (
                        <button onClick={() => updateOrderStatus(o.id, next)} className="btn btn-sm bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 capitalize">{next}</button>
                      ) : null;
                    }},
                  ]}
                  rows={filteredOrders}
                />
              </div>
            </div>
          )}

          {/* ══════════════ BOOKINGS ══════════════ */}
          {section === 'bookings' && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-md">Booking Management</h2>
                <div className="flex gap-2">
                  {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${statusFilter === f ? 'bg-red-500 text-white' : 'glass text-[var(--text-muted)]'}`}>{f.replace('_', ' ')}</button>
                  ))}
                </div>
              </div>
              <div className="card overflow-hidden">
                <DataTable
                  empty="No bookings yet"
                  columns={[
                    { key: 'service', label: 'Service', render: b => <span className="text-[var(--text)] font-medium">{b.service_name}</span> },
                    { key: 'customer', label: 'Customer', render: b => <span className="text-[var(--text-muted)]">{b.customer?.full_name || '—'}</span> },
                    { key: 'provider', label: 'Provider', render: b => <span className="text-[var(--text-muted)]">{b.provider?.full_name || '—'}</span> },
                    { key: 'amount', label: 'Amount', render: b => <span className="font-bold text-[var(--text)]">{fmt(b.amount)}</span> },
                    { key: 'status', label: 'Status', render: b => <span className={`badge ${sBadge(b.status)}`}>{b.status}</span> },
                    { key: 'date', label: 'Scheduled', render: b => <span className="text-[var(--text)]/40 text-xs">{b.scheduled_at ? fmtDate(b.scheduled_at) : '—'}</span> },
                    { key: 'actions', label: '', render: b => {
                      const next = { pending: 'confirmed', confirmed: 'in_progress', in_progress: 'completed' }[b.status];
                      return next ? (
                        <button onClick={() => updateBookingStatus(b.id, next)} className="btn btn-sm bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 capitalize">{next.replace('_', ' ')}</button>
                      ) : null;
                    }},
                  ]}
                  rows={filteredBookings}
                />
              </div>
            </div>
          )}

          {/* ══════════════ PAYMENTS ══════════════ */}
          {section === 'payments' && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="card p-5 text-center">
                  <p className="text-xs text-[var(--text)]/40 mb-2 uppercase tracking-wide">Total Volume</p>
                  <p className="font-display text-2xl font-bold text-[var(--text)]">{fmt(stats.revenue)}</p>
                </div>
                <div className="card p-5 text-center">
                  <p className="text-xs text-[var(--text)]/40 mb-2 uppercase tracking-wide">Platform Fees (15%)</p>
                  <p className="font-display text-2xl font-bold text-brand-400">{fmt(Math.round(stats.commission))}</p>
                </div>
                <div className="card p-5 text-center">
                  <p className="text-xs text-[var(--text)]/40 mb-2 uppercase tracking-wide">Provider Payouts</p>
                  <p className="font-display text-2xl font-bold text-emerald-400">{fmt(Math.round(stats.revenue - stats.commission))}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="heading-sm">Transaction History</h2>
                <button onClick={() => exportCSV(
                  'superplatform_payments.csv',
                  ['Reference', 'Amount', 'Method', 'Status', 'Date'],
                  transactions.map(t => [t.reference || t.id, t.amount, t.method || 'Card', t.status, t.created_at ? fmtDate(t.created_at) : ''])
                )} className="btn btn-ghost btn-sm gap-1.5">
                  <Download size={14} /> Export CSV
                </button>
              </div>
              <div className="card overflow-hidden">
                <DataTable
                  empty="No transactions yet"
                  columns={[
                    { key: 'ref', label: 'Reference', render: t => <span className="font-mono text-xs text-[var(--text-muted)]">{t.reference?.slice(0, 12) || t.id?.slice(0, 8)}</span> },
                    { key: 'amount', label: 'Amount', render: t => <span className="font-bold text-[var(--text)]">{fmt(t.amount)}</span> },
                    { key: 'method', label: 'Method', render: t => <span className="text-[var(--text-muted)]">{t.method || 'Card'}</span> },
                    { key: 'status', label: 'Status', render: t => <span className={`badge ${sBadge(t.status)}`}>{t.status}</span> },
                    { key: 'date', label: 'Date', render: t => <span className="text-[var(--text)]/40 text-xs">{t.created_at ? fmtDate(t.created_at) : ''}</span> },
                  ]}
                  rows={transactions}
                />
              </div>
            </div>
          )}

          {/* ══════════════ MARKETPLACE ══════════════ */}
          {section === 'marketplace' && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <h2 className="heading-md flex items-center gap-2 mb-6"><Tag size={18} /> Marketplace Approvals ({marketItems.length} pending)</h2>
              <div className="card overflow-hidden">
                <DataTable
                  empty="No items pending approval ✅"
                  columns={[
                    { key: 'product', label: 'Product', render: p => (
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <span className="text-2xl">📷</span>}
                        <div>
                          <p className="font-medium text-[var(--text)]">{p.title}</p>
                          <p className="text-xs text-[var(--text)]/40">{p.profiles?.full_name || 'Seller'} · {p.condition}</p>
                        </div>
                      </div>
                    )},
                    { key: 'category', label: 'Category', render: p => <span className="badge badge-gray text-xs">{p.category}</span> },
                    { key: 'price', label: 'Price', render: p => <span className="font-bold text-brand-400">{fmt(p.price)}</span> },
                    { key: 'actions', label: 'Actions', render: p => (
                      <div className="flex gap-1.5">
                        <button onClick={() => approveProduct(p.id)} className="btn btn-sm bg-emerald-500/15 text-emerald-400"><Check size={13} /> Approve</button>
                        <button onClick={() => rejectProduct(p.id)} className="btn btn-sm bg-red-500/15 text-red-400"><X size={13} /> Reject</button>
                      </div>
                    )},
                  ]}
                  rows={marketItems}
                />
              </div>
            </div>
          )}

          {/* ══════════════ REVIEWS ══════════════ */}
          {section === 'reviews' && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <h2 className="heading-md mb-6">Review Moderation ({reviews.length})</h2>
              <div className="card overflow-hidden">
                <DataTable
                  empty="No reviews to moderate"
                  columns={[
                    { key: 'reviewer', label: 'Reviewer', render: r => <span className="text-[var(--text)]">{r.profiles?.full_name || 'User'}</span> },
                    { key: 'rating', label: 'Rating', render: r => (
                      <div className="flex items-center gap-0.5">{[1,2,3,4,5].map(n => <Star key={n} size={12} className={n <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--text)]/15'} />)}</div>
                    )},
                    { key: 'comment', label: 'Comment', render: r => <span className="text-[var(--text-muted)] text-xs max-w-xs truncate block">{r.comment || 'No comment'}</span> },
                    { key: 'date', label: 'Date', render: r => <span className="text-[var(--text)]/40 text-xs">{r.created_at ? fmtDate(r.created_at) : ''}</span> },
                    { key: 'actions', label: '', render: r => (
                      <button onClick={() => deleteReview(r.id)} className="btn btn-sm bg-red-500/15 text-red-400"><Trash2 size={12} /></button>
                    )},
                  ]}
                  rows={reviews}
                />
              </div>
            </div>
          )}

          {/* ══════════════ REPORTS ══════════════ */}
          {section === 'reports' && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <h2 className="heading-md mb-6">Reports & Analytics</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: 'Payment Transactions', icon: '💳', desc: 'Export all payment data to CSV',
                    action: () => exportCSV('payments_report.csv', ['ID','Amount','Method','Status','Date'], transactions.map(t => [t.id, t.amount, t.method, t.status, t.created_at])) },
                  { title: 'User Report', icon: '👤', desc: 'Export user list with roles and status',
                    action: () => exportCSV('users_report.csv', ['Name','Email','Role','Suspended','Joined'], users.map(u => [u.full_name, u.email, u.role, u.is_suspended ? 'Yes' : 'No', u.created_at])) },
                  { title: 'Provider Report', icon: '🧑‍🔧', desc: 'All providers with approval status',
                    action: () => exportCSV('providers_report.csv', ['Name','Email','Category','Approved','Rating','Joined'], allProviders.map(p => [p.full_name, p.email, p.category, p.is_approved ? 'Yes' : 'No', p.rating, p.created_at])) },
                  { title: 'Booking Report', icon: '📅', desc: 'All bookings with status and amounts',
                    action: () => exportCSV('bookings_report.csv', ['Service','Customer','Provider','Amount','Status','Date'], bookings.map(b => [b.service_name, b.customer?.full_name, b.provider?.full_name, b.amount, b.status, b.created_at])) },
                  { title: 'Order Report', icon: '🛒', desc: 'Export order data with payment info',
                    action: () => exportCSV('orders_report.csv', ['ID','Customer','Total','Payment','Status','Date'], orders.map(o => [o.id?.slice(0,8), o.profiles?.full_name, o.total, o.payment_status, o.status, o.created_at])) },
                  { title: 'Revenue by Category', icon: '📊', desc: 'Category-wise revenue breakdown',
                    action: () => exportCSV('revenue_by_category.csv', ['Category','Amount'], revenueByCat.map(r => [r.cat, r.amount])) },
                ].map((r, i) => (
                  <button key={i} onClick={r.action}
                    className="card p-5 text-left hover:border-white/15 hover:-translate-y-0.5 transition-all duration-200">
                    <span className="text-3xl block mb-3">{r.icon}</span>
                    <p className="font-semibold text-[var(--text)] mb-1">{r.title}</p>
                    <p className="text-xs text-[var(--text)]/40 leading-relaxed">{r.desc}</p>
                    <div className="flex items-center gap-1 mt-4 text-xs text-brand-400 font-medium">
                      <Download size={11} /> Download CSV
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════ NOTIFICATIONS ══════════════ */}
          {section === 'notifications' && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <h2 className="heading-md mb-6">Notifications</h2>
              {notifications.length === 0 ? (
                <div className="card p-12 text-center text-[var(--text)]/30">
                  <Bell size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map(n => (
                    <div key={n.id} className="card p-4 flex items-start gap-3">
                      <Bell size={16} className="text-brand-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text)]">{n.title}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{n.body}</p>
                      </div>
                      <span className="text-xs text-[var(--text)]/30">{n.created_at ? fmtDate(n.created_at) : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════ SETTINGS ══════════════ */}
          {section === 'settings' && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <h2 className="heading-md mb-6">Platform Settings</h2>
              <div className="card p-6 max-w-lg">
                <p className="text-[var(--text-muted)] text-sm mb-4">Platform configuration is managed via the Supabase dashboard. Key settings:</p>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Commission Rate', val: '15%' },
                    { label: 'Email Verification', val: 'Required' },
                    { label: 'Provider Approval', val: 'Manual (Admin)' },
                    { label: 'Listing Moderation', val: 'Required before publish' },
                    { label: 'Marketplace Approval', val: 'Required for products' },
                    { label: 'Real-time Chat', val: 'Enabled (Supabase channels)' },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between py-2 border-b border-[var(--border)] last:border-0">
                      <span className="text-[var(--text-muted)]">{s.label}</span>
                      <span className="font-medium text-[var(--text)]">{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
