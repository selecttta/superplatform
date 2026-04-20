import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, Package, Clock, DollarSign, Star, AlertCircle, MapPin,
  Check, Plus, Eye, ToggleLeft, ToggleRight, TrendingUp, Navigation,
  Edit, Trash2, Bell, Settings, Calendar, MessageCircle, X, Save,
  ChevronDown, BarChart2, PieChart, Award, Layers, ShoppingCart
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useListings } from '../hooks/useListings';
import { useBookings } from '../hooks/useBookings';
import { useWallet } from '../hooks/useWallet';
import { useImageUpload } from '../hooks/useImageUpload';
import { supabase } from '../lib/supabase';
import { fmt, fmtDate, STATUS_COLORS } from '../utils/helpers';
import { CATEGORIES } from '../lib/constants';
import toast from 'react-hot-toast';
import ProviderSettingsModule from '../components/dashboard/ProviderSettingsModule';

const ONBOARDING_STEPS = ['Business Info', 'Category & Services', 'ID Verification', 'Submit for Review'];

// ─── Location Autocomplete (OpenStreetMap Nominatim, free/no key) ─────────────
function LocationInput({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback(async (q) => {
    if (q.length < 3) { setResults([]); return; }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=gh&limit=5&q=${encodeURIComponent(q)}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setResults(data.map(d => ({ label: d.display_name.split(',').slice(0, 3).join(', '), full: d.display_name })));
      setOpen(true);
    } catch { setResults([]); }
  }, []);

  const handleInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 400);
  };

  const select = (label) => {
    setQuery(label);
    onChange(label);
    setResults([]);
    setOpen(false);
  };

  const useGPS = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data = await res.json();
          const addr = data.display_name?.split(',').slice(0, 3).join(', ') || 'Current Location';
          setQuery(addr);
          onChange(addr);
        } catch { toast.error('Could not resolve location'); }
        setLocating(false);
      },
      () => { toast.error('Location access denied'); setLocating(false); }
    );
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/25 z-10 pointer-events-none" size={14} />
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="input pl-10 pr-10"
          placeholder="e.g. East Legon, Accra"
        />
        <button
          type="button"
          onClick={useGPS}
          disabled={locating}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 transition-colors"
          title="Use my current location"
        >
          {locating ? <div className="w-3.5 h-3.5 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" /> : <Navigation size={12} />}
        </button>
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xl">
          {results.map((r, i) => (
            <button key={i} type="button" onMouseDown={() => select(r.label)}
              className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-muted)] hover:bg-white/8 border-b border-[var(--border)] last:border-0 flex items-center gap-2">
              <MapPin size={12} className="text-[var(--text)]/30 shrink-0" />{r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Document Upload Slot ─────────────────────────────────────────────────────
function DocUploadSlot({ label, required, bucket = 'documents', folder = 'id-documents', onUploaded }) {
  const [state, setState] = useState('idle'); // idle | uploading | done | error
  const [preview, setPreview] = useState(null);
  const { upload } = useImageUpload();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB for documents
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, or PDF files are allowed');
      return;
    }
    if (file.size > maxSize) {
      toast.error('File must be under 10MB');
      return;
    }

    setState('uploading');
    const url = await upload(file, bucket, folder);
    if (url) {
      setState('done');
      if (file.type !== 'application/pdf') setPreview(url);
      onUploaded(url);
    } else {
      setState('error');
    }
  };

  return (
    <div className="relative">
      {state === 'idle' && (
        <label className="block border-2 border-dashed border-[var(--border)] rounded-xl p-5 text-center hover:border-brand-500/50 transition-colors cursor-pointer group">
          <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFile} />
          <Upload size={22} className="text-[var(--text)]/25 group-hover:text-brand-400 mx-auto mb-2 transition-colors" />
          <p className="text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--text-muted)]">{label}{required ? ' *' : ''}</p>
          <p className="text-xs text-[var(--text)]/25 mt-1">JPG, PNG or PDF · Max 10 MB</p>
        </label>
      )}

      {state === 'uploading' && (
        <div className="border-2 border-brand-500/30 rounded-xl p-5 flex items-center gap-3 bg-brand-500/5">
          <div className="w-5 h-5 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Uploading…</p>
            <p className="text-xs text-[var(--text)]/40">Please wait</p>
          </div>
        </div>
      )}

      {state === 'done' && (
        <div className="border-2 border-emerald-500/40 rounded-xl p-4 bg-emerald-500/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
              <Check size={13} className="text-[var(--text)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-400">{label.replace(' *', '')} — Upload Complete ✓</p>
            </div>
          </div>
          {preview && <img src={preview} alt="preview" className="w-full h-24 object-cover rounded-lg mt-2 opacity-80" />}
          <button type="button" onClick={() => { setState('idle'); setPreview(null); onUploaded(''); }}
            className="text-xs text-[var(--text)]/30 hover:text-[var(--text-muted)] mt-2 transition-colors">Replace file</button>
        </div>
      )}

      {state === 'error' && (
        <label className="block border-2 border-red-500/40 rounded-xl p-5 text-center cursor-pointer bg-red-500/5">
          <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFile} />
          <AlertCircle size={22} className="text-red-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-red-400">Upload failed — tap to retry</p>
          <p className="text-xs text-[var(--text)]/25 mt-1">{label}{required ? ' (required)' : ''}</p>
        </label>
      )}
    </div>
  );
}

