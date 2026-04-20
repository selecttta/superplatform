import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Lock, Camera, Shield, Bell, CreditCard, LogOut, Eye, EyeOff, Check } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { initials } from '../utils/helpers';
import toast from 'react-hot-toast';

const TABS = ['profile','security','notifications','payment'];

export default function ProfilePage() {
  const { profile, role, updateProfile, updatePassword, signOut } = useAuthStore();
  const [tab, setTab]           = useState('profile');
  const [form, setForm]         = useState({
    full_name: profile?.full_name || '',
    phone:     profile?.phone     || '',
    location:  profile?.location  || '',
    bio:       profile?.bio       || '',
  });
  const [pwForm, setPwForm]     = useState({ current:'', newPw:'', confirm:'' });
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [notifs, setNotifs]     = useState({
    orders: true, bookings: true, promos: false, messages: true, system: true
  });

  const handleSave = async () => {
    setSaving(true);
    await updateProfile(form);
    setSaving(false);
  };

  const handlePwChange = async () => {
    if (!pwForm.newPw || pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match.'); return; }
    if (pwForm.newPw.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    const ok = await updatePassword(pwForm.newPw);
    if (ok) setPwForm({ current:'', newPw:'', confirm:'' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="heading-lg mb-2">Account Settings</h1>
        <p className="text-muted text-sm mb-8">Manage your profile, security and preferences</p>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-56 shrink-0">
            {/* Avatar */}
            <div className="card p-5 mb-4 text-center">
              <div className="relative inline-block mb-3">
                <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center text-2xl font-bold text-[var(--text)]">
                  {initials(profile?.full_name || profile?.email || 'U')}
                </div>
                <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--bg-card)] border border-[var(--border)] rounded-full flex items-center justify-center hover:bg-brand-500 transition-colors">
                  <Camera size={12} className="text-[var(--text-muted)]" />
                </button>
              </div>
              <p className="font-semibold text-[var(--text)] text-sm">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-[var(--text)]/40 mt-0.5">{profile?.email}</p>
              <span className={`badge mt-2 capitalize ${role === 'admin' ? 'badge-red' : role === 'provider' ? 'badge-blue' : 'badge-gray'}`}>
                {role}
              </span>
            </div>

            {/* Nav */}
            <div className="card overflow-hidden">
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium capitalize transition-all border-l-2 ${
                    tab === t ? 'border-brand-500 bg-brand-500/8 text-brand-300' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/3'
                  }`}>
                  {t === 'profile'       && <User size={15} />}
                  {t === 'security'      && <Lock size={15} />}
                  {t === 'notifications' && <Bell size={15} />}
                  {t === 'payment'       && <CreditCard size={15} />}
                  {t}
                </button>
              ))}
              <div className="divider mx-4" />
              <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/8 transition-colors">
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">

            {/* Profile tab */}
            {tab === 'profile' && (
              <div className="card p-6" style={{animation:'fadeUp .4s ease'}}>
                <h2 className="heading-sm mb-5">Personal Information</h2>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={14} />
                      <input value={form.full_name} onChange={e => setForm({...form, full_name:e.target.value})}
                        className="input pl-9" placeholder="Your full name" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={14} />
                      <input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})}
                        className="input pl-9" placeholder="+233 24 000 0000" type="tel" />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={14} />
                      <input value={profile?.email || ''} className="input pl-9 opacity-50 cursor-not-allowed" disabled />
                    </div>
                    <p className="text-xs text-[var(--text)]/25 mt-1.5">Email cannot be changed after registration.</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text)]/25" size={14} />
                      <input value={form.location} onChange={e => setForm({...form, location:e.target.value})}
                        className="input pl-9" placeholder="e.g. East Legon, Accra" />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Bio (optional)</label>
                    <textarea value={form.bio} onChange={e => setForm({...form, bio:e.target.value})}
                      className="input resize-none h-20" placeholder="Tell us a bit about yourself…" />
                  </div>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-lg">
                  {saving ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving…</span> : 'Save Changes'}
                </button>
              </div>
            )}

            {/* Security tab */}
            {tab === 'security' && (
              <div className="space-y-5" style={{animation:'fadeUp .4s ease'}}>
                <div className="card p-6">
                  <h2 className="heading-sm mb-5">Change Password</h2>
                  <div className="space-y-4 max-w-sm">
                    <div>
                      <label className="label">Current Password</label>
                      <input type={showPw ? 'text' : 'password'} value={pwForm.current}
                        onChange={e => setPwForm({...pwForm, current:e.target.value})}
                        className="input" placeholder="Current password" />
                    </div>
                    <div>
                      <label className="label">New Password</label>
                      <div className="relative">
                        <input type={showPw ? 'text' : 'password'} value={pwForm.newPw}
                          onChange={e => setPwForm({...pwForm, newPw:e.target.value})}
                          className="input pr-10" placeholder="Min. 8 characters" />
                        <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text)]/30 hover:text-[var(--text-muted)]">
                          {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label">Confirm New Password</label>
                      <input type="password" value={pwForm.confirm}
                        onChange={e => setPwForm({...pwForm, confirm:e.target.value})}
                        className={`input ${pwForm.confirm && pwForm.confirm !== pwForm.newPw ? 'border-red-500/60' : ''}`}
                        placeholder="Repeat new password" />
                      {pwForm.confirm && pwForm.confirm !== pwForm.newPw && (
                        <p className="text-xs text-red-400 mt-1.5">Passwords don't match</p>
                      )}
                    </div>
                    <button onClick={handlePwChange} className="btn btn-primary">Update Password</button>
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="heading-sm mb-4">Security Settings</h2>
                  <div className="space-y-4">
                    {[
                      { label:'Two-Factor Authentication', desc:'Add an extra layer of security', enabled:false },
                      { label:'Login Notifications',       desc:'Get notified of new sign-ins',  enabled:true  },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[var(--text)]">{item.label}</p>
                          <p className="text-xs text-[var(--text)]/40 mt-0.5">{item.desc}</p>
                        </div>
                        <button onClick={() => toast.success('Setting updated!')}
                          className={`relative w-11 h-6 rounded-full transition-colors ${item.enabled ? 'bg-brand-500' : 'bg-[var(--bg-card)]'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${item.enabled ? 'left-5.5 translate-x-full' : 'left-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="divider" />
                  <button onClick={() => toast.success('All other sessions logged out!')} className="text-sm text-red-400 hover:text-red-300 transition-colors">
                    Sign out of all other devices
                  </button>
                </div>
              </div>
            )}

            {/* Notifications tab */}
            {tab === 'notifications' && (
              <div className="card p-6" style={{animation:'fadeUp .4s ease'}}>
                <h2 className="heading-sm mb-5">Notification Preferences</h2>
                <div className="space-y-5">
                  {Object.entries(notifs).map(([key, val]) => {
                    const labels = {
                      orders:'Order & delivery updates', bookings:'Booking confirmations & reminders',
                      promos:'Promotions & flash deals', messages:'New messages from providers/customers',
                      system:'System announcements & policy updates',
                    };
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[var(--text)] capitalize">{key === 'promos' ? 'Promotions' : key}</p>
                          <p className="text-xs text-[var(--text)]/40 mt-0.5">{labels[key]}</p>
                        </div>
                        <button onClick={() => { setNotifs(n => ({...n, [key]:!val})); toast.success('Preference saved!'); }}
                          className={`relative w-11 h-6 rounded-full transition-colors ${val ? 'bg-brand-500' : 'bg-[var(--bg-card)] border border-[var(--border)]'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${val ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment tab */}
            {tab === 'payment' && (
              <div className="space-y-5" style={{animation:'fadeUp .4s ease'}}>
                <div className="card p-6">
                  <h2 className="heading-sm mb-5">SP Wallet</h2>
                  <div className="bg-gradient-to-br from-brand-600/20 to-brand-900/10 border border-brand-500/20 rounded-2xl p-6 text-center mb-5">
                    <p className="text-[var(--text-muted)] text-sm mb-1">Available Balance</p>
                    <p className="font-display text-4xl font-bold text-[var(--text)]">GH₵450.00</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => toast.success('Top-up flow opening…')} className="btn btn-primary flex-1">Top Up</button>
                    <button onClick={() => toast.success('Withdrawal flow opening…')} className="btn btn-secondary flex-1">Withdraw</button>
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="heading-sm mb-5">Payment Methods</h2>
                  <div className="space-y-3">
                    {[
                      { icon:'📱', name:'MTN Mobile Money', detail:'+233 24 ***-0000', active:true },
                      { icon:'💳', name:'Visa Card', detail:'•••• •••• •••• 1234', active:false },
                    ].map((pm, i) => (
                      <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border ${pm.active ? 'border-brand-500/40 bg-brand-500/5' : 'border-white/8 bg-[var(--bg-card)]'}`}>
                        <span className="text-2xl">{pm.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[var(--text)]">{pm.name}</p>
                          <p className="text-xs text-[var(--text)]/40">{pm.detail}</p>
                        </div>
                        {pm.active && <span className="badge badge-green">Default</span>}
                        <button onClick={() => toast.success('Payment method updated!')} className="text-xs text-[var(--text)]/40 hover:text-brand-400 transition-colors">Edit</button>
                      </div>
                    ))}
                    <button onClick={() => toast.success('Add payment method coming soon!')} className="w-full border-2 border-dashed border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text)]/40 hover:border-brand-500/40 hover:text-[var(--text-muted)] transition-all">
                      + Add Payment Method
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
