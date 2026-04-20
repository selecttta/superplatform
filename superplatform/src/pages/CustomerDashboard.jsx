import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Package, Calendar, Wallet, Bell, Heart, Star, Settings, ChevronRight, Plus, TrendingUp, Send, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useOrders } from '../hooks/useOrders';
import { useBookings } from '../hooks/useBookings';
import { useNotifications } from '../hooks/useNotifications';
import { useWallet } from '../hooks/useWallet';
import { supabase } from '../lib/supabase';
import { CATEGORIES } from '../lib/constants';
import { fmt, fmtDate, initials } from '../utils/helpers';
import PaymentModal from '../components/common/PaymentModal';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  Delivered: 'badge-green',
  delivered: 'badge-green',
  'In Transit': 'badge-blue',
  Processing: 'badge-yellow',
  processing: 'badge-yellow',
  confirmed: 'badge-blue',
  Cancelled: 'badge-red',
  cancelled: 'badge-red',
  Upcoming: 'badge-orange',
  upcoming: 'badge-orange',
  Completed: 'badge-green',
  completed: 'badge-green',
  pending: 'badge-yellow',
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: <TrendingUp size={15} /> },
  { id: 'orders', label: 'Orders', icon: <Package size={15} /> },
  { id: 'bookings', label: 'Bookings', icon: <Calendar size={15} /> },
  { id: 'wallet', label: 'Wallet', icon: <Wallet size={15} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={15} /> },
  { id: 'favorites', label: 'Favorites', icon: <Heart size={15} /> },
];

/* ── Review Prompt — submits to Supabase ── */
function ReviewPrompt({ booking, userId }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (done) return <span className="text-xs text-emerald-400">✓ Review submitted</span>;

  const handleSubmit = async () => {
    if (!rating) { toast.error('Please select a rating.'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        reviewer_id: userId,
        provider_id: booking.provider_id || null,
        target_id: String(booking.id),
        target_type: 'booking',
        rating,
        comment: comment.trim() || null,
        created_at: new Date().toISOString(),
      });
      if (error) {
        if (error.code === '23505') { toast.error('You already reviewed this booking.'); setDone(true); return; }
        throw error;
      }
      toast.success('Review submitted! ⭐');
      setDone(true);
    } catch (err) {
      toast.error(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)]">
      <div className="flex items-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button"
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}>
            <Star size={16} className={n <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--text)]/20'} />
          </button>
        ))}
        <span className="text-xs text-[var(--text)]/30 ml-2">{rating > 0 ? `${rating}★` : 'Rate'}</span>
      </div>
      {rating > 0 && (
        <div className="flex gap-2">
          <input value={comment} onChange={e => setComment(e.target.value.slice(0, 200))}
            className="input text-xs py-1.5 flex-1" placeholder="Quick review…" maxLength={200} />
          <button onClick={handleSubmit} disabled={submitting}
            className="btn btn-primary btn-sm shrink-0">
            {submitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          </button>
        </div>
      )}
    </div>
  );
}

