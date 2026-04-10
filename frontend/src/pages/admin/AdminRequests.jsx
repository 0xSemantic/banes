/**
 * Credex Bank - Admin Requests Page
 * Central hub for all user requests: deposits, withdrawals, loans, cards, KYC
 */
import { useEffect, useState, useCallback } from 'react'
import { Bell, CheckCircle, XCircle, Clock, Filter, RefreshCw, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import api from '../../utils/api'
import { formatCurrency, formatDateTime, getNotifMeta, timeAgo } from '../../utils/helpers'
import { PageHeader, Modal, FormGroup, LoadingButton, StatusBadge, EmptyState } from '../../components/ui'
import { useWebSocketStore } from '../../store'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import * as Icons from 'lucide-react'

const STATUS_FILTERS = [
  { val: 'all',      label: 'All' },
  { val: 'pending',  label: 'Pending', color: '#f59e0b' },
  { val: 'resolved', label: 'Resolved' },
  { val: 'dismissed',label: 'Dismissed' },
]

const TYPE_FILTERS = [
  { val: 'all',               label: 'All Types' },
  { val: 'deposit_request',   label: 'Deposits' },
  { val: 'withdrawal_request',label: 'Withdrawals' },
  { val: 'transfer_request',  label: 'Transfers' },
  { val: 'loan_application',  label: 'Loans' },
  { val: 'loan_repayment',    label: 'Repayments' },
  { val: 'card_request',      label: 'Cards' },
  { val: 'card_link_request', label: 'Card Links' },
  { val: 'kyc_submission',    label: 'KYC' },
  { val: 'new_registration',  label: 'Registrations' },
]

export default function AdminRequests() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [respondModal, setRespondModal] = useState(null)
  const [respondForm, setRespondForm] = useState({ action: '', response_message: '', amount: '' })
  const [submitting, setSubmitting] = useState(false)
  const { isConnected } = useWebSocketStore()

  useEffect(() => { loadNotifications() }, [statusFilter])

  // Refresh on new WS message
  useEffect(() => {
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [statusFilter])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const params = statusFilter !== 'all' ? `?status_filter=${statusFilter}` : ''
      const res = await api.get(`/admin/notifications${params}`)
      setNotifications(res.data)
    } catch {} finally { setLoading(false) }
  }

  const filtered = notifications.filter(n =>
    typeFilter === 'all' || n.notification_type === typeFilter
  )

  const pendingCount = notifications.filter(n => n.status === 'pending').length

  const openRespond = (notif, defaultAction = '') => {
    setRespondModal(notif)
    setRespondForm({
      action: defaultAction,
      response_message: '',
      amount: notif.reference_amount || ''
    })
  }

  const handleRespond = async () => {
    if (!respondForm.action) { toast.error('Select an action'); return }
    setSubmitting(true)
    try {
      await api.post('/admin/notifications/respond', {
        notification_id: respondModal.id,
        action: respondForm.action,
        response_message: respondForm.response_message || null,
        amount: respondForm.amount ? Number(respondForm.amount) : null
      })
      toast.success(`Request ${respondForm.action}d successfully`)
      setRespondModal(null)
      loadNotifications()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to process')
    } finally { setSubmitting(false) }
  }

  const quickApprove = async (notif) => {
    setSubmitting(true)
    try {
      await api.post('/admin/notifications/respond', {
        notification_id: notif.id,
        action: 'approve',
        amount: notif.reference_amount ? Number(notif.reference_amount) : null
      })
      toast.success('Approved!')
      loadNotifications()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const quickReject = async (notif) => {
    setSubmitting(true)
    try {
      await api.post('/admin/notifications/respond', {
        notification_id: notif.id,
        action: 'reject',
        response_message: 'Request declined by admin'
      })
      toast.success('Rejected')
      loadNotifications()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const APPROVABLE = ['deposit_request', 'withdrawal_request', 'transfer_request', 'loan_application', 'loan_repayment', 'card_request', 'card_link_request', 'kyc_submission']

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <PageHeader title="Requests" subtitle="Manage all user banking requests" />
        <div className="flex items-center gap-2">
          {isConnected && <span className="flex items-center gap-1.5 text-xs text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400" />Live</span>}
          <button onClick={loadNotifications} className="btn-secondary text-sm p-2.5">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <Bell size={15} className="text-red-400 animate-pulse" />
          <span className="text-sm text-red-300 font-semibold">{pendingCount} pending request{pendingCount !== 1 ? 's' : ''} awaiting review</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(f => (
            <button key={f.val} onClick={() => setStatusFilter(f.val)}
              className={clsx('px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                statusFilter === f.val ? 'bg-primary-700 text-white' : 'text-bank-muted'
              )} style={statusFilter !== f.val ? { background: 'var(--bg-surface)' } : {}}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:ml-auto">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bank-select text-xs py-2 pl-3 pr-8">
            {TYPE_FILTERS.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bell} title="No requests" description={statusFilter === 'pending' ? 'No pending requests — you\'re all caught up!' : 'No requests match your filters.'} />
      ) : (
        <div className="space-y-3">
          {filtered.map(notif => {
            const meta = getNotifMeta(notif.notification_type)
            const IconComp = Icons[meta.icon] || Icons.Bell
            const isExpanded = expandedId === notif.id
            const isPending = notif.status === 'pending'
            const canApprove = APPROVABLE.includes(notif.notification_type)

            return (
              <div key={notif.id} className="bank-card overflow-hidden">
                {/* Header row */}
                <div className="flex items-start gap-4 p-4"
                  onClick={() => setExpandedId(isExpanded ? null : notif.id)}
                  style={{ cursor: 'pointer' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${meta.color}15` }}>
                    <IconComp size={16} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-bank-light">{notif.title}</span>
                      <StatusBadge status={notif.status} />
                      {isPending && <span className="badge badge-warning text-[10px]">Action Required</span>}
                    </div>
                    <div className="text-xs text-bank-muted mt-0.5">
                      {notif.user_name && <span className="font-semibold text-blue-400">{notif.user_name}</span>}
                      {notif.user_name && ' · '}
                      {notif.message?.slice(0, 80)}{notif.message?.length > 80 ? '...' : ''}
                    </div>
                    <div className="text-[10px] text-bank-muted/60 mt-0.5">{timeAgo(notif.created_at)}</div>
                  </div>

                  {/* Quick actions (pending only) */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {isPending && canApprove && (
                      <>
                        <button onClick={() => quickApprove(notif)} disabled={submitting}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button onClick={() => quickReject(notif)} disabled={submitting}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                          <XCircle size={12} /> Reject
                        </button>
                      </>
                    )}
                    {isPending && !canApprove && (
                      <button onClick={() => openRespond(notif, 'resolve')} disabled={submitting}
                        className="btn-ghost text-xs py-1.5 px-3">
                        <MessageSquare size={12} /> Respond
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={14} className="text-bank-muted" /> : <ChevronDown size={14} className="text-bank-muted" />}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-bank-border px-4 pb-4 pt-3 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-bank-muted uppercase tracking-wider mb-1">Full Message</div>
                        <div className="text-bank-light">{notif.message}</div>
                      </div>
                      <div className="space-y-2">
                        {notif.user_email && (
                          <div><span className="text-xs text-bank-muted">Email: </span><span className="text-bank-light text-xs">{notif.user_email}</span></div>
                        )}
                        {notif.reference_amount && (
                          <div><span className="text-xs text-bank-muted">Amount: </span><span className="text-bank-light font-bold font-num">{formatCurrency(Number(notif.reference_amount), 'USD')}</span></div>
                        )}
                        <div><span className="text-xs text-bank-muted">Received: </span><span className="text-bank-light text-xs">{formatDateTime(notif.created_at)}</span></div>
                        {notif.admin_response && (
                          <div className="p-2 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>
                            Response: {notif.admin_response}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    {notif.metadata && Object.keys(notif.metadata).length > 0 && (
                      <div className="p-3 rounded-xl text-xs font-mono" style={{ background: 'var(--bg-surface)' }}>
                        {Object.entries(notif.metadata).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-bank-muted w-32 flex-shrink-0">{k}:</span>
                            <span className="text-bank-light">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Full action panel */}
                    {isPending && (
                      <button onClick={() => openRespond(notif)} className="btn-secondary text-xs py-2">
                        <MessageSquare size={12} /> Full Response Panel
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Response Modal */}
      <Modal isOpen={!!respondModal} onClose={() => setRespondModal(null)} title="Respond to Request" maxWidth="max-w-lg">
        {respondModal && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-surface)' }}>
              <div className="font-semibold text-bank-light mb-1">{respondModal.title}</div>
              <div className="text-xs text-bank-muted">{respondModal.message}</div>
              {respondModal.reference_amount && (
                <div className="mt-2 text-xs">
                  Amount: <span className="font-bold text-bank-light font-num">{formatCurrency(Number(respondModal.reference_amount), 'USD')}</span>
                </div>
              )}
            </div>

            <FormGroup label="Action *">
              <div className="grid grid-cols-2 gap-2">
                {['approve', 'reject', 'resolve', 'dismiss'].map(action => (
                  <button key={action} onClick={() => setRespondForm(f => ({ ...f, action }))}
                    className={clsx('py-2 px-4 rounded-xl text-sm font-semibold capitalize transition-all',
                      respondForm.action === action
                        ? action === 'approve' || action === 'resolve' ? 'bg-emerald-600 text-white' : 'bg-red-600/80 text-white'
                        : 'btn-secondary'
                    )}>
                    {action}
                  </button>
                ))}
              </div>
            </FormGroup>

            {/* Amount field for deposit/withdrawal/loan approval */}
            {['deposit_request', 'withdrawal_request', 'loan_application', 'loan_repayment'].includes(respondModal.notification_type) && (
              <FormGroup label="Amount to Process" hint="Leave blank to use requested amount">
                <input type="number" step="0.01" value={respondForm.amount}
                  onChange={e => setRespondForm(f => ({ ...f, amount: e.target.value }))}
                  className="bank-input" placeholder={respondModal.reference_amount} />
              </FormGroup>
            )}

            <FormGroup label="Response Message (optional)">
              <textarea value={respondForm.response_message}
                onChange={e => setRespondForm(f => ({ ...f, response_message: e.target.value }))}
                className="bank-input resize-none" rows={3}
                placeholder="Add a note for the user..." />
            </FormGroup>

            <div className="flex gap-3">
              <button onClick={() => setRespondModal(null)} className="btn-secondary flex-1">Cancel</button>
              <LoadingButton loading={submitting} onClick={handleRespond}
                className={clsx('flex-1 justify-center',
                  respondForm.action === 'approve' || respondForm.action === 'resolve' ? 'btn-success' : 'btn-danger')}>
                Confirm {respondForm.action}
              </LoadingButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
