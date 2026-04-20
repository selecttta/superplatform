import React from 'react';

/* ── Animated shimmer skeleton ───────────────────────────── */
function Shimmer({ className = '' }) {
    return (
        <div
            className={`bg-[var(--bg-card)] rounded-xl animate-pulse ${className}`}
            style={{ background: 'linear-gradient(90deg, #1a1a2e 25%, #16213e 50%, #1a1a2e 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }}
        />
    );
}

export function SkeletonProductCard() {
    return (
        <div className="card overflow-hidden">
            <Shimmer className="aspect-square w-full rounded-none" />
            <div className="p-3 space-y-2">
                <Shimmer className="h-2.5 w-16 rounded" />
                <Shimmer className="h-3 w-full rounded" />
                <Shimmer className="h-3 w-3/4 rounded" />
                <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => <Shimmer key={i} className="w-2.5 h-2.5 rounded" />)}
                </div>
                <Shimmer className="h-4 w-20 rounded" />
            </div>
        </div>
    );
}

export function SkeletonProviderCard() {
    return (
        <div className="card overflow-hidden">
            <Shimmer className="h-40 w-full rounded-none" />
            <div className="p-4 space-y-2">
                <Shimmer className="h-4 w-32 rounded" />
                <Shimmer className="h-3 w-24 rounded" />
                <Shimmer className="h-3 w-20 rounded" />
                <div className="flex gap-2 mt-3">
                    <Shimmer className="h-8 flex-1 rounded-xl" />
                    <Shimmer className="h-8 flex-1 rounded-xl" />
                    <Shimmer className="h-8 flex-1 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

export function SkeletonListRow() {
    return (
        <div className="card p-4 flex items-center gap-4">
            <Shimmer className="w-12 h-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
                <Shimmer className="h-3 w-40 rounded" />
                <Shimmer className="h-2.5 w-24 rounded" />
            </div>
            <Shimmer className="h-8 w-16 rounded-xl shrink-0" />
        </div>
    );
}

export function SkeletonText({ lines = 3 }) {
    return (
        <div className="space-y-2">
            {[...Array(lines)].map((_, i) => (
                <Shimmer key={i} className={`h-3 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
            ))}
        </div>
    );
}

// Default export = grid of product skeletons
export default function SkeletonGrid({ count = 8, type = 'product' }) {
    const Card = type === 'product' ? SkeletonProductCard : SkeletonProviderCard;
    return (
        <div className={`grid gap-4 ${type === 'product' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
            {[...Array(count)].map((_, i) => <Card key={i} />)}
        </div>
    );
}
