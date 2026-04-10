/**
 * Credex Bank - Loans Page
 */
import { useEffect, useState } from 'react'
import { Landmark, Plus, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { useAccountStore, useAuthStore } from '../store'
import api from '../utils/api'
import { formatCurrency, formatDate, getLoanStatusColor } from '../utils/helpers'
import { PageHeader, Modal, FormGroup, LoadingButton, EmptyState, Alert, StatusBadge } from '../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const LOAN_PURPOSES = ['Personal', 'Business', 'Education', 'Medical', 'Home Improvement', 'Vehicle', 'Travel', 'Other']

export default function LoansPage() {
  const { accounts } = useAccountStore()
  const { user } = useAuthStore()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showApply, setShowApply] = useState(false)
  const [showRepay, setShowRepay] = useState(false)
  const [activeLoan, setActiveLoan] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [applyForm, setApplyForm] = useState({ account_id: accounts[0]?.id || '', amount: '', purpose: '', duration_months: '12', collateral: '' })
  const [repayAmount, setRepayAmount] = useState('')

  useEffect(() => { loadLoans() }, [])

  const loadLoans = async () => {
    setLoading(true)
    try {
      const res = await api.get('/loans/')
      setLoans(res.data)
    } catch {} finally { setLoading(false) }
  }

  const estimatePayment = () => {
    const p = Number(applyForm.amount)
    const r = (5.0 / 100) / 12
    const n = Number(applyForm.duration_months)
    if (!p || !n) return 0
    return Math.round(p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) * 100) / 100
  }

  const handleApply = async () => {
    const { account_id, amount, purpose, duration_months } = applyForm
    if (!account_id || !amount || !purpose || !duration_months) { toast.error('Fill all required fields'); return }
    if (Number(amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSubmitting(true)
    try {
      const res = await api.post('/loans/apply', {
        account_id, amount: Number(amount), purpose,
        duration_months: Number(duration_months),
        collateral: applyForm.collateral || null
      })
      toast.success(`Loan application submitted! (${res.data.loan_number})`)
      setShowApply(false)
      loadLoans()
    } catch (e) { toast.error(e.response?.data?.detail || 'Application failed') }
    finally { setSubmitting(false) }
  }

  const handleRepay = async () => {
    if (!repayAmount || Number(repayAmount) <= 0) { toast.error('Enter repayment amount'); return }
    setSubmitting(true)
    try {
      await api.post('/loans/repay', { loan_id: activeLoan.id, amount: Number(repayAmount) })
      toast.success('Repayment request submitted')
      setShowRepay(false)
      setRepayAmount('')
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const activeLoans = loans.filter(l => ['active', 'overdue'].includes(l.status))

  return (
    <div className="space-y-6">
      <PageHeader title="Loans" subtitle="Apply for and manage your loans"
        action={
          <button onClick={() => setShowApply(true)} className="btn-primary text-sm">
            <Plus size={14} /> Apply for Loan
          </button>
        }
      />

      {/* Active loan summary */}
      {activeLoans.length > 0 && (
        <div className="bank-card p-5" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(29,78,216,0.15))', borderColor: 'rgba(139,92,246,0.3)' }}>
          {activeLoans.map(l => (
            <div key={l.id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-bank-muted">Active Loan #{l.loan_number}</div>
                  <div className="text-xl font-bold text-bank-light font-num">{formatCurrency(l.outstanding_balance, 'USD')}</div>
                  <div className="text-xs text-bank-muted">outstanding balance</div>
                </div>
                <StatusBadge status={l.status} />
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--bg-border)' }}>
                <div className="h-full rounded-full" style={{
                  width: `${Math.min(100, (l.amount_repaid / l.amount_disbursed) * 100 || 0)}%`,
                  background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)'
                }} />
              </div>
              <div className="flex justify-between text-xs text-bank-muted mb-3">
                <span>Repaid: {formatCurrency(l.amount_repaid, 'USD')}</span>
                <span>Total: {formatCurrency(l.amount_disbursed, 'USD')}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                <div><div className="text-xs text-bank-muted">Monthly</div><div className="font-bold text-bank-light font-num">{formatCurrency(l.monthly_payment, 'USD')}</div></div>
                <div><div className="text-xs text-bank-muted">Rate</div><div className="font-bold text-bank-light">{l.interest_rate}% /mo</div></div>
                <div><div className="text-xs text-bank-muted">Due Date</div><div className="font-bold text-bank-light text-xs">{l.due_date ? formatDate(l.due_date) : '—'}</div></div>
              </div>
              <button onClick={() => { setActiveLoan(l); setRepayAmount(String(l.monthly_payment)); setShowRepay(true) }}
                className="btn-primary text-sm py-2">
                Make Repayment
              </button>
            </div>
          ))}
        </div>
      )}

      {/* All loans */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-bank-muted uppercase tracking-wider">Loan History</h2>
        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
        ) : loans.length === 0 ? (
          <EmptyState icon={Landmark} title="No loans yet"
            description="Apply for a loan to fund your goals. Quick approval process."
            action={<button onClick={() => setShowApply(true)} className="btn-primary">Apply Now</button>} />
        ) : (
          loans.map(l => (
            <div key={l.id} className="bank-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-bank-light">{l.purpose}</div>
                  <div className="text-xs text-bank-muted font-mono mt-0.5">#{l.loan_number}</div>
                </div>
                <StatusBadge status={l.status} />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                <div><div className="text-xs text-bank-muted">Requested</div><div className="font-bold text-bank-light font-num text-sm">{formatCurrency(l.amount_requested, 'USD')}</div></div>
                <div><div className="text-xs text-bank-muted">Duration</div><div className="font-bold text-bank-light">{l.duration_months}mo</div></div>
                <div><div className="text-xs text-bank-muted">Applied</div><div className="font-bold text-bank-light text-xs">{formatDate(l.applied_at)}</div></div>
              </div>
              {l.rejection_reason && (
                <div className="mt-2 text-xs text-red-400 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  Rejected: {l.rejection_reason}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Apply Modal */}
      <Modal isOpen={showApply} onClose={() => setShowApply(false)} title="Apply for a Loan" maxWidth="max-w-lg">
        <div className="space-y-4">
          <Alert type="info" message="Loan applications are reviewed by admin. You'll be notified of the decision." />
          <FormGroup label="Disbursement Account *">
            <select value={applyForm.account_id} onChange={e => setApplyForm(f => ({ ...f, account_id: e.target.value }))} className="bank-select">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_type.toUpperCase()} ••{a.account_number?.slice(-4)}</option>)}
            </select>
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Loan Amount *">
              <input type="number" min="100" value={applyForm.amount} onChange={e => setApplyForm(f => ({ ...f, amount: e.target.value }))}
                className="bank-input" placeholder="0.00" />
            </FormGroup>
            <FormGroup label="Duration (months)">
              <select value={applyForm.duration_months} onChange={e => setApplyForm(f => ({ ...f, duration_months: e.target.value }))} className="bank-select">
                {[3, 6, 12, 18, 24, 36, 48, 60].map(m => <option key={m} value={m}>{m} months</option>)}
              </select>
            </FormGroup>
          </div>
          <FormGroup label="Purpose *">
            <select value={applyForm.purpose} onChange={e => setApplyForm(f => ({ ...f, purpose: e.target.value }))} className="bank-select">
              <option value="">Select purpose</option>
              {LOAN_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Collateral (optional)">
            <input type="text" value={applyForm.collateral} onChange={e => setApplyForm(f => ({ ...f, collateral: e.target.value }))}
              className="bank-input" placeholder="Property, vehicle, etc." />
          </FormGroup>
          {applyForm.amount && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-surface)' }}>
              <div className="flex justify-between mb-1">
                <span className="text-bank-muted">Est. Monthly Payment</span>
                <span className="font-bold text-bank-light font-num">{formatCurrency(estimatePayment(), 'USD')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bank-muted">Interest Rate</span>
                <span className="text-bank-light">5% / month</span>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setShowApply(false)} className="btn-secondary flex-1">Cancel</button>
            <LoadingButton loading={submitting} onClick={handleApply} className="btn-primary flex-1 justify-center">Submit Application</LoadingButton>
          </div>
        </div>
      </Modal>

      {/* Repay Modal */}
      <Modal isOpen={showRepay} onClose={() => setShowRepay(false)} title="Make Loan Repayment">
        {activeLoan && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-surface)' }}>
              <div className="flex justify-between"><span className="text-bank-muted">Loan</span><span className="text-bank-light">#{activeLoan.loan_number}</span></div>
              <div className="flex justify-between mt-1"><span className="text-bank-muted">Outstanding</span><span className="font-bold text-red-400 font-num">{formatCurrency(activeLoan.outstanding_balance, 'USD')}</span></div>
              <div className="flex justify-between mt-1"><span className="text-bank-muted">Monthly payment</span><span className="text-bank-light font-num">{formatCurrency(activeLoan.monthly_payment, 'USD')}</span></div>
            </div>
            <FormGroup label="Repayment Amount">
              <input type="number" min="1" step="0.01" value={repayAmount}
                onChange={e => setRepayAmount(e.target.value)} className="bank-input" />
            </FormGroup>
            <div className="flex gap-3">
              <button onClick={() => setShowRepay(false)} className="btn-secondary flex-1">Cancel</button>
              <LoadingButton loading={submitting} onClick={handleRepay} className="btn-primary flex-1 justify-center">Submit Repayment</LoadingButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
