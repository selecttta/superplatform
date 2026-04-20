import { Linking, Platform } from 'react-native';
import { CURRENCY } from '../lib/constants';

export const fmt = (n) => `${CURRENCY}${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 0 })}`;

export const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';

export const truncate = (str = '', n = 80) =>
  str.length > n ? str.slice(0, n) + '…' : str;

// ─── Phone call ───────────────────────────────────────────────────────────────
export const makeCall = (phone) => {
  const url = `tel:${phone}`;
  Linking.canOpenURL(url)
    .then(can => { if (can) Linking.openURL(url); })
    .catch(console.warn);
};

// ─── Open maps ────────────────────────────────────────────────────────────────
export const openMaps = (lat, lng, label = 'Location') => {
  const url = Platform.select({
    ios:     `maps:0,0?q=${label}@${lat},${lng}`,
    android: `geo:0,0?q=${lat},${lng}(${label})`,
  });
  Linking.openURL(url).catch(console.warn);
};

// ─── Supabase image URL ────────────────────────────────────────────────────────
export const storageUrl = (bucket, path) =>
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
