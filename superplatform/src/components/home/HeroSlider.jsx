import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORIES, APP_NAME, APP_TAGLINE } from '../../lib/constants';

// ─────────────────────────────────────────────────────────────────────────────
// HERO SLIDES — local MP4 files served from /public/videos/
// Files are downloaded by: public/videos/download-videos.ps1
//
// Each slide:
//  • video  — local path (served via React's public folder, no CORS)
//  • poster — Unsplash image shown while video loads / on slow connections
// ─────────────────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 'welcome',
    video: '/videos/welcome.mp4',
    poster: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&q=80',
    title: `Welcome to ${APP_NAME}`,
    sub: 'Transport · Services · Shopping · Health · Rentals — All in one place.',
    cta: 'Explore Now',
    path: '/ecommerce',
    accent: '#f97316',
  },
  {
    id: 'transport',
    video: '/videos/transport.mp4',
    poster: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1400&q=80',
    title: 'Transport',
    sub: 'Book rides, taxis and deliveries instantly across Ghana.',
    cta: 'Book a Ride',
    path: '/transport',
    accent: '#3b82f6',
  },
  {
    id: 'home-services',
    video: '/videos/home-services.mp4',
    poster: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1400&q=80',
    title: 'Home Services',
    sub: 'Trusted professionals for repairs and maintenance, same day.',
    cta: 'Book a Pro',
    path: '/home-services',
    accent: '#10b981',
  },
  {
    id: 'beauty',
    video: '/videos/beauty.mp4',
    poster: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1400&q=80',
    title: 'Beauty & Fashion',
    sub: 'Salon, styling and fashion services near you, booked in seconds.',
    cta: 'Book Now',
    path: '/beauty',
    accent: '#ec4899',
  },
  {
    id: 'health',
    video: '/videos/health.mp4',
    poster: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1400&q=80',
    title: 'Health Services',
    sub: 'Doctors, labs and pharmacies at your fingertips.',
    cta: 'Consult Now',
    path: '/health',
    accent: '#ef4444',
  },
  {
    id: 'ecommerce',
    video: '/videos/ecommerce.mp4',
    poster: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&q=80',
    title: 'E-Commerce Marketplace',
    sub: 'Buy and sell new and second-hand products easily.',
    cta: 'Shop Now',
    path: '/ecommerce',
    accent: '#f97316',
  },
  {
    id: 'real-estate',
    video: '/videos/real-estate.mp4',
    poster: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&q=80',
    title: 'Real Estate',
    sub: 'Find houses, apartments and land across Ghana.',
    cta: 'Find Property',
    path: '/real-estate',
    accent: '#8b5cf6',
  },
  {
    id: 'rentals',
    video: '/videos/rentals.mp4',
    poster: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=1400&q=80',
    title: 'Rentals',
    sub: 'Rent vehicles, homes and equipment — flexible and affordable.',
    cta: 'Browse Rentals',
    path: '/rentals',
    accent: '#06b6d4',
  },
];

// ─── Slide text overlay (animations unchanged from original) ─────────────────
function SlideText({ slide }) {
  return (
    <div className="w-full">
      {slide.id !== 'welcome' && (
        <div
          className="inline-flex items-center gap-2 glass px-3 py-1 rounded-full mb-5"
          style={{ animation: 'heroFadeUp 0.5s 0.05s ease both' }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: slide.accent }} />
          <span className="text-xs font-medium text-white/60">Category</span>
        </div>
      )}

      <h1
        className={`font-display font-black text-2xl sm:text-4xl md:text-7xl xl:text-8xl text-white leading-none mb-3 sm:mb-4 ${slide.id === 'welcome' ? 'hidden sm:block' : ''
          }`}
        style={{
          textShadow: '0 4px 60px rgba(0,0,0,.6)',
          animation: 'heroFadeUp 0.55s 0.1s ease both',
        }}
      >
        {slide.title}
      </h1>

      <p
        className="text-sm sm:text-base md:text-xl text-white/80 mb-5 sm:mb-8 max-w-lg leading-relaxed"
        style={{ animation: 'heroFadeUp 0.55s 0.22s ease both' }}
      >
        {slide.sub}
      </p>

      <div style={{ animation: 'heroFadeUp 0.55s 0.36s ease both' }}>
        <button
          className="btn btn-lg text-white font-bold shadow-2xl active:scale-95 transition-transform"
          style={{ background: slide.accent, boxShadow: `0 8px 32px ${slide.accent}44` }}
          data-slide-path={slide.path}
        >
          {slide.cta} →
        </button>
      </div>
    </div>
  );
}

