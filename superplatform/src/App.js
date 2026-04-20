import React, { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Layout
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';

// Auth
import { ProtectedRoute, GuestRoute } from './components/auth/ProtectedRoute';

// Public pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import AboutPage from './pages/AboutPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import FAQPage from './pages/FAQPage';

// Category pages
import EcommercePage from './pages/EcommercePage';
import TransportPage from './pages/TransportPage';
import HealthPage from './pages/HealthPage';
import BeautyPage from './pages/BeautyPage';
import HomeServicesPage from './pages/HomeServicesPage';
import RealEstatePage from './pages/RealEstatePage';
import RentalsPage from './pages/RentalsPage';

// Dashboards
import CustomerDashboard from './pages/CustomerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Admin auth (hidden routes)
import AdminLoginPage from './pages/AdminLoginPage';
import AdminRegisterPage from './pages/AdminRegisterPage';

// User pages
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import FavoritesPage from './pages/FavoritesPage';
import ProviderDetailPage from './pages/ProviderDetailPage';
import ProductDetailPage from './pages/ProductDetailPage';
import AccountPage from './pages/AccountPage';
import WalletPage from './pages/WalletPage';
import SellItemPage from './pages/SellItemPage';

import ErrorBoundary from './components/common/ErrorBoundary';

// ─── Theme context ───────────────────────────────────────────────────────────
const ThemeContext = createContext({ isDark: false, toggleTheme: () => {} });
export const useWebTheme = () => useContext(ThemeContext);

// ─── Layout wrapper ──────────────────────────────────────────────────────────
function Layout({ children, noFooter = false }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <Navbar />
      <main className="flex-1">{children}</main>
      {!noFooter && <Footer />}
    </div>
  );
}

// ─── Role-based dashboard redirect ───────────────────────────────────────────
function DashboardRedirect() {
  const role = useAuthStore(s => s.role);
  if (role === 'admin') return <Navigate to="/empire" replace />;
  if (role === 'provider') return <Navigate to="/provider" replace />;
  return <Navigate to="/dashboard" replace />;
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const initialize = useAuthStore(s => s.initialize);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('sp_theme');
    return saved === 'dark';
  });

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('sp_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster
          position="top-right"
          gutter={8}
          toastOptions={{
            duration: 3500,
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text)',
              border: '1px solid rgba(249,115,22,0.25)',
              borderRadius: '14px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        <Routes>
          {/* ── Public ─────────────────────────────────────────────────── */}
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/ecommerce" element={<Layout><EcommercePage /></Layout>} />
          <Route path="/transport" element={<Layout><TransportPage /></Layout>} />
          <Route path="/health" element={<Layout><HealthPage /></Layout>} />
          <Route path="/beauty" element={<Layout><BeautyPage /></Layout>} />
          <Route path="/home-services" element={<Layout><HomeServicesPage /></Layout>} />
          <Route path="/real-estate" element={<Layout><RealEstatePage /></Layout>} />
          <Route path="/rentals" element={<Layout><RentalsPage /></Layout>} />
          <Route path="/marketplace" element={<Navigate to="/ecommerce" replace />} />
          <Route path="/sell" element={
            <ProtectedRoute>
              <Layout><SellItemPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/favorites" element={<Layout><FavoritesPage /></Layout>} />
          <Route path="/account" element={<Layout><AccountPage /></Layout>} />
          <Route path="/about" element={<Layout><AboutPage /></Layout>} />
          <Route path="/privacy" element={<Layout><PrivacyPage /></Layout>} />
          <Route path="/terms" element={<Layout><TermsPage /></Layout>} />
          <Route path="/faq" element={<Layout><FAQPage /></Layout>} />

          {/* Provider/Product detail — accessible to all */}
          <Route path="/provider/:id" element={<Layout><ProviderDetailPage /></Layout>} />
          <Route path="/product/:id" element={<Layout><ProductDetailPage /></Layout>} />

          {/* ── Auth (public — customer/provider only) ─────────────────── */}
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

          {/* ── Empire (hidden admin auth & dashboard) ──────────────────── */}
          <Route path="/empire/login" element={<AdminLoginPage />} />
          <Route path="/empire/register" element={<AdminRegisterPage />} />
          <Route path="/empire" element={
            <ProtectedRoute roles={['admin']}>
              <Layout noFooter><AdminDashboard /></Layout>
            </ProtectedRoute>
          } />

          {/* ── Smart dashboard redirect ────────────────────────────────── */}
          <Route path="/me" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

          {/* ── Customer ───────────────────────────────────────────────── */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={['customer']}>
              <Layout noFooter><CustomerDashboard /></Layout>
            </ProtectedRoute>
          } />

          {/* ── Provider ───────────────────────────────────────────────── */}
          <Route path="/provider" element={
            <ProtectedRoute roles={['provider']}>
              <Layout noFooter><ProviderDashboard /></Layout>
            </ProtectedRoute>
          } />

          {/* ── Shared user pages ───────────────────────────────────────── */}
          <Route path="/profile" element={
            <ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute><Layout noFooter><ChatPage /></Layout></ProtectedRoute>
          } />
          <Route path="/wallet" element={
            <ProtectedRoute><Layout><WalletPage /></Layout></ProtectedRoute>
          } />
          <Route path="/chat/:id" element={
            <ProtectedRoute><Layout noFooter><ChatPage /></Layout></ProtectedRoute>
          } />

          {/* ── Trap: /admin returns 404 (honeypot for attackers) ────────── */}
          <Route path="/admin" element={<Layout><NotFoundPage /></Layout>} />
          <Route path="/admin/*" element={<Layout><NotFoundPage /></Layout>} />

          {/* ── 404 ────────────────────────────────────────────────────── */}
          <Route path="*" element={<Layout><NotFoundPage /></Layout>} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
    </ThemeContext.Provider>
  );
}
