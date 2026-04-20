import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

export const useFavStore = create(
  persist(
    (set, get) => ({
      items: [], // Array of { id, type, data }

      add: (id, type, data) => {
        const exists = get().items.find(i => i.id === id && i.type === type);
        if (exists) return;
        set(s => ({ items: [...s.items, { id, type, data, addedAt: new Date().toISOString() }] }));
        toast.success('Added to Favorites ❤️');
      },

      remove: (id, type) => {
        set(s => ({ items: s.items.filter(i => !(i.id === id && i.type === type)) }));
        toast('Removed from Favorites', { icon: '💔' });
      },

      toggle: (id, type, data) => {
        const exists = get().items.find(i => i.id === id && i.type === type);
        if (exists) get().remove(id, type);
        else get().add(id, type, data);
      },

      isFav: (id, type) => !!get().items.find(i => i.id === id && i.type === type),

      count: () => get().items.length,

      clear: () => set({ items: [] }),
    }),
    { name: 'sp-favorites' }
  )
);
