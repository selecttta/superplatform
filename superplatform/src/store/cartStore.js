import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      // Alias — some components call add(), others call addItem()
      add: (product) => get().addItem(product),

      addItem: (product) => {
        const items = get().items;
        const found = items.find(i => i.id === product.id);
        if (found) {
          set({ items: items.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) });
        } else {
          set({ items: [...items, { ...product, qty: 1 }] });
        }
      },

      removeItem: (id) => set({ items: get().items.filter(i => i.id !== id) }),

      updateQty: (id, qty) => {
        if (qty <= 0) { get().removeItem(id); return; }
        set({ items: get().items.map(i => i.id === id ? { ...i, qty } : i) });
      },

      clearCart: () => set({ items: [] }),

      total:    () => get().items.reduce((s, i) => s + i.price * i.qty, 0),
      count:    () => get().items.reduce((s, i) => s + i.qty, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.qty, 0),
    }),
    { name: 'sp-cart' }
  )
);
