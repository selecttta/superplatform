import React, { useState } from 'react';
import { Camera, X, Plus, Upload, Check, ArrowLeft, Tag, DollarSign, FileText, Grid, MapPin, Truck, User, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useImageUpload } from '../hooks/useImageUpload';
import { supabase } from '../lib/supabase';
import { CURRENCY } from '../lib/constants';
import toast from 'react-hot-toast';

const CATEGORY_TREE = {
    'E-Commerce': {
        icon: '🛍️',
        subcategories: ['Phones & Tablets', 'Laptops & Computers', 'Home Appliances', 'Clothes, Shoes & Bags', 'TVs & Audio'],
        showSpecs: true,
    },
    'Beauty & Fashion': {
        icon: '💄',
        subcategories: ['Body Care', 'Face Care', 'Hair Beauty', 'Makeup', 'Fragrances & Perfumes'],
        showSpecs: true,
    },
    'Real Estate': {
        icon: '🏠',
        subcategories: ['Commercial Rent', 'Commercial Sale', 'Residential Rent', 'Residential Sale', 'Land & Plots'],
        showSpecs: false,
    },
    'Vehicles & Transport': {
        icon: '🚗',
        subcategories: ['Cars & SUVs', 'Motorcycles & Scooters', 'Trucks & Buses', 'Auto Parts'],
        showSpecs: true,
    },
    'Home & Furniture': {
        icon: '🛋️',
        subcategories: ['Living Room', 'Bedroom', 'Kitchen & Dining', 'Home Decor'],
        showSpecs: true,
    },
    'Other': {
        icon: '📦',
        subcategories: ['Miscellaneous'],
        showSpecs: false,
    }
};

const CONDITIONS = [
    { id: 'used', label: 'Used', desc: 'Previously used item', icon: '♻️' },
    { id: 'refurbished', label: 'Refurbished', desc: 'Restored to working condition', icon: '🔧' },
    { id: 'new', label: 'Brand New', desc: 'Brand new, never used', icon: '✨' },
];

const BRANDS = ['Apple', 'Samsung', 'Tecno', 'Infinix', 'Nasco', 'HP', 'Dell', 'Sony', 'LG', 'Nike', 'Adidas', 'Gucci', 'Other'];
const TYPES = ['Air Conditioner', 'Fan', 'Iron', 'Smartphone', 'Tablet', 'Laptop', 'TV', 'Dress', 'Shoes', 'Bag', 'Other'];
const NEGOTIABLE_OPTIONS = ['Yes', 'No', 'Not sure'];

const STEPS = ['Photos', 'Details', 'Delivery & Contact', 'Review'];
const PLATFORM_COMMISSION = 0.05; // 5%

