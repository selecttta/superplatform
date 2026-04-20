import { CURRENCY } from '../lib/constants';

export const fmt = (n) => `${CURRENCY}${Number(n).toLocaleString()}`;
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-GH', { day:'numeric', month:'short', year:'numeric' });
export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GH', { hour:'2-digit', minute:'2-digit' });
export const fmtDateTime = (d) => `${fmtDate(d)} at ${fmtTime(d)}`;
export const disc = (price, orig) => orig ? Math.round((1 - price / orig) * 100) : 0;
export const initials = (name='') => name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
export const truncate = (str='', n=60) => str.length > n ? str.slice(0,n)+'…' : str;
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const STATUS_COLORS = {
  pending:    'badge-yellow',
  confirmed:  'badge-blue',
  processing: 'badge-blue',
  shipped:    'badge-blue',
  in_transit: 'badge-blue',
  delivered:  'badge-green',
  completed:  'badge-green',
  cancelled:  'badge-red',
  refunded:   'badge-gray',
  upcoming:   'badge-orange',
  active:     'badge-green',
  inactive:   'badge-gray',
  approved:   'badge-green',
  rejected:   'badge-red',
  review:     'badge-yellow',
};
