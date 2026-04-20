import React from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ rating = 0, reviews, size = 12 }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1,2,3,4,5].map(n => (
          <Star key={n} size={size}
            className={n <= Math.round(rating) ? 'stars-filled fill-current' : 'text-[var(--text)]/15'} />
        ))}
      </div>
      <span className="text-[var(--text)]/45" style={{fontSize: size - 2}}>{rating.toFixed(1)}</span>
      {reviews !== undefined && <span className="text-[var(--text)]/30" style={{fontSize: size - 2}}>({reviews})</span>}
    </div>
  );
}
