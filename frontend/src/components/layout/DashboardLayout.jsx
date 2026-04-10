/**
 * Banesco Bank - Dashboard Layout
 * Sidebar for desktop, bottom nav for mobile
 */
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, CreditCard, ArrowLeftRight, PiggyBank,
  Landmark, Wallet, Bell, User, LogOut, Menu, X,
  TrendingUp, DollarSign, ChevronRight, Wifi, WifiOff
} from 'lucide-react'
import { useAuthStore, useNotificationStore, useWebSocketStore, useAccountStore } from '../../store'
import { formatCurrency } from '../../utils/helpers'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/accounts',      label: 'Accounts',      icon: Wallet },
  { to: '/transactions',  label: 'Transactions',  icon: ArrowLeftRight },
  { to: '/transfer',      label: 'Transfer',      icon: TrendingUp },
  { to: '/savings',       label: 'Savings',       icon: PiggyBank },
  { to: '/loans',         label: 'Loans',         icon: Landmark },
  { to: '/cards',         label: 'Cards',         icon: CreditCard },
  { to: '/currency',      label: 'Exchange Rates',icon: DollarSign },
]

const MOBILE_NAV = [
  { to: '/dashboard',    label: 'Home',    icon: LayoutDashboard },
  { to: '/accounts',     label: 'Accounts',icon: Wallet },
  { to: '/transfer',     label: 'Transfer',icon: ArrowLeftRight },
  { to: '/cards',        label: 'Cards',   icon: CreditCard },
  { to: '/notifications',label: 'Alerts',  icon: Bell },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const { isConnected } = useWebSocketStore()
  const { accounts, getTotalBalance } = useAccountStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const totalBalance = getTotalBalance()
  const primaryAccount = accounts[0]

  return (
    <div className="flex h-full bg-bank-dark">
      {/* ── SIDEBAR (Desktop) ─────────────────────────── */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300',
        'lg:translate-x-0 lg:static lg:flex',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )} style={{ background: 'var(--bg-navy)', borderRight: '1px solid var(--bg-border)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-bank-border">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
            B
          </div>
          <div>
            <div className="font-bold text-base text-bank-light leading-tight">Banesco Bank</div>
            <div className="text-[10px] text-bank-muted">Banking That Works For You</div>
          </div>
          <button className="ml-auto lg:hidden text-bank-muted hover:text-bank-light" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Balance summary */}
        <div className="mx-4 my-4 p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(29,78,216,0.2), rgba(8,145,178,0.15))', border: '1px solid rgba(29,78,216,0.25)' }}>
          <div className="text-xs text-bank-muted mb-1">Total Balance</div>
          <div className="text-xl font-bold text-bank-light font-num">
            {formatCurrency(totalBalance, user?.preferred_currency || 'USD')}
          </div>
          {primaryAccount && (
            <div className="text-[11px] text-bank-muted mt-1">
              A/C: ••••{primaryAccount.account_number?.slice(-4)}
            </div>
          )}
          <div className="flex items-center gap-1 mt-2">
            {isConnected
              ? <><Wifi size={10} className="text-emerald-400" /><span className="text-[10px] text-emerald-400">Live</span></>
              : <><WifiOff size={10} className="text-amber-400" /><span className="text-[10px] text-amber-400">Offline</span></>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-bank-muted px-4 py-2 mt-2">Menu</div>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
          <div className="text-[10px] font-semibold uppercase tracking-widest text-bank-muted px-4 py-2 mt-4">Account</div>
          <NavLink to="/notifications" onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
            <Bell size={16} />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-primary-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/profile" onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
            <User size={16} />
            <span>Profile</span>
          </NavLink>
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-bank-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-bank-light truncate">{user?.full_name}</div>
              <div className="text-[11px] text-bank-muted truncate">{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-bank-muted hover:text-red-400 hover:bg-red-400/10 transition-all">
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── MAIN CONTENT ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-bank-border flex-shrink-0"
          style={{ background: 'var(--bg-navy)' }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-bank-muted hover:text-bank-light transition-colors"
              onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-base font-bold text-bank-light">
                {NAV_ITEMS.find(n => location.pathname.startsWith(n.to))?.label ||
                  (location.pathname === '/notifications' ? 'Notifications' :
                   location.pathname === '/profile' ? 'Profile' : 'Banesco Bank')}
              </h1>
              <p className="text-[11px] text-bank-muted hidden sm:block">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/notifications" className="relative p-2 rounded-xl hover:bg-bank-surface transition-colors text-bank-muted hover:text-bank-light">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary-600 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/profile" className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
              {user?.full_name?.charAt(0) || 'U'}
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ background: 'var(--bg-app)' }}>
          <div className="max-w-6xl mx-auto p-4 lg:p-6 page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ─────────────────────────── */}
      <nav className="mobile-nav lg:hidden">
        {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => clsx('mobile-nav-item', isActive && 'active')}>
            {to === '/notifications' && unreadCount > 0
              ? <div className="relative"><Icon size={22} /><span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary-600 rounded-full text-[8px] font-bold text-white flex items-center justify-center">{unreadCount}</span></div>
              : <Icon size={22} />}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
