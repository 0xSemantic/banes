/**
 * Credex Bank - Utility Helpers
 */
import { format, formatDistanceToNow, parseISO } from 'date-fns'

// ✅ Load default currency from environment
const DEFAULT_CURRENCY = import.meta.env.VITE_DEFAULT_CURRENCY || 'USD'

// ── CURRENCY FORMATTING ────────────────────────────────────────────────────
const CURRENCY_SYMBOLS = { USD: '$', GBP: '£', EUR: '€', NGN: '₦', JPY: '¥', CAD: 'CA$' }

export function formatCurrency(amount, currency = DEFAULT_CURRENCY, compact = false) {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  if (amount == null || isNaN(amount)) return `${symbol}0.00`

  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(2)}M`
  }
  if (compact && Math.abs(amount) >= 1_000) {
    return `${symbol}${(amount / 1_000).toFixed(1)}K`
  }

  return `${symbol}${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

// ── DATE FORMATTING ───────────────────────────────────────────────────────
export function formatDate(dateStr, fmt = 'MMM d, yyyy') {
  if (!dateStr) return '—'
  try { return format(typeof dateStr === 'string' ? parseISO(dateStr) : dateStr, fmt) }
  catch { return dateStr }
}

export function formatDateTime(dateStr) {
  return formatDate(dateStr, 'MMM d, yyyy · h:mm a')
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true }) }
  catch { return '' }
}

// ── ACCOUNT NUMBER MASKING ────────────────────────────────────────────────
export function maskAccount(accountNumber) {
  if (!accountNumber) return '••••••••••'
  return accountNumber.slice(0, 3) + '•'.repeat(accountNumber.length - 6) + accountNumber.slice(-3)
}

// ── TRANSACTION TYPE LABELS ───────────────────────────────────────────────
export const TXN_LABELS = {
  deposit:           { label: 'Deposit',          color: 'success', icon: 'ArrowDownLeft' },
  withdrawal:        { label: 'Withdrawal',       color: 'danger',  icon: 'ArrowUpRight' },
  transfer_out:      { label: 'Transfer Out',     color: 'danger',  icon: 'Send' },
  transfer_in:       { label: 'Transfer In',      color: 'success', icon: 'ArrowDownLeft' },
  loan_disbursement: { label: 'Loan Disbursed',   color: 'info',    icon: 'Landmark' },
  loan_repayment:    { label: 'Loan Repayment',   color: 'warning', icon: 'CreditCard' },
  savings_interest:  { label: 'Interest Earned',  color: 'success', icon: 'TrendingUp' },
  card_payment:      { label: 'Card Payment',     color: 'danger',  icon: 'CreditCard' },
  fee:               { label: 'Bank Fee',         color: 'danger',  icon: 'Minus' },
  reversal:          { label: 'Reversal',         color: 'warning', icon: 'RefreshCcw' },
  admin_credit:      { label: 'Admin Credit',     color: 'success', icon: 'ShieldCheck' },
}

export function getTxnMeta(type) {
  return TXN_LABELS[type] || { label: type?.replace(/_/g, ' ') || 'Transaction', color: 'muted', icon: 'Activity' }
}

// ── STATUS BADGE CLASSES ──────────────────────────────────────────────────
export function getStatusBadge(status) {
  const map = {
    completed: 'badge-success',
    active:    'badge-success',
    verified:  'badge-success',
    approved:  'badge-success',
    pending:   'badge-warning',
    under_review: 'badge-info',
    failed:    'badge-danger',
    rejected:  'badge-danger',
    frozen:    'badge-danger',
    overdue:   'badge-danger',
    resolved:  'badge-muted',
    dismissed: 'badge-muted',
    inactive:  'badge-muted',
  }
  return map[status] || 'badge-muted'
}

// ── KYC STATUS ────────────────────────────────────────────────────────────
export function getKycBadge(status) {
  const map = {
    verified: 'badge-success',
    pending:  'badge-warning',
    rejected: 'badge-danger'
  }
  return map[status] || 'badge-muted'
}

// ── LOAN STATUS COLOR ─────────────────────────────────────────────────────
export function getLoanStatusColor(status) {
  const map = {
    active:       'text-emerald-400',
    completed:    'text-slate-400',
    pending:      'text-amber-400',
    under_review: 'text-cyan-400',
    approved:     'text-emerald-400',
    rejected:     'text-red-400',
    overdue:      'text-red-400',
  }
  return map[status] || 'text-slate-400'
}

// ── CARD GRADIENT THEMES ──────────────────────────────────────────────────
export const CARD_THEMES = {
  'dark-blue':  'from-[#0c1f4a] via-[#1a3a8f] to-[#0f2a6b]',
  'midnight':   'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
  'ocean':      'from-[#0d4f8c] via-[#0877a5] to-[#07c4d4]',
  'forest':     'from-[#064e3b] via-[#065f46] to-[#047857]',
  'royal':      'from-[#4c1d95] via-[#5b21b6] to-[#6d28d9]',
  'premium':    'from-[#7c2d12] via-[#9a3412] to-[#b45309]',
  'rose':       'from-[#881337] via-[#9f1239] to-[#be123c]',
  'slate':      'from-[#1e293b] via-[#334155] to-[#475569]',
}

export function getCardGradient(theme) {
  return CARD_THEMES[theme] || CARD_THEMES['dark-blue']
}

// ── COPY TO CLIPBOARD ─────────────────────────────────────────────────────
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// ── NOTIFICATION TYPE META ─────────────────────────────────────────────────
export const NOTIF_META = {
  deposit_request:    { icon: 'ArrowDownLeft', color: '#34d399', label: 'Deposit Request' },
  withdrawal_request: { icon: 'ArrowUpRight',  color: '#f87171', label: 'Withdrawal Request' },
  transfer_request:   { icon: 'Send',          color: '#60a5fa', label: 'Transfer Request' },
  loan_application:   { icon: 'Landmark',      color: '#a78bfa', label: 'Loan Application' },
  loan_repayment:     { icon: 'CreditCard',    color: '#fbbf24', label: 'Loan Repayment' },
  card_request:       { icon: 'CreditCard',    color: '#22d3ee', label: 'Card Request' },
  card_link_request:  { icon: 'Link',          color: '#22d3ee', label: 'Card Link Request' },
  kyc_submission:     { icon: 'UserCheck',     color: '#fbbf24', label: 'KYC Submission' },
  savings_activate:   { icon: 'PiggyBank',     color: '#34d399', label: 'Savings Activated' },
  new_registration:   { icon: 'UserPlus',      color: '#60a5fa', label: 'New Registration' },
  deposit_approved:   { icon: 'CheckCircle',   color: '#34d399', label: 'Deposit Approved' },
  loan_approved:      { icon: 'CheckCircle',   color: '#34d399', label: 'Loan Approved' },
  card_activated:     { icon: 'CheckCircle',   color: '#34d399', label: 'Card Activated' },
  kyc_verified:       { icon: 'ShieldCheck',   color: '#34d399', label: 'KYC Verified' },
  admin_credit:       { icon: 'ShieldCheck',   color: '#34d399', label: 'Admin Credit' },
  system_alert:       { icon: 'AlertTriangle', color: '#f87171', label: 'System Alert' },
}

export function getNotifMeta(type) {
  return NOTIF_META[type] || { icon: 'Bell', color: '#8899b5', label: 'Notification' }
}