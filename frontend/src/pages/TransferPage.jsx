/**
 * Credex Bank - Transfer Page
 */
import { useState } from 'react'
import { Send, Info, ChevronRight } from 'lucide-react'
import { useAccountStore, useAuthStore } from '../store'
import api from '../utils/api'
import { formatCurrency } from '../utils/helpers'
import { FormGroup, LoadingButton, PageHeader, Alert } from '../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const BANKS = ['Chase Bank', 'Bank of America', 'Wells Fargo', 'Citibank', 'HSBC', 'Barclays', 'Deutsche Bank', 'Other']

export default function TransferPage() {
  const { accounts } = useAccountStore()
  const { user } = useAuthStore()
  const [form, setForm] = useState({
    from_account_id: accounts[0]?.id || '',
    recipient_name: '',
    recipient_account: '',
    recipient_bank: '',
    amount: '',
    description: '',
    currency: user?.preferred_currency || 'USD'
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const fromAccount = accounts.find(a => a.id === form.from_account_id)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.from_account_id || !form.recipient_name || !form.recipient_account || !form.recipient_bank || !form.amount) {
      toast.error('Please fill all required fields'); return
    }
    if (Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSubmitting(true)
    try {
      const res = await api.post('/transactions/transfer-request', {
        ...form, amount: Number(form.amount)
      })
      setSubmitted(res.data)
      toast.success('Transfer request submitted!')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Transfer failed')
    } finally { setSubmitting(false) }
  }

  if (submitted) return (
    <div className="max-w-md mx-auto text-center py-12 space-y-4">
      <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
        style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
        <Send size={28} className="text-emerald-400" />
      </div>
      <h2 className="text-xl font-bold text-bank-light">Transfer Requested</h2>
      <p className="text-sm text-bank-muted">Your transfer request has been submitted. Admin will process it shortly.</p>
      <div className="bank-card p-4 text-left space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-bank-muted">Reference</span><span className="font-mono text-xs text-bank-light">{submitted.reference_id?.slice(0,16)}...</span></div>
        <div className="flex justify-between"><span className="text-bank-muted">Status</span><span className="badge badge-warning">Pending</span></div>
      </div>
      <button onClick={() => { setSubmitted(null); setForm(f => ({ ...f, recipient_name: '', recipient_account: '', amount: '' })) }}
        className="btn-primary">Make Another Transfer</button>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <PageHeader title="Transfer Funds" subtitle="Send money to any bank account" />
      <Alert type="info" message="All transfers require admin approval before processing. Funds will be held pending approval." />

      <form onSubmit={handleSubmit} className="bank-card p-5 space-y-4">
        <FormGroup label="From Account *">
          <select value={form.from_account_id} onChange={e => set('from_account_id', e.target.value)} className="bank-select">
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.account_type.toUpperCase()} ••{a.account_number?.slice(-4)} — {formatCurrency(a.available_balance, a.currency)}
              </option>
            ))}
          </select>
          {fromAccount && (
            <p className="text-xs text-bank-muted mt-1">Available: {formatCurrency(fromAccount.available_balance, fromAccount.currency)}</p>
          )}
        </FormGroup>

        <div className="border-t border-bank-border pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-bank-muted mb-3">Recipient Details</h3>
          <div className="space-y-3">
            <FormGroup label="Recipient Name *">
              <input type="text" value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)}
                className="bank-input" placeholder="Full name" />
            </FormGroup>
            <FormGroup label="Account Number *">
              <input type="text" value={form.recipient_account} onChange={e => set('recipient_account', e.target.value)}
                className="bank-input font-mono" placeholder="Account / IBAN number" />
            </FormGroup>
            <FormGroup label="Bank *">
              <select value={form.recipient_bank} onChange={e => set('recipient_bank', e.target.value)} className="bank-select">
                <option value="">Select bank</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </FormGroup>
          </div>
        </div>

        <div className="border-t border-bank-border pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-bank-muted mb-3">Transfer Details</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <FormGroup label="Amount *">
                  <input type="number" min="1" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                    className="bank-input" placeholder="0.00" />
                </FormGroup>
              </div>
              <FormGroup label="Currency">
                <select value={form.currency} onChange={e => set('currency', e.target.value)} className="bank-select">
                  {['USD', 'GBP', 'EUR'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormGroup>
            </div>
            <FormGroup label="Description (optional)">
              <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
                className="bank-input" placeholder="What's this for?" />
            </FormGroup>
          </div>
        </div>

        {form.amount && fromAccount && (
          <div className="p-3 rounded-xl text-sm space-y-1" style={{ background: 'var(--bg-surface)' }}>
            <div className="flex justify-between">
              <span className="text-bank-muted">Transfer amount</span>
              <span className="font-bold text-bank-light font-num">{formatCurrency(Number(form.amount), form.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bank-muted">Bank fee</span>
              <span className="text-bank-muted">—</span>
            </div>
          </div>
        )}

        <LoadingButton loading={submitting} type="submit" className="btn-primary w-full py-3 justify-center">
          <Send size={15} /> Submit Transfer Request
        </LoadingButton>
      </form>
    </div>
  )
}
