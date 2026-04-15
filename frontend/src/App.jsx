/**
 * Credex Bank - App Root
 * Routing, auth protection, toast setup, WS connection
 */
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore, useWebSocketStore, useAccountStore, useNotificationStore } from './store'

// Layouts
import DashboardLayout from './components/layout/DashboardLayout'
import AdminLayout from './components/layout/AdminLayout'

// Auth Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// User Pages
import DashboardPage from './pages/DashboardPage'
import AccountsPage from './pages/AccountsPage'
import TransactionsPage from './pages/TransactionsPage'
import TransferPage from './pages/TransferPage'
import SavingsPage from './pages/SavingsPage'
import LoansPage from './pages/LoansPage'
import CardsPage from './pages/CardsPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import CurrencyPage from './pages/CurrencyPage'
import SupportPage from './pages/SupportPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminRequests from './pages/admin/AdminRequests'
import AdminUsers from './pages/admin/AdminUsers'
import AdminUserDetail from './pages/admin/AdminUserDetail'
import AdminTransactions from './pages/admin/AdminTransactions'
import AdminSavingsTiers from './pages/admin/AdminSavingsTiers'
import AdminSettings from './pages/admin/AdminSettings'
import AdminSupportPage from './pages/admin/AdminSupportPage';

// ── AUTH GUARD ─────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.is_admin) return <Navigate to="/admin" replace />
  return children
}

function RequireAdmin({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />
  return children
}

function RequireGuest({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  if (isAuthenticated) {
    return <Navigate to={user?.is_admin ? '/admin' : '/dashboard'} replace />
  }
  return children
}

// ── APP INIT ──────────────────────────────────────────────────────────────
function AppInit() {
  const { isAuthenticated, user } = useAuthStore()
  const { connect, disconnect } = useWebSocketStore()
  const { fetchAccounts } = useAccountStore()
  const { fetchNotifications } = useNotificationStore()

  useEffect(() => {
    if (isAuthenticated && user) {
      connect(user.id, user.is_admin)
      if (!user.is_admin) {
        fetchAccounts()
        fetchNotifications()
      }
    } else {
      disconnect()
    }
    return () => {}
  }, [isAuthenticated, user?.id])

  // Hide splash screen
  useEffect(() => {
    const timer = setTimeout(() => window.__hideSplash?.(), 600)
    return () => clearTimeout(timer)
  }, [])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'custom-toast',
          style: { background: '#1a2a44', color: '#e8f0ff', border: '1px solid #243554', borderRadius: '12px', fontSize: '14px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Guest routes */}
        <Route path="/login"    element={<RequireGuest><LoginPage /></RequireGuest>} />
        <Route path="/register" element={<RequireGuest><RegisterPage /></RequireGuest>} />

        {/* User routes */}
        <Route path="/" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"     element={<DashboardPage />} />
          <Route path="accounts"      element={<AccountsPage />} />
          <Route path="transactions"  element={<TransactionsPage />} />
          <Route path="transfer"      element={<TransferPage />} />
          <Route path="savings"       element={<SavingsPage />} />
          <Route path="loans"         element={<LoansPage />} />
          <Route path="cards"         element={<CardsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile"       element={<ProfilePage />} />
          <Route path="currency"      element={<CurrencyPage />} />
          <Route path="support" element={<SupportPage />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminDashboard />} />
          <Route path="requests"          element={<AdminRequests />} />
          <Route path="users"             element={<AdminUsers />} />
          <Route path="users/:userId"     element={<AdminUserDetail />} />
          <Route path="transactions"      element={<AdminTransactions />} />
          <Route path="savings-tiers"     element={<AdminSavingsTiers />} />
          <Route path="settings"          element={<AdminSettings />} />
          <Route path="support" element={<AdminSupportPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
