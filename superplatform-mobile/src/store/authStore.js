import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:        null,
      profile:     null,
      role:        null,
      loading:     false,
      initialized: false,

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) await get()._loadProfile(session.user);
        } catch (e) {
          console.warn('[AuthStore] init error:', e.message);
        } finally {
          set({ initialized: true });
        }

        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            await get()._loadProfile(session.user);
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, profile: null, role: null });
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            set({ user: session.user });
          }
        });
      },

      _loadProfile: async (user) => {
        try {
          const { data, error } = await supabase
            .from('profiles').select('*').eq('id', user.id).single();
          if (error) throw error;
          set({ user, profile: data, role: data?.role || 'customer' });
        } catch {
          set({ user, profile: { id: user.id, email: user.email, role: 'customer' }, role: 'customer' });
        }
      },

      signUp: async ({ email, password, fullName, phone, role = 'customer' }) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { data: { full_name: fullName, phone, role } },
          });
          if (error) throw error;

          // Detect duplicate email — Supabase returns user with empty identities
          if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
            return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
          }

          if (data.user) {
            await supabase.from('profiles').upsert({
              id: data.user.id, email, full_name: fullName, phone, role,
              is_approved: role === 'customer',
              onboarding_complete: role === 'customer',
              wallet_balance: 0,
              created_at: new Date().toISOString(),
            });
          }
          return { success: true, user: data.user, needsVerification: !data.session };
        } catch (err) {
          return { success: false, error: err.message };
        } finally {
          set({ loading: false });
        }
      },

      signIn: async ({ email, password }) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;

          // ── Email verification check ──
          if (!data.user.email_confirmed_at) {
            await supabase.auth.signOut();
            return {
              success: false,
              error: 'Please verify your email before logging in. Check your inbox for a verification link.',
              needsVerification: true,
            };
          }

          // ── Load profile and check for bans ──
          await get()._loadProfile(data.user);
          const profile = get().profile;

          if (profile?.is_banned || profile?.is_suspended) {
            await supabase.auth.signOut();
            set({ user: null, profile: null, role: null });
            return {
              success: false,
              error: 'Your account has been suspended. Please contact support for assistance.',
            };
          }

          return { success: true, role: get().role };
        } catch (err) {
          return { success: false, error: err.message };
        } finally {
          set({ loading: false });
        }
      },

      resendVerification: async (email) => {
        try {
          const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email.trim().toLowerCase(),
          });
          if (error) throw error;
          return { success: true };
        } catch (err) {
          return { success: false, error: err.message };
        }
      },

      resetPassword: async (email) => {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
          if (error) throw error;
          return { success: true };
        } catch (err) {
          return { success: false, error: err.message };
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, role: null });
      },

      updateProfile: async (updates) => {
        const user = get().user;
        if (!user) return false;
        set({ loading: true });
        try {
          const { data, error } = await supabase
            .from('profiles').update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', user.id).select().single();
          if (error) throw error;
          set({ profile: data });
          return true;
        } catch {
          return false;
        } finally {
          set({ loading: false });
        }
      },

      uploadAvatar: async (uri) => {
        const user = get().user;
        if (!user) return null;
        try {
          const ext      = uri.split('.').pop()?.toLowerCase() || 'jpg';
          const path     = `avatars/${user.id}.${ext}`;
          const response = await fetch(uri);
          const blob     = await response.blob();
          const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: `image/${ext}` });
          if (uploadErr) throw uploadErr;
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
          await get().updateProfile({ avatar_url: publicUrl });
          return publicUrl;
        } catch {
          return null;
        }
      },
    }),
    {
      name:    'sp-mobile-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ role: s.role }),
    }
  )
);
