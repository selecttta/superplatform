import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import { useFavStore } from '../store/favStore';
import { useCartStore } from '../store/cartStore';
import { fmt } from '../utils/helpers';
import StarRating from '../components/common/StarRating';
import toast from 'react-hot-toast';

export default function FavoritesPage() {
  const { items, remove, clear } = useFavStore();
  const addToCart = useCartStore(s => s.add);
  const navigate  = useNavigate();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg)] pt-16 flex items-center justify-center px-4">
        <div className="text-center">
          <Heart size={56} className="text-[var(--text)]/10 mx-auto mb-4" />
          <h2 className="heading-md mb-3">No Favorites Yet</h2>
          <p className="text-muted mb-8 max-w-xs mx-auto">
            Tap the ❤️ heart on any product, service or provider to save it here.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/ecommerce"    className="btn btn-primary">Browse Products</Link>
            <Link to="/home-services" className="btn btn-secondary">Browse Services</Link>
          </div>
        </div>
      </div>
    );
  }

  const products  = items.filter(i => i.type === 'product');
  const services  = items.filter(i => i.type === 'service');
  const providers = items.filter(i => i.type === 'provider');

  const Section = ({ title, children }) => children ? (
    <div className="mb-10">
      <h2 className="heading-sm mb-4">{title}</h2>
      {children}
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="heading-lg mb-1 flex items-center gap-2">
              <Heart size={28} className="text-red-400 fill-red-400" />
              My Favorites
            </h1>
            <p className="text-muted text-sm">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
          </div>
          {items.length > 0 && (
            <button onClick={() => { clear(); toast('Favorites cleared.', { icon:'🗑️' }); }}
              className="btn btn-ghost btn-sm text-red-400">
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>

        {/* Products section */}
        {products.length > 0 && (
          <Section title={`🛍️ Products (${products.length})`}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map(item => {
                const p = item.data;
                return (
                  <div key={`${item.type}-${item.id}`} className="card overflow-hidden card-hover group">
                    <div className="relative aspect-square overflow-hidden bg-[var(--bg-card)]">
                      <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <button onClick={() => remove(item.id, 'product')}
                        className="absolute top-2 right-2 w-7 h-7 glass rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all">
                        <Heart size={12} className="fill-red-400" />
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="font-medium text-[var(--text)] text-sm mb-1 line-clamp-2">{p.name}</p>
                      {p.rating && <StarRating rating={p.rating} reviews={p.reviews} size={10} />}
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-bold text-[var(--text)]">{fmt(p.price)}</span>
                        <button onClick={() => { addToCart(p); toast.success('Added to cart!'); }}
                          className="btn btn-primary btn-sm gap-1">
                          <ShoppingCart size={12} /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Services section */}
        {services.length > 0 && (
          <Section title={`🔧 Services (${services.length})`}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(item => {
                const s = item.data;
                return (
                  <div key={`${item.type}-${item.id}`} className="card p-5 flex items-center gap-4">
                    <span className="text-3xl shrink-0">{s.icon || '🔧'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--text)]">{s.name}</p>
                      <p className="text-xs text-[var(--text)]/40 mt-0.5">{s.desc}</p>
                      <p className="font-bold text-brand-400 mt-1">{fmt(s.price)}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => remove(item.id, 'service')}
                        className="w-7 h-7 glass rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all">
                        <Heart size={12} className="fill-red-400" />
                      </button>
                      <button onClick={() => navigate(s.path || '/')}
                        className="btn btn-primary btn-sm">
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Providers section */}
        {providers.length > 0 && (
          <Section title={`👤 Providers (${providers.length})`}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map(item => {
                const p = item.data;
                return (
                  <div key={`${item.type}-${item.id}`} className="card card-hover overflow-hidden">
                    <div className="relative h-32 bg-[var(--bg-card)]">
                      <img src={p.img} alt={p.name} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 bg-gradient-to-t from-dark-800 to-transparent" />
                      <button onClick={() => remove(item.id, 'provider')}
                        className="absolute top-2 right-2 w-7 h-7 glass rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/20">
                        <Heart size={12} className="fill-red-400" />
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <img src={p.img} alt={p.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        <div>
                          <p className="font-semibold text-[var(--text)] text-sm">{p.name}</p>
                          <p className="text-xs text-[var(--text)]/40">{p.specialty || p.role}</p>
                        </div>
                      </div>
                      {p.rating && <StarRating rating={p.rating} reviews={p.reviews || p.trips} size={11} />}
                      <button onClick={() => navigate(`/provider/${p.id}`, { state: { provider: p } })}
                        className="btn btn-secondary w-full mt-3 btn-sm">
                        View Profile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