export default function SellItemPage() {
    const navigate = useNavigate();
    const { user, role, profile } = useAuthStore();
    const { upload, uploading, progress } = useImageUpload();

    const [step, setStep] = useState(0);
    const [photos, setPhotos] = useState([]);
    const [photoFiles, setPhotoFiles] = useState([]);
    
    // Base details
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [location, setLocation] = useState(profile?.location || '');
    
    // Dynamic Specs
    const [condition, setCondition] = useState('used');
    const [brand, setBrand] = useState('');
    const [type, setType] = useState('');
    const [negotiable, setNegotiable] = useState('');
    
    // Delivery Details
    const [deliveryName, setDeliveryName] = useState('');
    const [deliveryRegion, setDeliveryRegion] = useState('');
    const [deliveryDaysFrom, setDeliveryDaysFrom] = useState('');
    const [deliveryDaysTo, setDeliveryDaysTo] = useState('');
    const [deliveryFee, setDeliveryFee] = useState('');
    
    // Seller Contact
    const [sellerPhone, setSellerPhone] = useState(profile?.phone || '');
    const [sellerName, setSellerName] = useState(profile?.full_name || '');

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const sellerType = role === 'provider' ? 'provider' : 'customer';

    const handlePhotoAdd = (e) => {
        const files = Array.from(e.target.files || []);
        if (photos.length + files.length > 6) { toast.error('Max 6 photos'); return; }
        const previews = files.map(f => URL.createObjectURL(f));
        setPhotos(prev => [...prev, ...previews]);
        setPhotoFiles(prev => [...prev, ...files]);
    };

    const removePhoto = (i) => {
        URL.revokeObjectURL(photos[i]);
        setPhotos(prev => prev.filter((_, j) => j !== i));
        setPhotoFiles(prev => prev.filter((_, j) => j !== i));
    };

    const canNext = () => {
        if (step === 0) return photos.length > 0;
        if (step === 1) return title && price && category && subCategory && location;
        if (step === 2) return sellerName && sellerPhone && deliveryRegion;
        return true;
    };

    const numPrice = Number(price) || 0;
    const commission = Math.round(numPrice * PLATFORM_COMMISSION * 100) / 100;
    const sellerReceives = Math.round((numPrice - commission) * 100) / 100;

    const handleSubmit = async () => {
        if (!user) { toast.error('Please sign in to sell'); navigate('/login'); return; }
        setSubmitting(true);
        try {
            // Upload all photos to Supabase Storage in new marketplace bucket
            const urls = [];
            for (const file of photoFiles) {
                const url = await upload(file, 'marketplace', 'items');
                if (url) urls.push(url);
            }
            const imageUrls = urls.length ? urls : photos; // fallback to blob URLs if upload somehow bypassed

            const details = {
                subCategory,
                brand,
                type,
                negotiable,
                delivery: {
                    name: deliveryName,
                    region: deliveryRegion,
                    daysFrom: deliveryDaysFrom,
                    daysTo: deliveryDaysTo,
                    fee: deliveryFee
                },
                seller: {
                    name: sellerName,
                    phone: sellerPhone
                }
            };

            const { error } = await supabase.from('products').insert({
                seller_id: user.id,
                seller_type: sellerType,
                title: title.trim(),
                description: description.trim(),
                price: numPrice,
                category,
                condition,
                location: location.trim(),
                images: imageUrls,
                stock: 1,
                status: 'pending',
                details, // insert JSON details
                created_at: new Date().toISOString(),
            });

            if (error) throw error;

            setSubmitted(true);
            toast.success('Item submitted for review! 🎉');
        } catch (err) {
            toast.error(err.message || 'Failed to list item');
        } finally { setSubmitting(false); }
    };

    if (submitted) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4">
                <div className="card max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={28} className="text-emerald-400" />
                    </div>
                    <h2 className="heading-md mb-2">Item Submitted!</h2>
                    <p className="text-muted text-sm mb-2">
                        Your item is under admin review. It will appear in the shop once approved.
                    </p>
                    <p className="text-xs text-[var(--text)]/30 mb-6">
                        You'll receive a notification when it goes live. When sold, your earnings will be credited to your wallet.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => navigate('/ecommerce')} className="btn-primary px-6">Browse Shop</button>
                        <button onClick={() => { window.location.reload(); }} className="btn-ghost border border-[var(--border)] px-6">Sell Another</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
            {/* Header */}
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-white)] mb-6 text-sm">
                <ArrowLeft size={16} /> Back
            </button>

            <div className="flex items-start justify-between mb-2">
                <div>
                    <h1 className="heading-lg mb-1">Sell an Item</h1>
                    <p className="text-muted text-sm">List your item and reach thousands of buyers</p>
                </div>
                <span className={`badge text-xs mt-1 ${sellerType === 'provider'
                        ? 'bg-brand-500/20 text-brand-300'
                        : 'bg-orange-500/20 text-orange-300'
                    }`}>
                    {sellerType === 'provider' ? '🏪 Store Vendor' : '👤 Individual Seller'}
                </span>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8 overflow-x-auto hide-scrollbar">
                {STEPS.map((s, i) => (
                    <React.Fragment key={s}>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${i === step ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' :
                            i < step ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[var(--bg-card)] text-[var(--text)]/30'
                            } shrink-0`}>
                            {i < step ? <Check size={12} /> : <span>{i + 1}</span>}
                            <span>{s}</span>
                        </div>
                        {i < STEPS.length - 1 && <div className={`h-px min-w-[20px] flex-1 mx-2 ${i < step ? 'bg-emerald-500/30' : 'bg-[var(--bg-card)]'}`} />}
                    </React.Fragment>
                ))}
            </div>

            {/* Step 0: Photos */}
            {step === 0 && (
                <div>
                    <h2 className="heading-sm mb-4 flex items-center gap-2"><Camera size={18} /> Add Photos</h2>
                    <p className="text-muted text-sm mb-4">Add up to 6 photos. The first photo will be the cover image.</p>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {photos.map((url, i) => (
                            <div key={i} className="relative aspect-square bg-[var(--bg-card)] rounded-xl overflow-hidden group">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <button onClick={() => removePhoto(i)}
                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X size={12} className="text-[var(--text)]" />
                                </button>
                                {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] bg-brand-500 text-[var(--text)] px-1.5 py-0.5 rounded">Cover</span>}
                            </div>
                        ))}
                        {photos.length < 6 && (
                            <label className="aspect-square bg-[var(--bg-card)] rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center cursor-pointer hover:border-brand-500/30 transition-colors">
                                <Plus size={24} className="text-[var(--text)]/20 mb-1" />
                                <span className="text-xs text-[var(--text)]/30">Add Photo</span>
                                <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} className="hidden" />
                            </label>
                        )}
                    </div>
                </div>
            )}

            {/* Step 1: Details */}
            {step === 1 && (
                <div className="space-y-6">
                    <div>
                        <label className="label flex items-center gap-2"><Grid size={14} /> Category</label>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {Object.keys(CATEGORY_TREE).map(c => (
                                <button key={c} onClick={() => { setCategory(c); setSubCategory(''); }}
                                    className={`py-3 px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2 ${category === c ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
                                        }`}>
                                    <span>{CATEGORY_TREE[c].icon}</span> <span className="truncate">{c}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {category && (
                        <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-brand-500/20 animate-fade-in">
                            <label className="label text-brand-400">Select Sub-Category <span className="text-red-400">*</span></label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {CATEGORY_TREE[category].subcategories.map(sub => (
                                    <button key={sub} onClick={() => setSubCategory(sub)}
                                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${subCategory === sub ? 'bg-brand-500 text-[var(--text)]' : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text)]'
                                            }`}>{sub}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {subCategory && (
                        <div className="space-y-6 animate-fade-in border-t border-[var(--border)] pt-6">
                            <div>
                                <label className="label flex items-center gap-2"><Tag size={14} /> Item Title <span className="text-red-400">*</span></label>
                                <input value={title} onChange={e => setTitle(e.target.value)}
                                    className="input" placeholder="e.g. iPhone 13 Pro (256GB), exactly as stated" maxLength={100} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label flex items-center gap-2"><DollarSign size={14} /> Price ({CURRENCY}) <span className="text-red-400">*</span></label>
                                    <input value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                                        className="input" placeholder="0.00" type="text" />
                                </div>
                                <div>
                                    <label className="label text-[var(--text-muted)]">Are you open to negotiation?</label>
                                    <div className="relative">
                                        <select value={negotiable} onChange={e => setNegotiable(e.target.value)} className="input appearance-none bg-[var(--bg-input)] py-3">
                                            <option value="" disabled>Select option</option>
                                            {NEGOTIABLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text)]/40 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            
                            {numPrice > 0 && (
                                <div className="text-xs text-[var(--text)]/40 flex flex-col sm:flex-row sm:items-center gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3">
                                    <span>Platform fee (5%): <strong className="text-[var(--text-muted)] ml-1">{CURRENCY}{commission}</strong></span>
                                    <span className="hidden sm:inline text-[var(--border)]">|</span>
                                    <span className="text-emerald-400 font-medium tracking-wide">You receive upon sale: <strong className="ml-1 text-emerald-300">{CURRENCY}{sellerReceives}</strong></span>
                                </div>
                            )}

                            {CATEGORY_TREE[category]?.showSpecs && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-yellow-500/5 border border-yellow-500/10 p-4 rounded-xl">
                                    <div>
                                        <label className="label text-yellow-500/70">Brand Name</label>
                                        <div className="relative">
                                            <select value={brand} onChange={e => setBrand(e.target.value)} className="input appearance-none bg-[var(--bg-input)]">
                                                <option value="">Select brand...</option>
                                                {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text)]/30 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label text-yellow-500/70">Item Type</label>
                                        <div className="relative">
                                            <select value={type} onChange={e => setType(e.target.value)} className="input appearance-none bg-[var(--bg-input)]">
                                                <option value="">Select type...</option>
                                                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text)]/30 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="label">Item Condition</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {CONDITIONS.map(c => (
                                        <button key={c.id} onClick={() => setCondition(c.id)}
                                            className={`p-3 rounded-xl border transition-all text-center ${condition === c.id ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-[var(--bg-card)] hover:border-white/20'
                                                }`}>
                                            <span className="text-2xl block mb-2">{c.icon}</span>
                                            <p className={`text-xs font-medium ${condition === c.id ? 'text-brand-300' : 'text-[var(--text-muted)]'}`}>{c.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="label flex items-center gap-2"><MapPin size={14} /> Item Location <span className="text-red-400">*</span></label>
                                <input value={location} onChange={e => setLocation(e.target.value)}
                                    className="input" placeholder="e.g. East Legon, Accra" maxLength={100} />
                            </div>

                            <div>
                                <label className="label flex items-center gap-2"><FileText size={14} /> Description</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)}
                                    className="input min-h-[120px] resize-y leading-relaxed" placeholder="Write a detailed description explaining exactly what you are selling, its condition, battery health, any flaws, or what's included..." maxLength={1000} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Step 2: Delivery & Contact */}
            {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                    <div>
                        <h2 className="heading-sm mb-4 flex items-center gap-2 text-brand-400"><Truck size={18} /> Delivery Options</h2>
                        <div className="bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border)] space-y-5 shadow-lg">
                            <div>
                                <label className="label">Name this delivery option <span className="text-red-400">*</span></label>
                                <input value={deliveryName} onChange={e => setDeliveryName(e.target.value)} className="input border-[var(--bg-input)] bg-[var(--bg-input)]" placeholder="e.g. Standard Courier or DHL" />
                            </div>
                            <div>
                                <label className="label">Delivery Delivery Region <span className="text-red-400">*</span></label>
                                <input value={deliveryRegion} onChange={e => setDeliveryRegion(e.target.value)} className="input border-[var(--bg-input)] bg-[var(--bg-input)]" placeholder="e.g. Greater Accra or Nationwide" />
                            </div>
                            
                            <div>
                                <label className="label">How many days does it take to deliver?</label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">From</span>
                                            <input type="number" min="0" value={deliveryDaysFrom} onChange={e => setDeliveryDaysFrom(e.target.value)} className="input pl-12 bg-[var(--bg-input)]" placeholder="1" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">day</span>
                                        </div>
                                    </div>
                                    <div className="text-muted w-4 flex justify-center">-</div>
                                    <div className="flex-1">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">To</span>
                                            <input type="number" min="0" value={deliveryDaysTo} onChange={e => setDeliveryDaysTo(e.target.value)} className="input pl-10 bg-[var(--bg-input)]" placeholder="3" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">days</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="label">Do you charge a fee for delivery?</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{CURRENCY}</span>
                                    <input value={deliveryFee} onChange={e => setDeliveryFee(e.target.value.replace(/[^0-9.]/g, ''))} className="input pl-10 bg-[var(--bg-input)]" placeholder="0.00 or leave blank for Free" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="heading-sm mb-4 flex items-center gap-2 text-blue-400 mt-8"><User size={18} /> Seller Information</h2>
                        <div className="bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border)] space-y-5 shadow-lg">
                            <div>
                                <label className="label">Your Name <span className="text-red-400">*</span></label>
                                <input value={sellerName} onChange={e => setSellerName(e.target.value)} className="input bg-[var(--bg-input)]" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="label">Your Phone Number <span className="text-red-400">*</span></label>
                                <input type="tel" value={sellerPhone} onChange={e => setSellerPhone(e.target.value)} className="input bg-[var(--bg-input)]" placeholder="e.g. +233 24 123 4567" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
                <div className="animate-fade-in">
                    <h2 className="heading-sm mb-4">Review Your Listing</h2>
                    <div className="card p-5 md:p-6 space-y-6 bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-secondary)] border border-[var(--border)]">
                        {photos.length > 0 && (
                            <div className="flex gap-2.5 overflow-x-auto pb-3 snap-x">
                                {photos.map((url, i) => (
                                    <img key={i} src={url} alt="" className="w-24 h-24 rounded-xl object-cover shrink-0 snap-start shadow-md ring-1 ring-white/10" />
                                ))}
                            </div>
                        )}
                        
                        <div className="pt-2">
                            <p className="text-brand-400 font-bold text-3xl tracking-tight mb-2">{CURRENCY} {Number(price).toLocaleString()}</p>
                            <p className="text-[var(--text)] font-semibold text-xl leading-tight">{title}</p>
                            <p className="text-[var(--text-muted)] text-sm mt-1">{category} <span className="mx-1 text-[var(--border)]">{'>'}</span> {subCategory}</p>
                            <p className="text-[var(--text-muted)] text-sm flex items-center gap-1 mt-1"><MapPin size={12}/> {location}</p>
                        </div>

                        <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent opacity-50" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="bg-[var(--bg-secondary)] p-4 rounded-xl shadow-inner border border-white/5">
                                <p className="text-[var(--text)]/40 text-[10px] mb-2 uppercase tracking-widest font-bold">Item Specs</p>
                                <div className="space-y-1.5 align-middle">
                                    <p className="text-[var(--text)] flex justify-between"><span className="text-muted">Condition</span> <span className="font-medium capitalize">{condition}</span></p>
                                    {brand && <p className="text-[var(--text)] flex justify-between"><span className="text-muted">Brand</span> <span className="font-medium text-brand-300">{brand}</span></p>}
                                    {type && <p className="text-[var(--text)] flex justify-between"><span className="text-muted">Type</span> <span className="font-medium">{type}</span></p>}
                                    {negotiable && <p className="text-[var(--text)] flex justify-between"><span className="text-muted">Negotiation</span> <span className="font-medium">{negotiable}</span></p>}
                                </div>
                            </div>
                            <div className="bg-[var(--bg-secondary)] p-4 rounded-xl shadow-inner border border-white/5">
                                <p className="text-[var(--text)]/40 text-[10px] mb-2 uppercase tracking-widest font-bold">Delivery Configuration</p>
                                <div className="space-y-1.5 align-middle">
                                    <p className="text-[var(--text)] flex justify-between"><span className="text-muted">Service Name</span> <span className="font-medium">{deliveryName || 'Standard'}</span></p>
                                    <p className="text-[var(--text)] flex justify-between"><span className="text-muted">Region</span> <span className="font-medium">{deliveryRegion}</span></p>
                                    <p className="text-[var(--text)] flex justify-between"><span className="text-muted">Processing</span> <span className="font-medium">{deliveryDaysFrom}-{deliveryDaysTo} days</span></p>
                                    <p className="text-[var(--text)] flex justify-between"><span className="text-muted">Delivery Fee</span> <span className="font-medium text-blue-400">{deliveryFee ? `${CURRENCY}${deliveryFee}` : 'Free'}</span></p>
                                </div>
                            </div>
                        </div>

                        {description && (
                            <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-white/5">
                                <p className="text-[var(--text)]/40 text-[10px] mb-2 uppercase tracking-widest font-bold">Description</p>
                                <p className="text-[var(--text-white)] text-sm leading-relaxed whitespace-pre-line">{description}</p>
                            </div>
                        )}
                        
                        <div className="bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 rounded-xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                                <User size={18} className="text-blue-300" />
                            </div>
                            <div>
                                <p className="text-[var(--text)] text-sm font-medium">{sellerName}</p>
                                <p className="text-blue-300/80 text-xs mt-0.5 tracking-wide">{sellerPhone}</p>
                            </div>
                        </div>

                        {/* Earnings breakdown */}
                        {numPrice > 0 && (
                            <div className="glass rounded-xl p-4 text-xs space-y-2 mt-4">
                                <p className="text-[var(--text)]/40 text-[10px] mb-2 uppercase tracking-widest font-bold">Financial</p>
                                <div className="flex justify-between items-center"><span className="text-[var(--text)]/60">Total listing price</span><span className="text-[var(--text)]">{CURRENCY} {numPrice.toLocaleString()}</span></div>
                                <div className="flex justify-between items-center"><span className="text-[var(--text)]/60">Platform fee (5%)</span><span className="text-red-400">-{CURRENCY} {commission.toLocaleString()}</span></div>
                                <div className="flex justify-between items-center border-t border-[var(--border)] pt-2 mt-2"><span className="text-[var(--text-white)] font-medium">You receive upon sale</span><span className="text-emerald-400 font-bold text-sm tracking-wide">{CURRENCY} {sellerReceives.toLocaleString()}</span></div>
                            </div>
                        )}
                        <div className="glass rounded-xl p-3 text-xs text-yellow-300/90 flex items-start gap-3 border border-yellow-500/20">
                            <span className="mt-0.5 shrink-0 text-base">⏳</span> 
                            <span>Your listing requires admin approval before being visible. Tap "Finish & Submit" below to finalize.</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Drawer */}
            <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-body)]/90 backdrop-blur-xl border-t border-[var(--border)] p-4 z-40">
                <div className="max-w-2xl mx-auto flex gap-3">
                    {step > 0 && (
                        <button onClick={() => setStep(s => s - 1)} disabled={submitting || uploading} className="btn-ghost border border-[var(--border)] px-5 md:px-8">Back</button>
                    )}
                    {step < 3 ? (
                        <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                            className="btn-primary flex-1 py-3 text-sm tracking-wide shadow-lg shadow-brand-500/20">Continue to Next Step</button>
                    ) : (
                        <button onClick={handleSubmit} disabled={submitting || uploading}
                            className="btn-primary flex-1 py-3 text-sm tracking-wide shadow-lg shadow-brand-500/20">
                            {submitting || uploading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-[var(--bg-body)] border-t-[var(--text)] rounded-full animate-spin" />
                                    {uploading ? `Uploading Photos (${progress}%)…` : 'Finalizing Listing…'}
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2 font-semibold"><Upload size={16} /> Finish & Submit Listing</span>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