// ─── Simple SVG Line Chart ────────────────────────────────────────────────────
function LineChart({ data, color = '#f97316' }) {
  if (!data.length) return <div className="h-32 flex items-center justify-center text-[var(--text)]/20 text-sm">No data</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 400, H = 100, pad = 10;
  const pts = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (W - 2 * pad);
    const y = H - pad - ((d.value / max) * (H - 2 * pad));
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts.join(' ')} />
      <polygon fill="url(#lg)" points={`${pad},${H} ${pts.join(' ')} ${W - pad},${H}`} />
      {data.map((d, i) => {
        const [x, y] = pts[i].split(',');
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({ profile, onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [biz, setBiz] = useState({
    name: '', category: '', phone: '', location: '', description: '', price: '',
  });
  const [docs, setDocs] = useState({
    idDocument: '', businessReg: '', profilePic: '',
  });

  const idUploaded = !!docs.idDocument;
  const profileUploaded = !!docs.profilePic;
  const step2Valid = idUploaded && profileUploaded;

  const validate = () => {
    if (step === 0) {
      if (!biz.name.trim()) { toast.error('Business name is required.'); return false; }
      if (!biz.phone.trim()) { toast.error('Business phone is required.'); return false; }
      if (!biz.location.trim()) { toast.error('Service location is required.'); return false; }
    }
    if (step === 1) {
      if (!biz.category) { toast.error('Select a service category.'); return false; }
      if (biz.description.trim().length < 20) { toast.error('Please describe your services (at least 20 characters).'); return false; }
    }
    if (step === 2) {
      if (!idUploaded) { toast.error('Ghana Card / Passport upload is required.'); return false; }
      if (!profileUploaded) { toast.error('Profile / Business photo upload is required.'); return false; }
    }
    return true;
  };

  const next = async () => {
    if (!validate()) return;
    if (step < ONBOARDING_STEPS.length - 1) { setStep(s => s + 1); return; }

    // Final step — save to DB
    setSaving(true);
    try {
      // Map frontend category IDs to DB enum values
      const dbCategory = biz.category === 'beauty' ? 'beauty_fashion' : biz.category.replace('-', '_');

      // Upsert provider profile
      const { error } = await supabase.from('provider_profiles').upsert({
        id: profile.id,
        business_name: biz.name,
        business_phone: biz.phone,
        service_areas: [biz.location],
        category: dbCategory,
        categories: [biz.category],
        description: biz.description,
        starting_price: biz.price ? Number(biz.price) : null,
        id_document_url: docs.idDocument,
        business_registration_url: docs.businessReg || null,
        profile_picture_url: docs.profilePic,
        onboarding_submitted_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (error) throw error;

      // Mark profile onboarding as submitted (not approved yet)
      const { error: profileError } = await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', profile.id);
      if (profileError) throw profileError;

      toast.success('Application submitted! We\'ll review within 24–48 hours.');
      onComplete();
    } catch (err) {
      toast.error(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="card p-8">
          {/* Progress */}
          <div className="mb-8">
            <p className="text-brand-400 text-xs font-semibold uppercase tracking-wider mb-1">
              Step {step + 1} of {ONBOARDING_STEPS.length}
            </p>
            <h1 className="heading-md mb-4">{ONBOARDING_STEPS[step]}</h1>
            <div className="flex gap-1.5">
              {ONBOARDING_STEPS.map((_, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${i <= step ? 'bg-brand-500' : 'bg-[var(--bg-input)]'}`} />
              ))}
            </div>
          </div>

          {/* Step 0 — Business Info */}
          {step === 0 && (
            <div className="space-y-4" style={{ animation: 'fadeUp .4s ease' }}>
              <div>
                <label className="label">Business / Brand Name *</label>
                <input value={biz.name} onChange={e => setBiz({ ...biz, name: e.target.value })}
                  className="input" placeholder="e.g. Kwame's Plumbing Services" />
              </div>
              <div>
                <label className="label">Business Phone *</label>
                <input value={biz.phone} onChange={e => setBiz({ ...biz, phone: e.target.value })}
                  className="input" placeholder="+233 24 000 0000" type="tel" />
              </div>
              <div>
                <label className="label">Service Area / Location *</label>
                <LocationInput value={biz.location} onChange={v => setBiz({ ...biz, location: v })} />
                <p className="text-xs text-[var(--text)]/30 mt-1">Type an area or use GPS to auto-fill</p>
              </div>
            </div>
          )}

          {/* Step 1 — Category & Services */}
          {step === 1 && (
            <div className="space-y-4" style={{ animation: 'fadeUp .4s ease' }}>
              <div>
                <label className="label">Service Category *</label>
                <select value={biz.category} onChange={e => setBiz({ ...biz, category: e.target.value })} className="input">
                  <option value="">Select a category…</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Describe Your Services * <span className="text-[var(--text)]/30 font-normal">(min. 20 chars)</span></label>
                <textarea value={biz.description} onChange={e => setBiz({ ...biz, description: e.target.value })}
                  className="input resize-none h-28" placeholder="Describe exactly what you offer, your expertise, and what makes you different…" />
                <p className={`text-xs mt-1 ${biz.description.length < 20 ? 'text-[var(--text)]/30' : 'text-emerald-400'}`}>
                  {biz.description.length} / 20 characters minimum
                </p>
              </div>
              <div>
                <label className="label">Starting Price (GH₵)</label>
                <input value={biz.price} onChange={e => setBiz({ ...biz, price: e.target.value })}
                  type="number" className="input" placeholder="e.g. 100" min="0" />
              </div>
            </div>
          )}

          {/* Step 2 — ID Verification */}
          {step === 2 && (
            <div className="space-y-4" style={{ animation: 'fadeUp .4s ease' }}>
              <div className="bg-brand-500/8 border border-brand-500/20 rounded-xl p-3 text-xs text-brand-300 flex items-start gap-2">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                All documents are encrypted and only accessed by our verification team.
              </div>
              <DocUploadSlot
                label="Ghana Card / Passport"
                required
                bucket="documents"
                onUploaded={url => setDocs(d => ({ ...d, idDocument: url }))}
              />
              <DocUploadSlot
                label="Business Registration"
                required={false}
                bucket="documents"
                onUploaded={url => setDocs(d => ({ ...d, businessReg: url }))}
              />
              <DocUploadSlot
                label="Profile / Business Photo"
                required
                bucket="avatars"
                folder=""
                onUploaded={url => setDocs(d => ({ ...d, profilePic: url }))}
              />
              {!step2Valid && (
                <p className="text-xs text-yellow-400 flex items-center gap-1.5">
                  <AlertCircle size={12} /> Ghana Card and Profile Photo are required to continue
                </p>
              )}
            </div>
          )}

          {/* Step 3 — Submit for Review */}
          {step === 3 && (
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <div className="bg-brand-500/10 border border-brand-500/25 rounded-xl p-5 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-brand-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-brand-300 text-sm">Almost there!</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                      Your profile will be reviewed by our team within 24–48 hours.
                      You <strong className="text-[var(--text)]">cannot publish listings</strong> until approved.
                      You will receive an email notification when approved.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mb-6">
                {[
                  { done: true, text: `Business: ${biz.name}` },
                  { done: true, text: `Category: ${CATEGORIES.find(c => c.id === biz.category)?.name || biz.category}` },
                  { done: true, text: `Location: ${biz.location}` },
                  { done: idUploaded, text: 'ID document uploaded' },
                  { done: profileUploaded, text: 'Profile photo uploaded' },
                  { done: false, text: 'Admin review — pending' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-500' : 'bg-[var(--bg-input)]'}`}>
                      {item.done ? <Check size={11} className="text-[var(--text)]" /> : <Clock size={11} className="text-[var(--text)]/40" />}
                    </div>
                    <span className={item.done ? 'text-[var(--text-muted)]' : 'text-[var(--text)]/35'}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} disabled={saving} className="btn btn-secondary flex-1">← Back</button>
            )}
            <button
              onClick={next}
              disabled={saving || (step === 2 && !step2Valid)}
              className="btn btn-primary flex-1 btn-lg"
            >
              {saving
                ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting…</span>
                : step === ONBOARDING_STEPS.length - 1 ? 'Submit Application 🚀' : 'Continue →'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pending Approval Screen (no demo button) ─────────────────────────────────
function PendingApproval({ profile }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center card p-10">
        <div className="w-16 h-16 bg-yellow-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock size={28} className="text-yellow-400" />
        </div>
        <h2 className="heading-md mb-3">Application Under Review</h2>
        <p className="text-muted text-sm mb-6 leading-relaxed">
          Your provider application has been submitted successfully. Our team is reviewing your information and documents. You'll receive an email notification at <strong className="text-[var(--text)]">{profile?.email}</strong> once approved.
        </p>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 text-left mb-6">
          <p className="text-xs text-[var(--text)]/40 uppercase tracking-wide font-medium mb-3">Review Timeline</p>
          <div className="space-y-3">
            {[
              { done: true, text: 'Application submitted' },
              { done: true, text: 'Documents received' },
              { done: false, text: 'Background check in progress' },
              { done: false, text: 'Admin review (24–48 hrs)' },
              { done: false, text: 'Activation email will be sent' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${s.done ? 'bg-emerald-500' : 'bg-[var(--bg-input)]'}`}>
                  {s.done ? <Check size={10} className="text-[var(--text)]" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                </div>
                <span className={`text-sm ${s.done ? 'text-[var(--text-muted)]' : 'text-[var(--text)]/30'}`}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-[var(--text)]/30">
          Need help? Contact us at <span className="text-brand-400">support@superplatformgh.com</span>
        </p>
      </div>
    </div>
  );
}

// ─── Edit Listing Modal ────────────────────────────────────────────────────────
function EditListingModal({ listing, onSave, onClose }) {
  const [form, setForm] = useState({ title: listing.title, price: listing.price, description: listing.description || '' });
  const handleSave = () => {
    if (!form.title || !form.price) { toast.error('Title and price are required.'); return; }
    onSave({ ...listing, ...form, price: Number(form.price) });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
      <div className="w-full max-w-md card p-6" style={{ animation: 'fadeUp .3s ease' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="heading-sm">Edit Listing</h3>
          <button onClick={onClose} className="btn btn-ghost p-2"><X size={18} /></button>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-3 mb-5 flex items-start gap-2">
          <AlertCircle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300 leading-relaxed">
            Editing requires <strong>admin re-approval</strong> before customers can see changes. Your listing will be temporarily hidden.
          </p>
        </div>
        <div className="space-y-4">
          <div><label className="label">Title *</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" /></div>
          <div><label className="label">Price (GH₵) *</label><input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} type="number" className="input" /></div>
          <div><label className="label">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input resize-none h-20" /></div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} className="btn btn-primary flex-1 gap-2"><Save size={14} /> Save & Submit for Review</button>
        </div>
      </div>
    </div>
  );
}

// ─── Provider Main Dashboard ──────────────────────────────────────────────────
function ProviderMain({ profile }) {
  const [tab, setTab] = useState('overview');
  const [online, setOnline] = useState(true);
  const [showAddListing, setShowAddListing] = useState(false);
  const [newListing, setNewListing] = useState({ title: '', price: '', description: '' });
  const [editListing, setEditListing] = useState(null);
  const [earningsPeriod, setEarningsPeriod] = useState('month');
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [providerProfile, setProviderProfile] = useState(null);

  const { listings, loading: listLoading, createListing, updateListing } = useListings();
  const { bookings, loading: bkLoading } = useBookings({ providerId: profile?.id });
  const { balance, transactions: walletTx, loading: walLoading } = useWallet();

  // Load provider_profile for category info
  useEffect(() => {
    if (!profile?.id) return;
    supabase.from('provider_profiles').select('*').eq('id', profile.id).single()
      .then(({ data }) => setProviderProfile(data));
  }, [profile?.id]);

  // ── Category-based tab visibility ─────────────────────────────────────────
  const myCategories = providerProfile?.categories || [];
  const hasServiceCategories = myCategories.some(c => ['beauty', 'health', 'home_services', 'transport', 'real_estate', 'rentals'].includes(c));
  const hasEcommerce = myCategories.includes('ecommerce');
  const hasTransport = myCategories.includes('transport');
  const hasProperty = myCategories.some(c => ['real_estate', 'rentals'].includes(c));

  const TABS = [
    'overview',
    ...(hasEcommerce ? ['products', 'orders'] : []),
    ...(hasServiceCategories ? ['bookings', 'services'] : []),
    ...(hasTransport ? ['rides'] : []),
    ...(hasProperty ? ['properties'] : []),
    'reviews',
    'earnings',
    'messages',
    'settings',
  ];

  // ── Additional data for new tabs ──────────────────────────────────────────
  const [providerOrders, setProviderOrders] = useState([]);
  const [providerRides, setProviderRides] = useState([]);
  const [providerProperties, setProviderProperties] = useState([]);
  const [providerReviews, setProviderReviews] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    const loadExtras = async () => {
      setTabLoading(true);
      try {
        const [
          { data: ordData },
          { data: rideData },
          { data: propData },
          { data: revData },
        ] = await Promise.all([
          supabase.from('orders').select('*, profiles!orders_customer_id_fkey(full_name)').eq('provider_id', profile.id).order('created_at', { ascending: false }).limit(100),
          supabase.from('rides').select('*, profiles!rides_passenger_id_fkey(full_name)').eq('driver_id', profile.id).order('created_at', { ascending: false }).limit(100),
          supabase.from('listings').select('*').eq('provider_id', profile.id).in('category', ['real-estate', 'rentals']).order('created_at', { ascending: false }).limit(100),
          supabase.from('reviews').select('*, profiles!reviews_reviewer_id_fkey(full_name)').eq('provider_id', profile.id).order('created_at', { ascending: false }).limit(50),
        ]);
        setProviderOrders(ordData || []);
        setProviderRides(rideData || []);
        setProviderProperties(propData || []);
        setProviderReviews(revData || []);
      } catch (err) {
        console.error('Provider tab data error:', err);
      } finally {
        setTabLoading(false);
      }
    };
    loadExtras();
  }, [profile?.id]);

  // ── Earnings calculations ──────────────────────────────────────────────────
  const now = new Date();
  const filterMap = {
    today: t => new Date(t.created_at).toDateString() === now.toDateString(),
    week: t => (now - new Date(t.created_at)) < 7 * 86400000,
    month: t => new Date(t.created_at).getMonth() === now.getMonth() && new Date(t.created_at).getFullYear() === now.getFullYear(),
    year: t => new Date(t.created_at).getFullYear() === now.getFullYear(),
  };
  const filteredTx = walletTx.filter(t => Number(t.amount) > 0 && filterMap[earningsPeriod](t));
  const totalPeriod = filteredTx.reduce((s, t) => s + Number(t.amount), 0);
  const totalAll = walletTx.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
  const totalJobs = bookings.filter(b => b.status === 'completed').length;

  // Build chart data (last 7 days for week/day, last 12 months for year, last 30 days for month)
  const buildChartData = () => {
    if (earningsPeriod === 'today') {
      return Array.from({ length: 24 }, (_, h) => ({
        label: `${h}:00`,
        value: walletTx.filter(t => Number(t.amount) > 0 && new Date(t.created_at).getHours() === h && filterMap.today(t)).reduce((s, t) => s + Number(t.amount), 0),
      })).filter((_, i) => i % 3 === 0);
    }
    if (earningsPeriod === 'week' || earningsPeriod === 'month') {
      const days = earningsPeriod === 'week' ? 7 : 30;
      return Array.from({ length: days }, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - (days - 1 - i));
        return {
          label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          value: walletTx.filter(t => Number(t.amount) > 0 && new Date(t.created_at).toDateString() === d.toDateString()).reduce((s, t) => s + Number(t.amount), 0),
        };
      }).filter((_, i) => earningsPeriod === 'week' || i % 5 === 0);
    }
    return Array.from({ length: 12 }, (_, i) => ({
      label: new Date(now.getFullYear(), i).toLocaleDateString('en', { month: 'short' }),
      value: walletTx.filter(t => Number(t.amount) > 0 && new Date(t.created_at).getMonth() === i && new Date(t.created_at).getFullYear() === now.getFullYear()).reduce((s, t) => s + Number(t.amount), 0),
    }));
  };

  const handleAddListing = async () => {
    if (!newListing.title || !newListing.price) { toast.error('Fill in title and price.'); return; }
    const data = await createListing({
      title: newListing.title,
      price: Number(newListing.price),
      description: newListing.description,
      category: myCategories[0] || 'general',
      status: 'pending',
    });
    if (data) {
      setNewListing({ title: '', price: '', description: '' });
      setShowAddListing(false);
      toast.success('Listing submitted for admin review!');
    }
  };

  const handleEditSave = async (updated) => {
    await updateListing(updated.id, { title: updated.title, price: Number(updated.price), description: updated.description, status: 'pending' });
    toast.success('Listing updated! Awaiting re-approval.');
  };

  const addCategory = async (catId) => {
    if (myCategories.includes(catId)) { toast('Already added'); return; }
    const updated = [...myCategories, catId];
    await supabase.from('provider_profiles').update({ categories: updated }).eq('id', profile.id);
    setProviderProfile(p => ({ ...p, categories: updated }));
    toast.success('Category added! New tabs are now available.');
    setAddCategoryOpen(false);
  };

  const statusBadge = s => ({
    active: 'badge-green',
    pending: 'badge-yellow',
    approved: 'badge-green',
    rejected: 'badge-red',
    paused: 'badge-gray',
  }[s] || 'badge-gray');

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="heading-md">{providerProfile?.business_name || profile?.full_name || 'Provider Dashboard'}</h1>
              {profile?.is_approved
                ? <span className="badge badge-green">✓ Approved</span>
                : <span className="badge badge-yellow">⏳ Pending Approval</span>
              }
            </div>
            <p className="text-muted text-sm flex items-center gap-2">
              <span>{profile?.phone || providerProfile?.phone || 'No phone'}</span>
              <span>•</span>
              {myCategories.length > 0
                ? myCategories.map(c => CATEGORIES.find(x => x.id === c)?.name || c).join(' · ')
                : 'Provider Dashboard'
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setOnline(!online)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${online ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)]'}`}>
              {online ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {online ? 'Online' : 'Offline'}
            </button>
            <button onClick={() => setShowAddListing(true)} className="btn btn-primary">
              <Plus size={16} /> Add Listing
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${tab === t ? 'bg-brand-500 text-[var(--text)] shadow-lg shadow-brand-500/25' : 'glass text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/8'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Earnings', value: fmt(totalAll), color: 'text-emerald-400' },
                { label: 'This Month', value: fmt(walletTx.filter(t => Number(t.amount) > 0 && filterMap.month(t)).reduce((s, t) => s + Number(t.amount), 0)), color: 'text-brand-400' },
                { label: 'Completed Jobs', value: String(totalJobs || 0), color: 'text-blue-400' },
                { label: 'Wallet Balance', value: fmt(balance), color: 'text-yellow-400' },
              ].map((s, i) => (
                <div key={i} className="card p-5">
                  <p className="text-xs text-[var(--text)]/40 uppercase tracking-wide mb-2">{s.label}</p>
                  <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Revenue chart preview */}
            <div className="card p-6 mb-6">
              <h3 className="heading-sm mb-1">Revenue This Month</h3>
              <p className="text-xs text-[var(--text)]/30 mb-4">From wallet transactions</p>
              <LineChart data={buildChartData()} />
            </div>

            {/* Upcoming bookings */}
            <h3 className="heading-sm mb-4">Upcoming Bookings</h3>
            {bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length === 0 ? (
              <div className="card p-8 text-center text-[var(--text)]/30">
                <Calendar size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No upcoming bookings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).map(b => (
                  <div key={b.id} className="card p-4 flex flex-wrap items-center gap-4">
                    <div className="w-10 h-10 bg-[var(--bg-card)] rounded-full flex items-center justify-center font-bold shrink-0">
                      {(b.profiles?.full_name || '?')[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--text)]">{b.profiles?.full_name || 'Customer'}</p>
                      <p className="text-sm text-[var(--text)]/40">{b.scheduled_date || '—'}</p>
                    </div>
                    <span className="badge badge-orange">{b.status}</span>
                    <span className="font-bold text-[var(--text)]">{fmt(b.quoted_price || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LISTINGS / PRODUCTS / SERVICES (shared) ── */}
        {(tab === 'products' || tab === 'services' || tab === 'listings') && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="heading-sm">My Listings ({listings.length})</h2>
              <button onClick={() => setShowAddListing(true)} className="btn btn-primary btn-sm"><Plus size={14} /> Add</button>
            </div>
            <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-xl p-3 mb-4 text-xs text-yellow-300 flex items-center gap-2">
              <AlertCircle size={13} />
              <span>All new listings require <strong>admin approval</strong> before customers can see them.</span>
            </div>
            {listLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card h-20 animate-pulse bg-[var(--bg-card)]" />)}</div>
            ) : listings.length === 0 ? (
              <div className="text-center py-20 text-[var(--text)]/30">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p>No listings yet. Add your first one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {listings.map(l => (
                  <div key={l.id} className="card p-5 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-48">
                      <p className="font-semibold text-[var(--text)]">{l.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text)]/40">
                        <span>{fmt(l.price)}</span>
                        {l.rating > 0 && <span>· ★ {l.rating}</span>}
                      </div>
                    </div>
                    <span className={`badge ${statusBadge(l.status || l.moderation_status)}`}>
                      {l.moderation_status || l.status || 'pending'}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => setEditListing(l)} className="btn btn-ghost btn-sm"><Edit size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BOOKINGS ── */}
        {tab === 'bookings' && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <h2 className="heading-sm mb-5">All Bookings</h2>
            {bkLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card p-5 h-24 animate-pulse bg-[var(--bg-card)]" />)}</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-20 text-[var(--text)]/30">
                <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                <p>No bookings yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map(b => (
                  <div key={b.id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-[var(--text)]">{b.profiles?.full_name || 'Customer'}</p>
                        <p className="text-sm text-[var(--text)]/40">{b.scheduled_date ? fmtDate(b.scheduled_date) : '—'}</p>
                      </div>
                      <span className={`badge ${b.status === 'completed' ? 'badge-green' : 'badge-orange'}`}>{b.status}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text)]/40">{b.scheduled_time || ''}</span>
                      <span className="font-bold text-[var(--text)]">{fmt(b.quoted_price || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── EARNINGS ── */}
        {tab === 'earnings' && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            {/* Period filter */}
            <div className="flex gap-2 mb-6">
              {['today', 'week', 'month', 'year'].map(p => (
                <button key={p} onClick={() => setEarningsPeriod(p)}
                  className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${earningsPeriod === p ? 'bg-brand-500 text-[var(--text)]' : 'glass text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                  {p}
                </button>
              ))}
            </div>

            {/* Total for period */}
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <div className="card p-6 text-center">
                <p className="text-xs text-[var(--text)]/40 uppercase tracking-wide mb-2">
                  {earningsPeriod === 'today' ? 'Today' : earningsPeriod === 'week' ? 'This Week' : earningsPeriod === 'month' ? 'This Month' : 'This Year'}
                </p>
                <p className="font-display text-3xl font-bold text-emerald-400">{fmt(totalPeriod)}</p>
              </div>
              <div className="card p-6 text-center">
                <p className="text-xs text-[var(--text)]/40 uppercase tracking-wide mb-2">Wallet Balance</p>
                <p className="font-display text-3xl font-bold text-brand-400">{fmt(balance)}</p>
              </div>
              <div className="card p-6 text-center">
                <p className="text-xs text-[var(--text)]/40 uppercase tracking-wide mb-2">All-Time Earned</p>
                <p className="font-display text-3xl font-bold text-[var(--text-muted)]">{fmt(totalAll)}</p>
              </div>
            </div>

            {/* Revenue chart */}
            <div className="card p-6 mb-6">
              <h3 className="heading-sm mb-1">Revenue — {earningsPeriod.charAt(0).toUpperCase() + earningsPeriod.slice(1)}</h3>
              <p className="text-xs text-[var(--text)]/30 mb-4">Based on wallet credits</p>
              <LineChart data={buildChartData()} />
              <div className="flex gap-4 mt-4 overflow-x-auto">
                {buildChartData().map((d, i) => (
                  <div key={i} className="text-center shrink-0">
                    <p className="text-xs text-[var(--text)]/40">{d.label}</p>
                    {d.value > 0 && <p className="text-xs font-medium text-[var(--text)]">{fmt(d.value)}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction history */}
            <div className="card p-6">
              <h3 className="heading-sm mb-4">Transaction History</h3>
              {walLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse bg-[var(--bg-card)] rounded-xl" />)}</div>
              ) : walletTx.length === 0 ? (
                <p className="text-[var(--text)]/30 text-sm text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {walletTx.slice(0, 20).map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card)] text-sm">
                      <div>
                        <p className="text-[var(--text)]">{t.description || t.type}</p>
                        <p className="text-xs text-[var(--text)]/40">{new Date(t.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`font-bold ${Number(t.amount) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {Number(t.amount) > 0 ? '+' : ''}{fmt(Math.abs(Number(t.amount)))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MESSAGES ── */}
        {tab === 'messages' && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <h2 className="heading-sm mb-2">Messages</h2>
            <p className="text-xs text-[var(--text)]/30 mb-5 flex items-center gap-1.5">
              🔒 All conversations are private and end-to-end encrypted.
            </p>
            <div className="card p-8 text-center text-[var(--text)]/30">
              <MessageCircle size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No messages yet. Customers can contact you after booking.</p>
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <ProviderSettingsModule 
              profile={profile} 
              providerProfile={providerProfile} 
              setProviderProfile={setProviderProfile} 
            />
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === 'orders' && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <h2 className="heading-sm mb-5">My Orders ({providerOrders.length})</h2>
            {tabLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card p-5 h-20 animate-pulse bg-[var(--bg-card)]" />)}</div>
            ) : providerOrders.length === 0 ? (
              <div className="text-center py-20 text-[var(--text)]/30">
                <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {providerOrders.map(o => (
                  <div key={o.id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-semibold text-[var(--text)]">{o.profiles?.full_name || 'Customer'}</p>
                        <p className="text-xs text-[var(--text)]/40 font-mono">{o.id?.slice(0, 8)}</p>
                      </div>
                      <span className={`badge ${STATUS_COLORS[o.status] || 'badge-gray'}`}>{o.status}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text)]/40">{o.created_at ? fmtDate(o.created_at) : ''}</span>
                      <span className="font-bold text-[var(--text)]">{fmt(o.total || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RIDES ── */}
        {tab === 'rides' && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <h2 className="heading-sm mb-5">My Rides ({providerRides.length})</h2>
            {tabLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card p-5 h-20 animate-pulse bg-[var(--bg-card)]" />)}</div>
            ) : providerRides.length === 0 ? (
              <div className="text-center py-20 text-[var(--text)]/30">
                <Navigation size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No rides yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {providerRides.map(r => (
                  <div key={r.id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-[var(--text)]">{r.profiles?.full_name || 'Passenger'}</p>
                        <p className="text-xs text-[var(--text)]/40">{r.pickup_address || 'Pickup'} → {r.dropoff_address || 'Dropoff'}</p>
                      </div>
                      <span className={`badge ${STATUS_COLORS[r.status] || 'badge-gray'}`}>{r.status}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text)]/40">{r.created_at ? fmtDate(r.created_at) : ''}</span>
                      <span className="font-bold text-emerald-400">{fmt(r.fare || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROPERTIES ── */}
        {tab === 'properties' && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <h2 className="heading-sm mb-5">My Properties ({providerProperties.length})</h2>
            {tabLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card p-5 h-20 animate-pulse bg-[var(--bg-card)]" />)}</div>
            ) : providerProperties.length === 0 ? (
              <div className="text-center py-20 text-[var(--text)]/30">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No properties listed yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {providerProperties.map(p => (
                  <div key={p.id} className="card p-5 flex flex-wrap items-center gap-4">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-[var(--bg-card)] rounded-xl flex items-center justify-center text-2xl">🏠</div>
                    )}
                    <div className="flex-1 min-w-48">
                      <p className="font-semibold text-[var(--text)]">{p.title}</p>
                      <p className="text-brand-400 font-bold mt-1">{fmt(p.price)}</p>
                    </div>
                    <span className={`badge ${STATUS_COLORS[p.status] || 'badge-gray'}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS ── */}
        {tab === 'reviews' && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <h2 className="heading-sm mb-5">My Reviews ({providerReviews.length})</h2>
            {tabLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card p-5 h-20 animate-pulse bg-[var(--bg-card)]" />)}</div>
            ) : providerReviews.length === 0 ? (
              <div className="text-center py-20 text-[var(--text)]/30">
                <Star size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No reviews yet</p>
              </div>
            ) : (
              <div>
                {/* Rating summary */}
                <div className="card p-5 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="font-display text-4xl font-bold text-[var(--text)]">
                        {(providerReviews.reduce((s, r) => s + (r.rating || 0), 0) / providerReviews.length).toFixed(1)}
                      </p>
                      <div className="flex items-center gap-0.5 justify-center mt-1">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} size={14} className={
                            n <= Math.round(providerReviews.reduce((s, r) => s + (r.rating || 0), 0) / providerReviews.length)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-[var(--text)]/15'
                          } />
                        ))}
                      </div>
                      <p className="text-xs text-[var(--text)]/40 mt-1">{providerReviews.length} reviews</p>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5,4,3,2,1].map(star => {
                        const count = providerReviews.filter(r => r.rating === star).length;
                        const pct = providerReviews.length > 0 ? (count / providerReviews.length) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-xs">
                            <span className="text-[var(--text)]/40 w-3">{star}</span>
                            <div className="flex-1 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[var(--text)]/40 w-6 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Individual reviews */}
                <div className="space-y-3">
                  {providerReviews.map(r => (
                    <div key={r.id} className="card p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-[var(--bg-card)] rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                          {(r.profiles?.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-[var(--text)] text-sm">{r.profiles?.full_name || 'Customer'}</p>
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(n => (
                                <Star key={n} size={11} className={n <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--text)]/15'} />
                              ))}
                            </div>
                            <span className="text-xs text-[var(--text)]/25">{r.created_at ? fmtDate(r.created_at) : ''}</span>
                          </div>
                          <p className="text-sm text-[var(--text-muted)]">{r.comment || 'No comment'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Listing Modal */}
      {showAddListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-md card p-6" style={{ animation: 'fadeUp .3s ease' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="heading-sm">Add New Listing</h3>
              <button onClick={() => setShowAddListing(false)} className="btn btn-ghost p-2"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="label">Title *</label>
                <input value={newListing.title} onChange={e => setNewListing({ ...newListing, title: e.target.value })} className="input" placeholder="e.g. Premium Plumbing Repair" /></div>
              <div><label className="label">Price (GH₵) *</label>
                <input value={newListing.price} onChange={e => setNewListing({ ...newListing, price: e.target.value })} type="number" className="input" placeholder="e.g. 150" /></div>
              <div><label className="label">Description</label>
                <textarea value={newListing.description} onChange={e => setNewListing({ ...newListing, description: e.target.value })} className="input resize-none h-20" /></div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-300">
                ⚠️ Listing will be reviewed and approved by admin before going live.
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddListing(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={handleAddListing} className="btn btn-primary flex-1">Submit for Review</button>
            </div>
          </div>
        </div>
      )}

      {editListing && (
        <EditListingModal listing={editListing} onSave={handleEditSave} onClose={() => setEditListing(null)} />
      )}
    </div>
  );
}

// ─── Settings Field Row ────────────────────────────────────────────────────────
function SettingsField({ label, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  return (
    <div className="py-3 border-b border-[var(--border)] last:border-0">
      <p className="text-xs text-[var(--text)]/40 uppercase tracking-wide mb-1">{label}</p>
      {editing ? (
        <div className="flex items-center gap-2 mt-1">
          <input value={val} onChange={e => setVal(e.target.value)} className="input py-1.5 text-sm flex-1" autoFocus />
          <button onClick={() => { onSave(val); setEditing(false); }} className="btn btn-sm bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 shrink-0"><Check size={13} /></button>
          <button onClick={() => { setEditing(false); setVal(value); }} className="btn btn-ghost btn-sm shrink-0"><X size={13} /></button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text)]">{val || <span className="text-[var(--text)]/30">Not set</span>}</p>
          <button onClick={() => setEditing(true)} className="btn btn-ghost btn-sm"><Edit size={13} /></button>
        </div>
      )}
    </div>
  );
}

// ─── Master Export ─────────────────────────────────────────────────────────────
export default function ProviderDashboard() {
  const { profile, user } = useAuthStore();
  const [dbProfile, setDbProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Always read state from DB, not local state
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => { setDbProfile(data); setLoading(false); });
  }, [user?.id]);

  const currentProfile = dbProfile || profile;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Onboarding not submitted yet
  if (!currentProfile?.onboarding_complete) {
    return <Onboarding profile={currentProfile} onComplete={() => setDbProfile(p => ({ ...p, onboarding_complete: true }))} />;
  }

  // Removed blocking PendingApproval screen so providers can add products while pending
  // The UI will display a "Pending Approval" badge and they won't be visible to public until approved

  return <ProviderMain profile={currentProfile} />;
}
