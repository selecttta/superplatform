import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full" style={{ animation: 'fadeUp 0.5s ease-out' }}>
        <h1 className="font-display font-black text-[120px] leading-none text-transparent bg-clip-text bg-gradient-to-b from-brand-400 to-brand-600 mb-2">
          404
        </h1>
        <h2 className="heading-lg mb-4">Page not found</h2>
        <p className="text-[var(--text-muted)] mb-8 leading-relaxed">
          Oops! The page you're looking for doesn't exist, has been moved, or is temporarily unavailable.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate(-1)} className="btn btn-secondary gap-2 w-full sm:w-auto">
            <ArrowLeft size={16} /> Go Back
          </button>
          <button onClick={() => navigate('/')} className="btn btn-primary gap-2 w-full sm:w-auto">
            <Home size={16} /> Home Page
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--text)]/40 mb-4">Or try searching for what you need:</p>
          <div className="relative max-w-xs mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/30" size={16} />
            <input
              type="text"
              placeholder="Search SuperPlatform..."
              className="input pl-10 bg-[var(--bg-secondary)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                  navigate(`/ecommerce?search=${encodeURIComponent(e.target.value)}`);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
