import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Store, Phone, Mail, MessageSquare, Bell, LogOut, Trash2, Plus, Clock, Save, X, Edit, Copy, ChevronRight, Lock, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

export default function ProviderSettingsModule({ profile, providerProfile, setProviderProfile }) {
  const [activeTab, setActiveTab] = useState('business');
  const [saving, setSaving] = useState(false);
  const { signOut } = useAuthStore();

  const TABS = [
    { id: 'personal', label: 'Personal details', icon: User },
    { id: 'business', label: 'Business details & Stores', icon: Store },
    { id: 'phone', label: 'Add phone number', icon: Phone },
    { id: 'email', label: 'Change email', icon: Mail },
    { id: 'privacy', label: 'Disable chats & feedback', icon: MessageSquare },
    { id: 'notifications', label: 'Manage notifications', icon: Bell },
    { id: 'delete', label: 'Delete my account permanently', icon: Trash2 },
  ];

  const updateProfile = async (table, updates) => {
    setSaving(true);
    try {
      const { error } = await supabase.from(table).update(updates).eq('id', profile.id);
      if (error) throw error;
      toast.success('Settings updated securely');
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to update settings');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-fade-in">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 shrink-0">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm sticky top-24">
          <div className="p-4 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <LogOut size={16} className="text-[var(--text-muted)] rotate-180" /> Settings
            </h3>
          </div>
          <div className="flex flex-col p-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 text-sm font-medium rounded-xl flex items-center justify-between transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-sm'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg)] border border-transparent hover:text-[var(--text)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <tab.icon size={16} className={activeTab === tab.id ? 'text-brand-400' : 'text-[var(--text)]/40'} />
                  {tab.label}
                </div>
                {activeTab === tab.id && <ChevronRight size={14} />}
              </button>
            ))}
          </div>
          
          <div className="p-4 border-t border-[var(--border)] flex justify-between">
            <button onClick={signOut} className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 pb-12">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[500px]">
          
          {/* BUSINESS / STORES */}
          {activeTab === 'business' && (
            <BusinessSettings 
              profile={profile} 
              providerProfile={providerProfile} 
              setProviderProfile={setProviderProfile} 
              updateProfile={updateProfile}
              saving={saving}
            />
          )}

          {/* PRIVACY */}
          {activeTab === 'privacy' && (
            <PrivacySettings profile={profile} updateProfile={updateProfile} saving={saving} />
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <NotificationSettings profile={profile} updateProfile={updateProfile} saving={saving} />
          )}

          {/* PLACEHOLDERS */}
          {['personal', 'phone', 'email', 'delete'].includes(activeTab) && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-[var(--bg-input)] rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                <Lock size={24} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Security Portal</h3>
              <p className="text-[var(--text-muted)] text-sm max-w-sm mx-auto">
                Account credential management is currently linked to your central Supabase Authentication provider identity.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 1. BUSINESS SETTINGS BLOCK
// ────────────────────────────────────────────────────────────────────────
function BusinessSettings({ profile, providerProfile, setProviderProfile, updateProfile, saving }) {
  const [bizForm, setBizForm] = useState(profile.business_details || {});
  const [stores, setStores] = useState(profile.stores || []);
  const [delivery, setDelivery] = useState(profile.delivery_options || []);

  const [editingStore, setEditingStore] = useState(null);

  const saveDetails = async () => {
    const success = await updateProfile('profiles', { business_details: bizForm });
    if (success) {
      if (providerProfile) {
        await updateProfile('provider_profiles', { business_name: bizForm.name || providerProfile.business_name });
      }
    }
  };

  const handleStoreSave = async (storeObj) => {
    let updatedStores;
    if (storeObj.id) {
      updatedStores = stores.map(s => s.id === storeObj.id ? storeObj : s);
    } else {
      updatedStores = [...stores, { ...storeObj, id: 'store_' + Date.now() }];
    }
    const success = await updateProfile('profiles', { stores: updatedStores });
    if (success) {
      setStores(updatedStores);
      setEditingStore(null);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* 1. Global Details */}
      <div>
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">Company name, description & links</h2>
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="text-xs text-[var(--text-muted)] uppercase font-semibold mb-1 block">Business Name</label>
            <input value={bizForm.name || providerProfile?.business_name || profile?.full_name || ''} 
                   onChange={e => setBizForm({...bizForm, name: e.target.value})} className="input w-full" />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] uppercase font-semibold mb-1 block">About Company</label>
            <textarea value={bizForm.about || providerProfile?.description || ''} onChange={e => setBizForm({...bizForm, about: e.target.value})} 
                      className="input w-full resize-none h-24" placeholder="Brief professional description..." />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] uppercase font-semibold mb-1 block">Custom URL / Links</label>
            <input value={bizForm.link || ''} onChange={e => setBizForm({...bizForm, link: e.target.value})} 
                   className="input w-full" placeholder="https://instagram.com/mybusiness" />
          </div>
          <button onClick={saveDetails} disabled={saving} className="btn bg-[var(--text)] text-[var(--bg)] hover:bg-[var(--text)]/90 px-6 font-semibold shadow-md">
            Save Details
          </button>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent w-full" />

      {/* 2. Store Manager */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--text)]">Store address and business hours</h2>
          {!editingStore && (
            <button onClick={() => setEditingStore({ hours: {} })} className="btn btn-secondary btn-sm gap-1.5 text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 border-brand-500/20">
              <Plus size={14} /> Add new store
            </button>
          )}
        </div>
        
        {editingStore ? (
          <StoreEditor initialData={editingStore} onSave={handleStoreSave} onCancel={() => setEditingStore(null)} saving={saving} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {stores.length === 0 && <p className="text-sm text-[var(--text-muted)] italic">No stores added yet. You can list items generally, or bind them to specific physical stores.</p>}
            {stores.map((s) => (
              <div key={s.id} className="p-4 border border-[var(--border)] rounded-xl bg-[var(--bg)] hover:border-brand-500/30 transition-colors group relative">
                <button onClick={() => setEditingStore(s)} className="absolute top-3 right-3 p-1.5 bg-[var(--bg-card)] rounded-lg text-[var(--text-muted)] hover:text-brand-400 border border-[var(--border)] md:opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                  <Edit size={14} />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
                    <Store size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text)]">{s.name}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{s.region} • {s.address}</p>
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border)]/50 flex flex-wrap gap-2">
                  <span className="flex items-center gap-1"><Clock size={11} className="text-emerald-500" /> Mon-Fri: 09:00 - 18:00</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent w-full" />
      
      {/* 3. Delivery Configuration */}
      <div>
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">My delivery configuration</h2>
        <div className="p-4 rounded-xl border border-dashed border-brand-500/30 bg-brand-500/5 max-w-lg">
          <p className="text-sm text-brand-400/80 mb-2 font-medium">Coming Soon</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Personalized delivery zones (e.g. setting custom shipping fees per region) will be unlocked in the logistics module update. Currently, standard platform courier rates apply.
          </p>
        </div>
      </div>
    </div>
  );
}

