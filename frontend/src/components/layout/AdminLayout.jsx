/**
 * Banesco Bank - Admin Layout
 */
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Bell, Users, ArrowLeftRight,
  PiggyBank, Settings, LogOut, Menu, X,
  ShieldCheck, Wifi, WifiOff, ChevronRight, MessageCircle
} from 'lucide-react'
import { useAuthStore, useWebSocketStore } from '../../store'
import api from '../../utils/api'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/admin',              label: 'Dashboard',     icon: LayoutDashboard, exact: true },
  { to: '/admin/requests',     label: 'Requests',      icon: Bell },
  { to: '/admin/users',        label: 'Users',         icon: Users },
  { to: '/admin/transactions', label: 'Transactions',  icon: ArrowLeftRight },
  { to: '/admin/savings-tiers',label: 'Savings Tiers', icon: PiggyBank },
  { to: '/admin/support',      label: 'Support Chat',  icon: MessageCircle }, // <-- ADD THIS
  { to: '/admin/settings',     label: 'Settings',      icon: Settings },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const { user, logout } = useAuthStore()
  const { isConnected } = useWebSocketStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Poll for pending requests count
    const fetchPending = async () => {
      try {
        const res = await api.get('/admin/stats')
        setPendingCount(res.data.pending_requests || 0)
      } catch {}
    }
    fetchPending()
    const interval = setInterval(fetchPending, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const currentLabel = NAV_ITEMS.find(n =>
    n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to)
  )?.label || 'Admin'

  return (
    <div className="flex h-full bg-bank-dark">
      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300',
        'lg:translate-x-0 lg:static',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )} style={{ background: 'var(--bg-navy)', borderRight: '1px solid var(--bg-border)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-bank-border">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>B</div>
          <div>
            <div className="font-bold text-base text-bank-light">Banesco Bank</div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={10} className="text-amber-400" />
              <span className="text-[10px] text-amber-400 font-semibold">Admin Panel</span>
            </div>
          </div>
          <button className="ml-auto lg:hidden text-bank-muted" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Admin badge */}
        <div className="mx-4 my-4 p-3 rounded-xl flex items-center gap-3"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #92400e, #d97706)' }}>
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <div>
            <div className="text-sm font-semibold text-bank-light">{user?.full_name}</div>
            <div className="text-[10px] text-amber-400">System Administrator</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink key={to} to={to} end={exact} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
              <Icon size={16} />
              <span>{label}</span>
              {label === 'Requests' && pendingCount > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-bank-border">
          <div className="flex items-center gap-1.5 mb-3 px-1">
            {isConnected
              ? <><Wifi size={11} className="text-emerald-400" /><span className="text-[10px] text-emerald-400">Live monitoring</span></>
              : <><WifiOff size={11} className="text-amber-400" /><span className="text-[10px] text-amber-400">Connecting...</span></>}
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-bank-muted hover:text-red-400 hover:bg-red-400/10 transition-all">
            <LogOut size={15} /><span>Sign Out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-bank-border"
          style={{ background: 'var(--bg-navy)' }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-bank-muted hover:text-bank-light" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-base font-bold text-bank-light">{currentLabel}</h1>
              <p className="text-[11px] text-bank-muted hidden sm:block">Admin Control Panel · Banesco Bank</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <NavLink to="/admin/requests"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold animate-pulse"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              <Bell size={13} />
              {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
            </NavLink>
          )}
        </header>

        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-app)' }}>
          <div className="max-w-7xl mx-auto p-4 lg:p-6 page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
