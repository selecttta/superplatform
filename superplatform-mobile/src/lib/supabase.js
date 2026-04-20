import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── AsyncStorage adapter — SecureStore has a 2048 byte limit ─────────────────
// Supabase JWT tokens often exceed 2048 bytes, causing SecureStore to fail.
// AsyncStorage has no size limit and is the recommended approach for Supabase RN.
const AsyncStorageAdapter = {
  getItem:    (key) => AsyncStorage.getItem(key),
  setItem:    (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error(
    '[SuperPlatform] Missing env vars: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set in .env'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:            AsyncStorageAdapter,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false, // MUST be false in React Native
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export default supabase;