export default function CustomerDashboard() {
  const { profile, user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [tab, setTab] = useState(sp.get('tab') || 'overview');
  const [topup, setTopup] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  // Real Supabase hooks — no mock fallbacks
  const { orders, loading: ordLoading } = useOrders();
  const { bookings, loading: bkLoading } = useBookings({ customerId: profile?.id });
  const { notifications: notifs, unreadCount: unread, markRead, markAllRead, loading: notifLoading } = useNotifications();
  const { balance: walletBalance, transactions: walletTx, loading: walletLoading } = useWallet();

  // Fetch real review count
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('reviewer_id', user.id)
      .then(({ count }) => setReviewCount(count || 0));
  }, [user?.id]);

  // Cancel booking — real DB operation
  const cancelBooking = async (bookingId) => {
    try {
      const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
      if (error) throw error;
      toast.success('Booking cancelled.');
      // Optimistic update
      window.location.reload();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking.');
    }
  };

  const parseItems = (o) => {
    if (typeof o.items === 'string') {
      try { const arr = JSON.parse(o.items); return arr.map(i => i.name || i).join(', '); }
      catch { return o.items; }
    }
    if (Array.isArray(o.items)) return o.items.map(i => i.name || i).join(', ');
    return o.item || 'Order';
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Profile header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center font-bold text-[var(--text)] text-xl shrink-0">
            {initials(profile?.full_name || 'U')}
          </div>
          <div className="flex-1">
            <h1 className="heading-md">Hello, {profile?.full_name?.split(' ')[0] || 'there'} 👋</h1>
            <p className="text-muted text-sm flex items-center gap-2">
              <span>{profile?.email}</span>
              {profile?.phone && (
                <>
                  <span>•</span>
                  <span>{profile.phone}</span>
                </>
              )}
            </p>
          </div>
          <Link to="/profile" className="btn-secondary btn-sm gap-2"><Settings size={14} /> Settings</Link>
        </div>

        <div className="flex gap-8">
          {/* Sidebar tabs */}
          <div className="hidden md:block w-52 shrink-0">
            <div className="card p-2 space-y-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-brand-500 text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]'}`}>
                  {t.icon} {t.label}
                  {t.id === 'notifications' && unread > 0 && (
                    <span className="ml-auto badge-orange text-[10px] px-1.5 py-0.5">{unread}</span>
                  )}
                </button>
              ))}
              <div className="divider" />
              <button onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all">
                Sign Out
              </button>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="md:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4 w-full">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${tab === t.id ? 'bg-brand-500 text-[var(--text)]' : 'glass text-[var(--text-muted)]'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div style={{ animation: 'fadeUp .4s ease' }}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Total Orders', value: String(orders.length), color: 'text-brand-400' },
                    { label: 'Bookings', value: String(bookings.length), color: 'text-blue-400' },
                    { label: 'Wallet', value: fmt(walletBalance), color: 'text-emerald-400' },
                    { label: 'Reviews Given', value: String(reviewCount), color: 'text-yellow-400' },
                  ].map((s, i) => (
                    <div key={i} className="stat-card">
                      <p className="text-xs text-muted">{s.label}</p>
                      <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Recent orders */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="heading-sm">Recent Orders</h3>
                    <button onClick={() => setTab('orders')} className="btn-ghost text-sm rounded-xl">View all →</button>
                  </div>
                  {ordLoading ? (
                    <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card p-4 h-16 animate-pulse bg-[var(--bg-card)]" />)}</div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text)]/30">
                      <Package size={32} className="mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No orders yet.</p>
                      <Link to="/ecommerce" className="btn-primary btn-sm mt-3 inline-flex">Browse Products</Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 3).map(o => (
                        <div key={o.id} className="card p-4 flex items-center gap-4">
                          <span className="text-2xl">{o.icon || '📦'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[var(--text)] text-sm truncate">{parseItems(o)}</p>
                            <p className="text-xs text-muted">{o.id?.slice(0, 8)} · {(o.created_at || '').slice(0, 10)}</p>
                          </div>
                          <span className={`badge text-xs ${STATUS_BADGE[o.status] || 'badge-gray'}`}>{o.status}</span>
                          <p className="text-sm font-bold text-[var(--text)] shrink-0">{fmt(o.total || o.amount)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <h3 className="heading-sm mb-4">Explore More</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CATEGORIES.slice(0, 4).map(c => (
                    <Link key={c.id} to={c.path} className="card-hover p-4 flex items-center gap-3">
                      <span className="text-2xl">{c.icon}</span>
                      <div>
                        <p className="text-xs font-medium text-[var(--text)]">{c.name}</p>
                        <p className="text-[11px] text-brand-400">{c.cta}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ORDERS */}
            {tab === 'orders' && (
              <div style={{ animation: 'fadeUp .4s ease' }}>
                <h3 className="heading-sm mb-5">Order History</h3>
                {ordLoading ? (
                  <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="card p-5 h-20 animate-pulse bg-[var(--bg-card)]" />)}</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-20 text-[var(--text)]/30">
                    <Package size={40} className="mx-auto mb-3 opacity-20" />
                    <p>No orders yet.</p>
                    <Link to="/ecommerce" className="btn-primary btn-sm mt-4 inline-flex">Browse Products</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map(o => (
                      <div key={o.id} className="card p-5 flex items-center gap-4">
                        <span className="text-3xl">{o.icon || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--text)]">{parseItems(o)}</p>
                          <p className="text-sm text-muted">{o.id?.slice(0, 8)} · {(o.created_at || '').slice(0, 10)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[var(--text)]">{fmt(o.total || o.amount)}</p>
                          <span className={`badge text-xs mt-1 ${STATUS_BADGE[o.status] || 'badge-gray'}`}>{o.status}</span>
                        </div>
                        <ChevronRight size={16} className="text-[var(--text)]/20 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BOOKINGS */}
            {tab === 'bookings' && (
              <div style={{ animation: 'fadeUp .4s ease' }}>
                <h3 className="heading-sm mb-5">My Bookings</h3>
                {bkLoading ? (
                  <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="card p-5 h-28 animate-pulse bg-[var(--bg-card)]" />)}</div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-20 text-[var(--text)]/30">
                    <Calendar size={40} className="mx-auto mb-3 opacity-20" />
                    <p>No bookings yet.</p>
                    <Link to="/" className="btn-primary btn-sm mt-4 inline-flex">Browse Services</Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map(bk => (
                      <div key={bk.id} className="card p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-[var(--text)]">{bk.service_name || bk.service}</p>
                            <p className="text-sm text-muted">{bk.provider?.full_name || bk.provider_name || 'Provider'}</p>
                            <p className="text-xs text-muted mt-1">{bk.scheduled_at ? fmtDate(bk.scheduled_at) : (bk.created_at || '').slice(0, 10)} · {bk.category || ''}</p>
                          </div>
                          <span className={`badge text-xs ${STATUS_BADGE[bk.status] || 'badge-gray'}`}>{bk.status}</span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                          <span className="font-bold text-[var(--text)]">{fmt(bk.amount || bk.total_price || 0)}</span>
                          {(bk.status === 'completed') ? (
                            <ReviewPrompt booking={bk} userId={user?.id} />
                          ) : (bk.status === 'pending' || bk.status === 'confirmed') ? (
                            <button onClick={() => cancelBooking(bk.id)} className="btn-danger text-xs">Cancel</button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WALLET */}
            {tab === 'wallet' && (
              <div style={{ animation: 'fadeUp .4s ease' }}>
                <div className="card p-8 text-center mb-6 bg-gradient-to-br from-brand-600/20 to-dark-800">
                  <Wallet size={28} className="text-brand-400 mx-auto mb-3" />
                  <p className="text-muted text-sm mb-1">Available Balance</p>
                  <p className="font-display text-5xl font-black text-[var(--text)] mb-1">{fmt(walletBalance)}</p>
                  <p className="text-xs text-[var(--text)]/25">Live balance from your wallet</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <button onClick={() => setTopup(true)} className="btn-primary btn-lg flex items-center justify-center gap-2">
                    <Plus size={16} /> Top Up
                  </button>
                  <button onClick={() => navigate('/wallet')} className="btn-secondary btn-lg">
                    Full Wallet →
                  </button>
                </div>
                <h3 className="heading-sm mb-4">Transaction History</h3>
                {walletLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="card p-4 h-14 animate-pulse bg-[var(--bg-card)]" />)}</div>
                ) : walletTx.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text)]/30">
                    <Wallet size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No transactions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {walletTx.slice(0, 10).map((tx, i) => (
                      <div key={tx.id || i} className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--bg-card)]">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${(Number(tx.amount) > 0) ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                          <span className="text-sm">{Number(tx.amount) > 0 ? '⬆️' : '⬇️'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--text)] truncate">{tx.description || tx.type}</p>
                          <p className="text-xs text-muted">{tx.created_at ? fmtDate(tx.created_at) : ''} · {tx.payment_method || ''}</p>
                        </div>
                        <span className={`font-bold text-sm shrink-0 ${Number(tx.amount) > 0 ? 'text-emerald-400' : 'text-[var(--text)]'}`}>
                          {Number(tx.amount) > 0 ? '+' : ''}{fmt(Math.abs(Number(tx.amount)))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NOTIFICATIONS */}
            {tab === 'notifications' && (
              <div style={{ animation: 'fadeUp .4s ease' }}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="heading-sm">Notifications {unread > 0 && <span className="badge-orange ml-2">{unread} new</span>}</h3>
                  {unread > 0 && <button onClick={() => markAllRead()} className="btn-ghost text-xs rounded-xl">Mark all read</button>}
                </div>
                {notifLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="card p-4 h-16 animate-pulse bg-[var(--bg-card)]" />)}</div>
                ) : notifs.length === 0 ? (
                  <div className="text-center py-20 text-[var(--text)]/30">
                    <Bell size={40} className="mx-auto mb-3 opacity-20" />
                    <p>No notifications yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifs.map(n => (
                      <div key={n.id}
                        onClick={() => { markRead(n.id); }}
                        className={`card p-4 flex items-start gap-3 cursor-pointer hover:border-white/15 transition-all ${!n.is_read ? 'border-brand-500/30' : ''}`}>
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read ? 'bg-white/15' : 'bg-brand-500'}`} />
                        <div className="flex-1">
                          <p className="font-medium text-[var(--text)] text-sm">{n.title}</p>
                          <p className="text-xs text-muted mt-0.5">{n.body}</p>
                        </div>
                        <span className="text-xs text-[var(--text)]/25 shrink-0 whitespace-nowrap">{n.created_at ? fmtDate(n.created_at) : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FAVORITES */}
            {tab === 'favorites' && (
              <div style={{ animation: 'fadeUp .4s ease' }}>
                <h3 className="heading-sm mb-5">Saved Items</h3>
                <div className="py-20 text-center text-muted">
                  <Heart size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No favorites yet.</p>
                  <p className="text-sm mt-1">Heart items while browsing to save them here.</p>
                  <Link to="/ecommerce" className="btn-primary btn-sm mt-6 inline-flex">Browse Products</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {topup && (
        <PaymentModal
          amount={200}
          title="Wallet Top-Up"
          onSuccess={() => { toast.success('GH₵200 added to wallet!'); setTopup(false); }}
          onClose={() => setTopup(false)}
        />
      )}
    </div>
  );
}
