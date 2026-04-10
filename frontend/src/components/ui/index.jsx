/**
 * Credex Bank - Reusable UI Components
 */
import { X, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react'
import clsx from 'clsx'

// ── MODAL ──────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  if (!isOpen) return null
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={clsx('bank-card w-full animate-in', maxWidth)}>
        <div className="flex items-center justify-between p-5 border-b border-bank-border">
          <h3 className="text-base font-bold text-bank-light">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── CONFIRM DIALOG ─────────────────────────────────────────────────────────
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  if (!isOpen) return null
  return (
    <div className="modal-backdrop">
      <div className="bank-card w-full max-w-sm animate-in">
        <div className="p-6">
          <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center mb-4',
            danger ? 'bg-red-500/15' : 'bg-primary-600/15')}>
            {danger ? <AlertTriangle size={22} className="text-red-400" /> : <Info size={22} className="text-blue-400" />}
          </div>
          <h3 className="text-base font-bold text-bank-light mb-2">{title}</h3>
          <p className="text-sm text-bank-muted mb-6">{message}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={onConfirm} className={clsx('flex-1', danger ? 'btn-danger' : 'btn-primary')}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SKELETON ───────────────────────────────────────────────────────────────
export function Skeleton({ className = '', lines = 1 }) {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={clsx('skeleton h-4 rounded-lg', i === 0 ? 'w-3/4' : i % 2 === 0 ? 'w-full' : 'w-5/6')} />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bank-card p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="skeleton w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-1/2 rounded" />
          <div className="skeleton h-3 w-1/3 rounded" />
        </div>
      </div>
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
    </div>
  )
}

// ── EMPTY STATE ────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--bg-surface)' }}>
        {Icon && <Icon size={28} className="text-bank-muted" />}
      </div>
      <h3 className="text-base font-semibold text-bank-light mb-1">{title}</h3>
      {description && <p className="text-sm text-bank-muted max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  )
}

// ── STAT CARD ──────────────────────────────────────────────────────────────
export function StatCard({ title, value, subtitle, icon: Icon, color = '#3b82f6', trend, loading }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20` }}>
          {Icon && <Icon size={18} style={{ color }} />}
        </div>
        {trend != null && (
          <span className={clsx('text-xs font-semibold', trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-6 w-24 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      ) : (
        <div>
          <div className="text-2xl font-bold text-bank-light font-num">{value}</div>
          <div className="text-xs text-bank-muted mt-0.5">{title}</div>
          {subtitle && <div className="text-xs text-bank-muted/70 mt-0.5">{subtitle}</div>}
        </div>
      )}
    </div>
  )
}

// ── BADGE ──────────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    completed:    ['badge-success', 'Completed'],
    active:       ['badge-success', 'Active'],
    verified:     ['badge-success', 'Verified'],
    approved:     ['badge-success', 'Approved'],
    pending:      ['badge-warning', 'Pending'],
    under_review: ['badge-info',    'Under Review'],
    failed:       ['badge-danger',  'Failed'],
    rejected:     ['badge-danger',  'Rejected'],
    frozen:       ['badge-danger',  'Frozen'],
    overdue:      ['badge-danger',  'Overdue'],
    resolved:     ['badge-muted',   'Resolved'],
    dismissed:    ['badge-muted',   'Dismissed'],
    blocked:      ['badge-danger',  'Blocked'],
    inactive:     ['badge-muted',   'Inactive'],
    disbursed:    ['badge-info',    'Disbursed'],
  }
  const [cls, label] = map[status] || ['badge-muted', status || '—']
  return <span className={clsx('badge', cls)}>{label}</span>
}

// ── LOADING BUTTON ─────────────────────────────────────────────────────────
export function LoadingButton({ loading, children, className = 'btn-primary', ...props }) {
  return (
    <button className={clsx(className, 'relative')} disabled={loading} {...props}>
      {loading && <span className="spinner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />}
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
    </button>
  )
}

// ── SECTION HEADER ─────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-base font-bold text-bank-light">{title}</h2>
        {subtitle && <p className="text-xs text-bank-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── FORM GROUP ─────────────────────────────────────────────────────────────
export function FormGroup({ label, error, children, hint }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="bank-label">{label}</label>}
      {children}
      {hint && !error && <p className="text-[11px] text-bank-muted">{hint}</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}

// ── AMOUNT DISPLAY ─────────────────────────────────────────────────────────
const CURRENCY_SYMBOLS_UI = { USD: '$', GBP: '£', EUR: '€', NGN: '₦', JPY: '¥', CAD: 'CA$' }
function fmtCurrency(amount, currency = 'USD') {
  const sym = CURRENCY_SYMBOLS_UI[currency] || currency
  return `${sym}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function AmountDisplay({ amount, currency = 'USD', isDebit, size = 'base' }) {
  const sizeClass = { xs: 'text-xs', sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl' }[size]
  return (
    <span className={clsx('font-bold font-num', sizeClass, isDebit ? 'amount-debit' : 'amount-credit')}>
      {isDebit ? '-' : '+'}{fmtCurrency(Math.abs(amount), currency)}
    </span>
  )
}

// ── PAGE HEADER ────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── ALERT BANNER ───────────────────────────────────────────────────────────
export function Alert({ type = 'info', title, message, onDismiss }) {
  const styles = {
    info:    { bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.25)',   icon: Info,         color: '#22d3ee' },
    success: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', icon: CheckCircle,  color: '#34d399' },
    warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', icon: AlertTriangle,color: '#fbbf24' },
    danger:  { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)',  icon: AlertTriangle,color: '#f87171' },
  }
  const s = styles[type]
  const Icon = s.icon
  return (
    <div className="flex gap-3 p-4 rounded-xl mb-4" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <Icon size={18} style={{ color: s.color }} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <div className="text-sm font-semibold" style={{ color: s.color }}>{title}</div>}
        {message && <div className="text-sm text-bank-muted mt-0.5">{message}</div>}
      </div>
      {onDismiss && <button onClick={onDismiss} className="text-bank-muted hover:text-bank-light"><X size={14} /></button>}
    </div>
  )
}
