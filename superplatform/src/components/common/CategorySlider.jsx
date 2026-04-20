import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Per-slide animated text — re-mounts via key for clean animation ─────────
function SlideContent({ slide, ctaLabel, onCta }) {
  return (
    <div>
      <h2
        className="font-display font-bold text-lg sm:text-2xl md:text-4xl text-white mb-2 drop-shadow-xl"
        style={{ animation: 'heroFadeUp 0.45s 0.05s ease both' }}
      >
        {slide.title}
      </h2>
      <p
        className="text-white/80 text-sm md:text-base mb-5 max-w-md"
        style={{ animation: 'heroFadeUp 0.45s 0.18s ease both' }}
      >
        {slide.sub}
      </p>
      {onCta && (
        <div style={{ animation: 'heroFadeUp 0.45s 0.3s ease both' }}>
          <button onClick={onCta} className="btn-primary btn-sm md:btn">
            {ctaLabel || 'Explore'} →
          </button>
        </div>
      )}
    </div>
  );
}

export default function CategorySlider({ slides = [], ctaLabel, onCta, autoInterval = 4500 }) {
  const [cur, setCur]       = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCur(c => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCur(c => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setInterval(next, autoInterval);
    return () => clearInterval(t);
  }, [paused, next, autoInterval, slides.length]);

  if (!slides.length) return null;
  const slide = slides[cur];

  return (
    <div
      className="relative w-full h-64 md:h-96 rounded-2xl overflow-hidden group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Images */}
      {slides.map((s, i) => (
        <div key={i} className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === cur ? 1 : 0, zIndex: i === cur ? 1 : 0 }}>
          <img src={s.img} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        </div>
      ))}

      {/* Content — key={cur} forces SlideContent to remount → animation replays */}
      <div className="relative z-10 h-full flex flex-col justify-end p-6 md:p-10">
        <SlideContent key={cur} slide={slide} ctaLabel={ctaLabel} onCta={onCta} />
      </div>

      {/* Nav arrows */}
      {slides.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 glass rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/15">
            <ChevronLeft size={16} />
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 glass rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/15">
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-5 z-10 flex gap-1.5">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCur(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === cur ? 'w-6 bg-brand-500' : 'w-1.5 bg-white/40 hover:bg-white/70'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