// ─── Video background layer ───────────────────────────────────────────────────
function VideoLayer({ slide, active, paused }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) {
      el.currentTime = 0;
      if (!paused) {
        el.play().catch(() => {
          // Autoplay blocked — poster image shows via poster= attribute
        });
      }
    } else {
      el.pause();
    }
  }, [active, paused]);

  return (
    <video
      ref={ref}
      className="absolute inset-0 w-full h-full object-cover"
      src={slide.video}
      poster={slide.poster}
      autoPlay
      muted
      loop
      playsInline
      preload={active ? 'auto' : 'none'}
      aria-hidden="true"
    />
  );
}

// ─── Main HeroSlider ──────────────────────────────────────────────────────────
export default function HeroSlider() {
  const [cur, setCur] = useState(0);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();

  const go = useCallback((idx) => setCur(idx), []);
  const goNext = useCallback(() => go((cur + 1) % SLIDES.length), [cur, go]);
  const goPrev = useCallback(() => go((cur - 1 + SLIDES.length) % SLIDES.length), [cur, go]);

  // Auto-advance every 5.5s, pause on hover
  useEffect(() => {
    if (paused) return;
    const t = setInterval(goNext, 5500);
    return () => clearInterval(t);
  }, [paused, goNext]);

  const slide = SLIDES[cur];

  const handleCtaClick = (e) => {
    const btn = e.target.closest('[data-slide-path]');
    if (btn) navigate(btn.getAttribute('data-slide-path'));
  };

  return (
    <div
      className="relative w-full h-screen min-h-[580px] max-h-[900px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── One video layer per slide ─────────────────────────────── */}
      {SLIDES.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === cur ? 1 : 0, zIndex: i === cur ? 2 : 1 }}
        >
          <VideoLayer slide={s} active={i === cur} paused={paused} />

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/50 to-dark-900/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-dark-900/60 to-transparent" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(ellipse at 20% 60%, ${s.accent}44, transparent 60%)`,
            }}
          />
        </div>
      ))}

      {/* ── Text content ──────────────────────────────────────────── */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-24 sm:pb-32 md:pb-40">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 w-full" onClick={handleCtaClick}>
          <SlideText key={cur} slide={slide} />
        </div>
      </div>

      {/* ── Left arrow ────────────────────────────────────────────── */}
      <button
        onClick={goPrev}
        aria-label="Previous slide"
        className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 glass rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-all"
      >
        <ChevronLeft size={20} />
      </button>

      {/* ── Right arrow ───────────────────────────────────────────── */}
      <button
        onClick={goNext}
        aria-label="Next slide"
        className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 glass rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-all"
      >
        <ChevronRight size={20} />
      </button>

      {/* ── Dot indicators ────────────────────────────────────────── */}
      <div className="absolute bottom-16 sm:bottom-20 md:bottom-28 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => go(i)}
            aria-label={`Go to ${s.title}`}
            className={`h-1.5 rounded-full transition-all duration-400 ${i === cur ? 'w-8 bg-brand-500' : 'w-1.5 bg-white/30 hover:bg-white/60'
              }`}
          />
        ))}
      </div>

      {/* ── Category quick-nav strip ──────────────────────────────── */}
      <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-dark-900 via-dark-900/80 to-transparent pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(cat.path)}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 glass rounded-full text-xs font-medium text-white/80 hover:text-white hover:bg-[var(--bg-input)] transition-all"
              >
                <span className="hidden sm:inline">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
