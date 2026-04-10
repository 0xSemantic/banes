/**
 * Credex Bank - Savings Page
 */
import { useEffect, useState } from 'react'
import { PiggyBank, TrendingUp, Target, Calendar, Zap } from 'lucide-react'
import { useAccountStore, useAuthStore } from '../store'
import api from '../utils/api'
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers'
import { PageHeader, Alert, FormGroup, LoadingButton, Modal, EmptyState } from '../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function SavingsPage() {
  const { accounts } = useAccountStore()
  const { user } = useAuthStore()
  const [tiers, setTiers] = useState([])
  const [myPlan, setMyPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showActivate, setShowActivate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ account_id: accounts[0]?.id || '', target_amount: '', target_date: '' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [tiersRes, planRes] = await Promise.all([
        api.get('/savings/tiers'),
        api.get('/savings/my-plan').catch(() => ({ data: null }))
      ])
      setTiers(tiersRes.data)
      setMyPlan(planRes.data)
    } catch {} finally { setLoading(false) }
  }

  const handleActivate = async () => {
    if (!form.account_id) { toast.error('Select an account'); return }
    setSubmitting(true)
    try {
      await api.post('/savings/activate', {
        account_id: form.account_id,
        target_amount: form.target_amount ? Number(form.target_amount) : null,
        target_date: form.target_date || null
      })
      toast.success('Savings plan activated!')
      setShowActivate(false)
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to activate savings')
    } finally { setSubmitting(false) }
  }

  const handleDeactivate = async () => {
    if (!myPlan) return
    setSubmitting(true)
    try {
      await api.post(`/savings/deactivate/${myPlan.id}`)
      toast.success('Savings plan deactivated')
      setMyPlan(null)
      loadData()
    } catch (e) {
      toast.error('Failed to deactivate')
    } finally { setSubmitting(false) }
  }

  const currency = user?.preferred_currency || 'USD'

  return (
    <div className="space-y-6">
      <PageHeader title="Savings" subtitle="Grow your money with daily compound interest"
        action={!myPlan && (
          <button onClick={() => setShowActivate(true)} className="btn-primary text-sm">
            <Zap size={14} /> Activate Savings
          </button>
        )}
      />

      {/* Active Plan */}
      {myPlan && (
        <div className="bank-card overflow-hidden">
          <div className="p-5" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.15))', borderBottom: '1px solid var(--bg-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="badge badge-success">Active Plan</span>
              <span className="text-xs text-bank-muted">{myPlan.tier_name}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-bank-muted mb-0.5">Current Balance</div>
                <div className="text-2xl font-bold text-white font-num">{formatCurrency(myPlan.current_balance, currency)}</div>
              </div>
              <div>
                <div className="text-xs text-bank-muted mb-0.5">Total Interest Earned</div>
                <div className="text-xl font-bold text-emerald-400 font-num">+{formatCurrency(myPlan.total_interest_earned, currency)}</div>
              </div>
            </div>
          </div>
          <div className="p-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-bank-muted">Daily Rate</div>
              <div className="font-bold text-bank-light">{myPlan.daily_interest_rate}%</div>
            </div>
            <div>
              <div className="text-xs text-bank-muted">Annual (est.)</div>
              <div className="font-bold text-bank-light">{(myPlan.daily_interest_rate * 365).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-xs text-bank-muted">Last Applied</div>
              <div className="font-bold text-bank-light text-xs">{myPlan.last_interest_applied ? formatDate(myPlan.last_interest_applied) : 'Pending'}</div>
            </div>
          </div>
          {myPlan.target_amount && (
            <div className="px-4 pb-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-bank-muted">Progress to goal</span>
                <span className="text-bank-light font-semibold">{formatCurrency(myPlan.current_balance, currency)} / {formatCurrency(myPlan.target_amount, currency)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-border)' }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${Math.min(100, (myPlan.current_balance / myPlan.target_amount) * 100)}%`,
                  background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)'
                }} />
              </div>
            </div>
          )}
          <div className="px-4 pb-4">
            <button onClick={handleDeactivate} disabled={submitting}
              className="btn-danger text-xs py-1.5 px-3">
              Deactivate Plan
            </button>
          </div>
        </div>
      )}

      {!myPlan && !loading && (
        <Alert type="info" title="No active savings plan"
          message="Activate a savings plan to start earning daily interest on your balance." />
      )}

      {/* Savings Tiers */}
      <div>
        <h2 className="text-sm font-bold text-bank-muted uppercase tracking-wider mb-3">Available Tiers</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {tiers.map(tier => (
            <div key={tier.id} className="bank-card p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10"
                style={{ background: `radial-gradient(circle, ${tier.color}, transparent)`, transform: 'translate(30%, -30%)' }} />
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 relative z-10"
                style={{ background: `${tier.color}20`, border: `1px solid ${tier.color}40` }}>
                <PiggyBank size={18} style={{ color: tier.color }} />
              </div>
              <div className="font-bold text-bank-light mb-1 relative z-10">{tier.name}</div>
              <div className="text-2xl font-bold mb-1 relative z-10" style={{ color: tier.color }}>
                {tier.daily_interest_rate}%
                <span className="text-sm font-normal text-bank-muted">/day</span>
              </div>
              <div className="text-xs text-bank-muted mb-3 relative z-10">
                ≈ {(tier.daily_interest_rate * 365).toFixed(1)}% APY
              </div>
              <div className="text-xs text-bank-muted relative z-10">
                Balance: {tier.min_balance === 0 ? 'Any' : formatCurrency(tier.min_balance, 'USD')}
                {tier.max_balance < 999999999 ? ` – ${formatCurrency(tier.max_balance, 'USD')}` : '+'}
              </div>
              {myPlan?.tier_name === tier.name && (
                <div className="mt-3 text-xs font-semibold relative z-10" style={{ color: tier.color }}>
                  ✓ Your current tier
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bank-card p-5">
        <h3 className="text-sm font-bold text-bank-light mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-400" /> How Savings Interest Works
        </h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-bank-muted">
          {[
            { step: '1', title: 'Activate Plan', desc: 'Choose an account and activate your savings plan.' },
            { step: '2', title: 'Earn Daily', desc: 'Interest is automatically calculated and applied daily.' },
            { step: '3', title: 'Tier Upgrade', desc: 'As your balance grows, your tier upgrades automatically.' },
          ].map(s => (
            <div key={s.step} className="flex gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>{s.step}</div>
              <div><div className="font-semibold text-bank-light mb-0.5">{s.title}</div><div>{s.desc}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Activate Modal */}
      <Modal isOpen={showActivate} onClose={() => setShowActivate(false)} title="Activate Savings Plan">
        <div className="space-y-4">
          <FormGroup label="Select Account">
            <select value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} className="bank-select">
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.account_type.toUpperCase()} ••{a.account_number?.slice(-4)} — {formatCurrency(a.balance, a.currency)}
                </option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="Savings Goal (optional)">
            <input type="number" min="1" step="0.01" value={form.target_amount}
              onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
              className="bank-input" placeholder="Target amount" />
          </FormGroup>
          <FormGroup label="Target Date (optional)">
            <input type="date" value={form.target_date}
              onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
              className="bank-input" min={new Date().toISOString().split('T')[0]} />
          </FormGroup>
          <div className="flex gap-3">
            <button onClick={() => setShowActivate(false)} className="btn-secondary flex-1">Cancel</button>
            <LoadingButton loading={submitting} onClick={handleActivate} className="btn-primary flex-1 justify-center">
              Activate Plan
            </LoadingButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