// Sub-Component for Store Editing
function StoreEditor({ initialData, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ name: '', region: '', address: '', tips: '', hours: {}, ...initialData });
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day) => {
    const newHours = { ...form.hours };
    if (newHours[day]) {
      delete newHours[day];
    } else {
      newHours[day] = { from: '09:00', to: '18:00' };
    }
    setForm({ ...form, hours: newHours });
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 shadow-sm max-w-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-brand-500" />
      <h3 className="text-base font-bold text-[var(--text)] mb-4">{form.id ? 'Edit Store' : 'Add New Store'}</h3>
      
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="text-xs text-[var(--text-muted)] uppercase font-semibold mb-1 block">Store Name</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input w-full" placeholder="Main Branch" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] uppercase font-semibold mb-1 block">Region</label>
          <input value={form.region} onChange={e => setForm({...form, region: e.target.value})} className="input w-full" placeholder="Greater Accra" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-[var(--text-muted)] uppercase font-semibold mb-1 block">Full Address</label>
          <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input w-full" placeholder="123 Example Street" />
        </div>
      </div>

      <div className="mb-6">
        <label className="text-xs text-[var(--text)] uppercase font-bold mb-3 block flex items-center gap-2">
          <Clock size={13} className="text-brand-400" /> Business hours
        </label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => (
            <button key={day} onClick={() => toggleDay(day)} type="button" 
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      form.hours[day] 
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500' 
                        : 'bg-[var(--bg-input)] border-transparent text-[var(--text-muted)]'
                    }`}>
              {day}
            </button>
          ))}
        </div>
        
        {/* Mock detailed hour inputs if selected */}
        {Object.keys(form.hours).length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex flex-wrap items-center gap-4">
            <span className="text-xs font-medium text-[var(--text-muted)]">Selected days open from</span>
            <input type="time" defaultValue="09:00" className="input py-1 text-sm bg-[var(--bg-card)] max-w-28" />
            <span className="text-xs font-medium text-[var(--text-muted)]">to</span>
            <input type="time" defaultValue="18:00" className="input py-1 text-sm bg-[var(--bg-card)] max-w-28" />
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
        <button onClick={onCancel} className="btn btn-ghost px-5">Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.name} className="btn btn-primary px-8">Save Store</button>
      </div>
    </div>
  );
}


// ────────────────────────────────────────────────────────────────────────
// 2. PRIVACY SETTINGS BLOCK
// ────────────────────────────────────────────────────────────────────────
function PrivacySettings({ profile, updateProfile, saving }) {
  const [form, setForm] = useState(profile.privacy_settings || { disable_chats: false, disable_feedback: false });

  const handleToggle = async (field) => {
    const updated = { ...form, [field]: !form[field] };
    setForm(updated);
    await updateProfile('profiles', { privacy_settings: updated });
  };

  return (
    <div className="space-y-8 max-w-xl animate-fade-in">
      <h2 className="text-xl font-bold text-[var(--text)] mb-2">Disable chats & feedback</h2>
      
      {/* Chats */}
      <div className="p-5 border border-[var(--border)] rounded-2xl bg-[var(--bg)]">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="font-bold text-[var(--text)] text-base">Receive direct chats</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Chats help your customers get in touch through messages on SuperPlatform. 
              Disabling this forces buyers to contact you via phone directly.
            </p>
          </div>
          <button 
            onClick={() => handleToggle('disable_chats')} 
            className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors shrink-0 ${!form.disable_chats ? 'bg-emerald-500' : 'bg-[var(--bg-input)]'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${!form.disable_chats ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        {form.disable_chats && (
          <div className="mt-3 p-2 rounded text-xs text-orange-400 bg-orange-400/5 border border-orange-400/20 font-medium">
            ⚠️ You are completely unreachable via the direct messaging platform.
          </div>
        )}
      </div>

      {/* Feedback */}
      <div className="p-5 border border-[var(--border)] rounded-2xl bg-[var(--bg)] opacity-70 cursor-not-allowed filter grayscale-[30%]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-[var(--text)] text-base line-through opacity-70">Disable customer feedback</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1 mb-3">
              Prevent past customers from leaving public ratings on your profile.
            </p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 text-xs font-bold uppercase tracking-wider border border-yellow-500/30">
              <Lock size={12} /> VIP / Enterprise Only
            </span>
          </div>
          <div className="w-12 h-6 rounded-full bg-[var(--bg-input)] flex items-center p-1 shrink-0">
            <div className="w-4 h-4 rounded-full bg-gray-400/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 3. NOTIFICATION SETTINGS BLOCK
// ────────────────────────────────────────────────────────────────────────
function NotificationSettings({ profile, updateProfile, saving }) {
  const [form, setForm] = useState(profile.notification_settings || { alerts: true, promo: true, tips: false });
  const NTF = [
    { k: 'alerts', v: 'Account & Booking Alerts', d: 'Crucial info about your listings, ride requests, and customer bookings.' },
    { k: 'promo', v: 'Hot Deals & Premium Features', d: 'Personalized recommendations and marketplace promotions.' },
    { k: 'tips', v: 'Seller Coaching & Tips', d: 'Guidance on how to optimize your store configurations.' }
  ];

  const toggle = async (k) => {
    const updated = { ...form, [k]: !form[k] };
    setForm(updated);
    await updateProfile('profiles', { notification_settings: updated });
  };

  return (
    <div className="space-y-6 max-w-xl animate-fade-in">
      <h2 className="text-xl font-bold text-[var(--text)] mb-2">Manage notifications</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">Contol exactly what emails and push notifications we send to you.</p>

      <div className="space-y-4">
        {NTF.map(n => (
          <div key={n.k} onClick={() => toggle(n.k)} className="flex items-center justify-between p-4 border border-[var(--border)] hover:border-brand-500/30 rounded-xl bg-[var(--bg)] cursor-pointer transition-colors">
            <div className="pr-4">
              <h4 className="font-semibold text-sm text-[var(--text)]">{n.v}</h4>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{n.d}</p>
            </div>
            {/* Checkbox */}
            <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${
              form[n.k] ? 'bg-brand-500 border-brand-500 text-white' : 'border-[var(--text)]/20 text-transparent'
            }`}>
              <Check size={12} strokeWidth={3} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
