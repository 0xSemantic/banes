/**
 * Credex Bank - Admin Dashboard
 * Full analytics overview for bank administrator
 */
import { useEffect, useState } from 'react'
import { Users, Wallet, TrendingUp, Landmark, PiggyBank, Bell, ArrowLeftRight, DollarSign } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { StatCard, PageHeader, CardSkeleton } from '../../components/ui'

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/analytics')
      ])
      setStats(statsRes.data)
      setAnalytics(analyticsRes.data)
    } catch {} finally { setLoading(false) }
  }

  const STAT_CARDS = stats ? [
    { title: 'Total Users',         value: stats.total_users,                   icon: Users,          color: '#3b82f6' },
    { title: 'Total Accounts',      value: stats.total_accounts,                icon: Wallet,         color: '#10b981' },
    { title: 'Total Deposits',      value: formatCurrency(stats.total_deposits, 'USD', true), icon: TrendingUp, color: '#10b981' },
    { title: 'Total Withdrawals',   value: formatCurrency(stats.total_withdrawals, 'USD', true), icon: DollarSign, color: '#f59e0b' },
    { title: 'Active Loans',        value: stats.total_loans_active,            icon: Landmark,       color: '#8b5cf6' },
    { title: 'Loans Outstanding',   value: formatCurrency(stats.total_loans_amount, 'USD', true), icon: Landmark, color: '#ef4444' },
    { title: 'Savings Plans',       value: stats.total_savings_plans,           icon: PiggyBank,      color: '#06b6d4' },
    { title: 'Pending Requests',    value: stats.pending_requests,              icon: Bell,           color: stats.pending_requests > 0 ? '#ef4444' : '#8899b5' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Admin Dashboard" subtitle="Bank overview and analytics" />
        <button onClick={loadData} className="btn-secondary text-sm">Refresh</button>
      </div>

      {/* Pending requests banner */}
      {stats?.pending_requests > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl cursor-pointer"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
          onClick={() => navigate('/admin/requests')}>
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-red-400 animate-pulse" />
            <div>
              <div className="text-sm font-bold text-red-300">
                {stats.pending_requests} Pending Request{stats.pending_requests !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-red-400/70">Requires your attention</div>
            </div>
          </div>
          <span className="text-xs text-red-400 font-semibold">Review →</span>
        </div>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)
          : STAT_CARDS.map(s => (
              <StatCard key={s.title} {...s} loading={false} />
            ))
        }
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar chart - monthly activity */}
        <div className="bank-card p-5">
          <h3 className="text-sm font-bold text-bank-light mb-4">Monthly Activity</h3>
          {analytics ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.monthly_data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,53,84,0.5)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip
                  contentStyle={{ background: '#1a2a44', border: '1px solid #243554', borderRadius: 10, fontSize: 12 }}
                  formatter={(v) => [formatCurrency(v, 'USD'), '']} />
                <Bar dataKey="deposits" name="Deposits" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="withdrawals" name="Withdrawals" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="skeleton h-48 rounded-xl" />}
        </div>

        {/* Pie chart - transaction types */}
        <div className="bank-card p-5">
          <h3 className="text-sm font-bold text-bank-light mb-4">Transaction Types</h3>
          {analytics ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={analytics.transaction_types.filter(t => t.count > 0)}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  dataKey="count" nameKey="type" paddingAngle={3}>
                  {analytics.transaction_types.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a2a44', border: '1px solid #243554', borderRadius: 10, fontSize: 12 }}
                  formatter={(v, name) => [v + ' txns', name]} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ color: '#8899b5', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="skeleton h-48 rounded-xl" />}
        </div>
      </div>

      {/* Total balance managed */}
      {stats && (
        <div className="bank-card p-5 flex items-center gap-5"
          style={{ background: 'linear-gradient(135deg, rgba(29,78,216,0.15), rgba(8,145,178,0.1))' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(29,78,216,0.2)' }}>
            <DollarSign size={22} className="text-blue-400" />
          </div>
          <div>
            <div className="text-xs text-bank-muted uppercase tracking-wider">Total Assets Under Management</div>
            <div className="text-3xl font-bold text-bank-light font-num mt-1">
              {formatCurrency(stats.total_balance_managed, 'USD')}
            </div>
            <div className="text-xs text-bank-muted mt-0.5">Across all {stats.total_accounts} accounts · {stats.total_transactions} total transactions</div>
          </div>
        </div>
      )}

      {/* Quick action cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Manage Requests', desc: 'Deposits, loans, cards', color: '#ef4444', path: '/admin/requests', count: stats?.pending_requests },
          { label: 'Manage Users',    desc: 'KYC, accounts, freeze', color: '#3b82f6', path: '/admin/users' },
          { label: 'Transactions',    desc: 'Full transaction log',   color: '#10b981', path: '/admin/transactions' },
          { label: 'Savings Tiers',   desc: 'Configure interest rates',color: '#f59e0b', path: '/admin/savings-tiers' },
        ].map(({ label, desc, color, path, count }) => (
          <div key={label} className="bank-card p-4 cursor-pointer hover:border-opacity-70 transition-all"
            style={{ borderColor: `${color}25` }}
            onClick={() => navigate(path)}>
            <div className="text-sm font-bold text-bank-light">{label}</div>
            <div className="text-xs text-bank-muted mt-0.5">{desc}</div>
            {count != null && count > 0 && (
              <div className="mt-2 text-xs font-bold px-2 py-0.5 rounded-full inline-block"
                style={{ background: `${color}20`, color }}>
                {count} pending
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
