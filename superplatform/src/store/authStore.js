import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      role: null,
      loading: false,
      initialized: false,

      // ── Initialize (called once on app mount) ──────────────────────────
      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) await get()._loadProfile(session.user);
        } catch (e) {
          console.warn('Auth init:', e.message);
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
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          set({ user, profile: data, role: data?.role || 'customer' });
        } catch {
          set({ user, profile: { id: user.id, email: user.email, role: 'customer' }, role: 'customer' });
        }
      },

      // ── Sign Up ────────────────────────────────────────────────────────
      signUp: async ({ email, password, fullName, phone, role = 'customer' }) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName, phone, role },
              emailRedirectTo: `${window.location.origin}/login`,
            },
          });
          if (error) throw error;

          // Supabase returns identities: [] when email already exists
          if (data.user && !data.user.identities?.length) {
            return {
              success: false,
              duplicate: true,
              error: 'This email is already registered. Please log in or verify your email.',
            };
          }

          // Create profile record immediately (so we have the role stored)
          if (data.user) {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email,
              full_name: fullName,
              phone: phone || null,
              role,
              wallet_balance: 0,
            }, { onConflict: 'id' });
          }

          return { success: true, needsVerification: true, email };
        } catch (err) {
          toast.error(err.message || 'Registration failed.');
          return { success: false, error: err.message };
        } finally {
          set({ loading: false });
        }
      },

      // ── Sign In ────────────────────────────────────────────────────────
      signIn: async ({ email, password }) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;

          // Block unverified users
          if (!data.user.email_confirmed_at) {
            await supabase.auth.signOut();
            return {
              success: false,
              needsVerification: true,
              email,
              error: 'Please verify your email before logging in.',
            };
          }

          // Block banned users
          const { data: profile } = await supabase
            .from('profiles').select('is_banned, ban_reason').eq('id', data.user.id).single();
          if (profile?.is_banned) {
            await supabase.auth.signOut();
            toast.error(`Account suspended: ${profile.ban_reason || 'Contact support'}`);
            return { success: false };
          }

          await get()._loadProfile(data.user);
          toast.success('Welcome back! 👋');
          return { success: true, role: get().role };
        } catch (err) {
          toast.error(err.message || 'Invalid credentials.');
          return { success: false };
        } finally {
          set({ loading: false });
        }
      },

      // ── Sign Out ───────────────────────────────────────────────────────
      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, role: null });
        toast('Signed out successfully.', { icon: '👋' });
      },

      // ── Resend Verification Email ──────────────────────────────────────
      resendVerification: async (email) => {
        set({ loading: true });
        try {
          const { error } = await supabase.auth.resend({ type: 'signup', email });
          if (error) throw error;
          toast.success('Verification email resent! Check your inbox.');
          return true;
        } catch (err) {
          toast.error(err.message || 'Failed to resend email.');
          return false;
        } finally {
          set({ loading: false });
        }
      },

      // ── Password Reset ─────────────────────────────────────────────────
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) { toast.error(error.message); return false; }
        toast.success('Reset link sent! Check your inbox.');
        return true;
      },

      // ── Update Password ────────────────────────────────────────────────
      updatePassword: async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) { toast.error(error.message); return false; }
        toast.success('Password updated!');
        return true;
      },

      // ── Update Profile ─────────────────────────────────────────────────
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
          toast.success('Profile updated!');
          return true;
        } catch (err) {
          toast.error(err.message);
          return false;
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'sp-auth',
      partialize: (s) => ({ role: s.role }),
    }
  )
);
