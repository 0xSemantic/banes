/**
 * Credex Bank - Dashboard Page
 * Main overview with balance, quick actions, recent transactions, chart
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft, ArrowUpRight, Send, PiggyBank, Landmark, CreditCard,
  TrendingUp, Eye, EyeOff, RefreshCw, ChevronRight, Plus,
  ArrowLeftRight, DollarSign, Shield, Zap
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useAuthStore, useAccountStore } from '../store'
import api from '../utils/api'
import { formatCurrency, formatDate, getTxnMeta, getStatusBadge, timeAgo } from '../utils/helpers'
import { CardSkeleton, EmptyState, StatusBadge } from '../components/ui'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { accounts, selectedAccount, fetchAccounts, selectAccount, isLoading } = useAccountStore()
  const [transactions, setTransactions] = useState([])
  const [chartData, setChartData] = useState([])
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [loadingTxn, setLoadingTxn] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [selectedAccount])

  const loadData = async () => {
    if (selectedAccount) {
      try {
        setLoadingTxn(true)
        const res = await api.get(`/accounts/${selectedAccount.id}/transactions?limit=5`)
        setTransactions(res.data)
        buildChartData(res.data)
      } catch {} finally { setLoadingTxn(false) }
    } else { setLoadingTxn(false) }
  }

  const buildChartData = (txns) => {
    // Build 7-day running balance chart
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const label = d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
      const dayTxns = txns.filter(t => {
        const td = new Date(t.created_at); return td.toDateString() === d.toDateString()
      })
      const credit = dayTxns.filter(t => !t.is_debit).reduce((s, t) => s + t.amount, 0)
      const debit  = dayTxns.filter(t => t.is_debit).reduce((s, t) => s + t.amount, 0)
      days.push({ day: label, credit: Math.round(credit), debit: Math.round(debit) })
    }
    setChartData(days)
  }

  const currency = user?.preferred_currency || 'USD'
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)

  const QUICK_ACTIONS = [
    { icon: ArrowDownLeft, label: 'Deposit',    color: '#10b981', bg: 'rgba(16,185,129,0.12)', path: '/accounts' },
    { icon: ArrowUpRight,  label: 'Withdraw',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  path: '/accounts' },
    { icon: Send,          label: 'Transfer',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', path: '/transfer' },
    { icon: PiggyBank,     label: 'Savings',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', path: '/savings' },
    { icon: Landmark,      label: 'Loans',      color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  path: '/loans' },
    { icon: CreditCard,    label: 'Cards',      color: '#f97316', bg: 'rgba(249,115,22,0.12)', path: '/cards' },
    { icon: DollarSign,    label: 'Exchange',   color: '#ec4899', bg: 'rgba(236,72,153,0.12)', path: '/currency' },
    { icon: ArrowLeftRight,label: 'History',    color: '#64748b', bg: 'rgba(100,116,139,0.12)',path: '/transactions' },
  ]

  return (
    <div className="space-y-6">
      {/* ── GREETING ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-bank-light">
            Good {getGreeting()}, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-bank-muted mt-0.5">Here's your financial overview</p>
        </div>
        <button onClick={() => { fetchAccounts(); loadData() }}
          className="p-2.5 rounded-xl hover:bg-bank-surface transition-colors text-bank-muted hover:text-bank-light">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ── BALANCE CARD ──────────────────────────────── */}
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d2559 0%, #1a3a8f 40%, #0d4f8c 100%)', boxShadow: '0 8px 40px rgba(29,78,216,0.3)' }}>
        {/* Decorative elements */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
        <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #22d3ee, transparent)' }} />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-blue-200/80 font-medium">Total Balance</div>
            <button onClick={() => setBalanceVisible(v => !v)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-blue-200/70 hover:text-white">
              {balanceVisible ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>

          <div className="mb-1">
            <span className="text-3xl sm:text-4xl font-bold text-white font-num">
              {balanceVisible ? formatCurrency(totalBalance, currency) : '••••••'}
            </span>
          </div>
          <div className="text-sm text-blue-200/70">
            Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </div>

          {/* Account tabs */}
          {accounts.length > 1 && (
            <div className="flex gap-2 mt-4">
              {accounts.map(acc => (
                <button key={acc.id} onClick={() => selectAccount(acc)}
                  className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    selectedAccount?.id === acc.id
                      ? 'bg-white text-blue-900'
                      : 'bg-white/10 text-blue-200 hover:bg-white/20')}>
                  {acc.account_type.charAt(0).toUpperCase() + acc.account_type.slice(1)}
                  {' '}••{acc.account_number?.slice(-2)}
                </button>
              ))}
            </div>
          )}

          {/* KYC alert */}
          {user?.kyc_status !== 'verified' && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Shield size={13} className="text-amber-400 flex-shrink-0" />
              <span className="text-amber-200">
                KYC verification pending —{' '}
                <button onClick={() => navigate('/profile')} className="underline font-semibold">verify now</button>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK ACTIONS ─────────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold text-bank-muted uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ icon: Icon, label, color, bg, path }) => (
            <button key={label} onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: bg, border: `1px solid ${color}25` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon size={17} style={{ color }} />
              </div>
              <span className="text-[10px] font-semibold text-bank-muted leading-tight text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CHART ─────────────────────────────────────── */}
      <div className="bank-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-bank-light">Activity (7 days)</h2>
            <p className="text-xs text-bank-muted">Credits vs debits</p>
          </div>
          <TrendingUp size={16} className="text-bank-muted" />
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="debitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,53,84,0.5)" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
            <Tooltip
              contentStyle={{ background: '#1a2a44', border: '1px solid #243554', borderRadius: 10, fontSize: 12 }}
              formatter={(v, name) => [formatCurrency(v, currency), name === 'credit' ? 'Credits' : 'Debits']} />
            <Area type="monotone" dataKey="credit" stroke="#10b981" strokeWidth={2} fill="url(#creditGrad)" dot={false} />
            <Area type="monotone" dataKey="debit" stroke="#f87171" strokeWidth={2} fill="url(#debitGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── RECENT TRANSACTIONS ────────────────────────── */}
      <div className="bank-card">
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h2 className="text-sm font-bold text-bank-light">Recent Transactions</h2>
            <p className="text-xs text-bank-muted">Latest activity on your account</p>
          </div>
          <button onClick={() => navigate('/transactions')}
            className="text-xs text-blue-400 font-semibold flex items-center gap-1 hover:text-blue-300">
            View all <ChevronRight size={13} />
          </button>
        </div>

        {loadingTxn ? (
          <div className="px-5 pb-5 space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="No transactions yet"
            description="Deposit funds to get started with your banking experience." />
        ) : (
          <div className="px-2 pb-3">
            {transactions.map(txn => {
              const meta = getTxnMeta(txn.transaction_type)
              return (
                <div key={txn.id} className="txn-row">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: txn.is_debit ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)' }}>
                    <ArrowIconDynamic name={meta.icon} size={16}
                      color={txn.is_debit ? '#f87171' : '#34d399'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-bank-light truncate">{meta.label}</div>
                    <div className="text-xs text-bank-muted truncate">{txn.description || 'Transaction'}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={clsx('text-sm font-bold font-num', txn.is_debit ? 'amount-debit' : 'amount-credit')}>
                      {txn.is_debit ? '-' : '+'}{formatCurrency(txn.amount, txn.currency)}
                    </div>
                    <div className="text-[10px] text-bank-muted">{timeAgo(txn.created_at)}</div>
                  </div>
                  <StatusBadge status={txn.status} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── ACCOUNTS OVERVIEW ─────────────────────────── */}
      {accounts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-bank-light">My Accounts</h2>
            <button onClick={() => navigate('/accounts')}
              className="text-xs text-blue-400 font-semibold flex items-center gap-1 hover:text-blue-300">
              Manage <ChevronRight size={13} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {accounts.map(acc => (
              <div key={acc.id} className="bank-card p-4 cursor-pointer hover:border-blue-500/40 transition-colors"
                onClick={() => navigate('/accounts')}>
                <div className="flex items-center justify-between mb-3">
                  <span className="badge badge-info text-[10px]">{acc.account_type.toUpperCase()}</span>
                  {acc.is_frozen && <span className="badge badge-danger text-[10px]">FROZEN</span>}
                </div>
                <div className="text-lg font-bold text-bank-light font-num">
                  {balanceVisible ? formatCurrency(acc.balance, acc.currency) : '••••••'}
                </div>
                <div className="text-xs text-bank-muted mt-1 font-mono">
                  {acc.account_number?.replace(/(.{4})/g, '$1 ').trim()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function ArrowIconDynamic({ name, size, color }) {
  const icons = {
    ArrowDownLeft: ArrowDownLeft, ArrowUpRight: ArrowUpRight, Send,
    TrendingUp: TrendingUp, Landmark, CreditCard, RefreshCw
  }
  const Icon = icons[name] || ArrowLeftRight
  return <Icon size={size} color={color} />
}
