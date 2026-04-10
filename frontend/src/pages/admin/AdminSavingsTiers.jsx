/**
 * Credex Bank - Admin Savings Tiers Page
 * Configure interest rates per tier
 */
import { useEffect, useState } from 'react'
import { PiggyBank, Edit2, Plus, Check, X } from 'lucide-react'
import api from '../../utils/api'
import { formatCurrency } from '../../utils/helpers'
import { PageHeader, Modal, FormGroup, LoadingButton } from '../../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function AdminSavingsTiers() {
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', min_balance: '', max_balance: '', daily_interest_rate: '', color: '#10b981' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadTiers() }, [])

  const loadTiers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/savings-tiers')
      setTiers(res.data)
    } catch {} finally { setLoading(false) }
  }

  const startEdit = (tier) => {
    setEditingId(tier.id)
    setEditForm({
      name: tier.name,
      min_balance: tier.min_balance,
      max_balance: tier.max_balance,
      daily_interest_rate: tier.daily_interest_rate,
      color: tier.color,
      is_active: tier.is_active
    })
  }

  const saveEdit = async (id) => {
    setSubmitting(true)
    try {
      await api.put(`/admin/savings-tiers/${id}`, editForm)
      toast.success('Tier updated')
      setEditingId(null)
      loadTiers()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const handleCreate = async () => {
    if (!createForm.name || !createForm.daily_interest_rate) { toast.error('Fill all required fields'); return }
    setSubmitting(true)
    try {
      await api.post('/admin/savings-tiers', {
        name: createForm.name,
        min_balance: Number(createForm.min_balance) || 0,
        max_balance: Number(createForm.max_balance) || 999999,
        daily_interest_rate: Number(createForm.daily_interest_rate),
        color: createForm.color
      })
      toast.success('Tier created')
      setShowCreate(false)
      loadTiers()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#64748b']

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader title="Savings Tiers" subtitle="Configure daily interest rates for each savings tier"
        action={<button onClick={() => setShowCreate(true)} className="btn-primary text-sm"><Plus size={14} /> New Tier</button>}
      />

      <div className="bank-card p-4 text-sm" style={{ background: 'rgba(6,182,212,0.08)', borderColor: 'rgba(6,182,212,0.25)' }}>
        <div className="flex items-start gap-2">
          <span className="text-cyan-400">ℹ</span>
          <div className="text-bank-muted">
            Interest is applied automatically every 24 hours. Users are upgraded to higher tiers as their balance grows. Changes take effect on the next interest cycle.
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-4">
          {tiers.map(tier => (
            <div key={tier.id} className="bank-card p-5">
              {editingId === tier.id ? (
                // Edit mode
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormGroup label="Tier Name">
                      <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="bank-input" />
                    </FormGroup>
                    <FormGroup label="Daily Interest Rate (%)">
                      <input type="number" step="0.001" min="0" value={editForm.daily_interest_rate}
                        onChange={e => setEditForm(f => ({ ...f, daily_interest_rate: e.target.value }))} className="bank-input" />
                    </FormGroup>
                    <FormGroup label="Min Balance ($)">
                      <input type="number" min="0" value={editForm.min_balance}
                        onChange={e => setEditForm(f => ({ ...f, min_balance: e.target.value }))} className="bank-input" />
                    </FormGroup>
                    <FormGroup label="Max Balance ($)">
                      <input type="number" min="0" value={editForm.max_balance}
                        onChange={e => setEditForm(f => ({ ...f, max_balance: e.target.value }))} className="bank-input" />
                    </FormGroup>
                  </div>
                  <FormGroup label="Color">
                    <div className="flex gap-2">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => setEditForm(f => ({ ...f, color: c }))}
                          className={clsx('w-7 h-7 rounded-lg transition-all', editForm.color === c && 'ring-2 ring-white ring-offset-2 ring-offset-bank-card scale-110')}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </FormGroup>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                        className="w-4 h-4 rounded" />
                      <span className="text-sm text-bank-light">Active</span>
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setEditingId(null)} className="btn-secondary flex-1">Cancel</button>
                    <LoadingButton loading={submitting} onClick={() => saveEdit(tier.id)} className="btn-primary flex-1 justify-center">
                      <Check size={14} /> Save Changes
                    </LoadingButton>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${tier.color}20`, border: `1px solid ${tier.color}40` }}>
                      <PiggyBank size={20} style={{ color: tier.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-bank-light">{tier.name}</span>
                        <span className={clsx('badge text-[10px]', tier.is_active ? 'badge-success' : 'badge-muted')}>
                          {tier.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-bank-muted">
                        <span>
                          Balance: {tier.min_balance === 0 ? '$0' : formatCurrency(tier.min_balance, 'USD', true)}
                          {tier.max_balance < 999999999 ? ` – ${formatCurrency(tier.max_balance, 'USD', true)}` : '+'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold font-num" style={{ color: tier.color }}>
                        {tier.daily_interest_rate}%
                      </div>
                      <div className="text-xs text-bank-muted">per day</div>
                      <div className="text-xs text-bank-muted">≈ {(tier.daily_interest_rate * 365).toFixed(1)}% APY</div>
                    </div>
                    <button onClick={() => startEdit(tier)} className="btn-secondary text-xs py-2 px-3">
                      <Edit2 size={12} /> Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Savings Tier">
        <div className="space-y-4">
          <FormGroup label="Tier Name *">
            <input type="text" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} className="bank-input" placeholder="e.g. Gold Saver" />
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Min Balance ($)">
              <input type="number" min="0" value={createForm.min_balance} onChange={e => setCreateForm(f => ({ ...f, min_balance: e.target.value }))} className="bank-input" placeholder="0" />
            </FormGroup>
            <FormGroup label="Max Balance ($)">
              <input type="number" min="0" value={createForm.max_balance} onChange={e => setCreateForm(f => ({ ...f, max_balance: e.target.value }))} className="bank-input" placeholder="99999" />
            </FormGroup>
          </div>
          <FormGroup label="Daily Interest Rate (%) *" hint="e.g. 0.05 for 0.05%/day ≈ 18.25% APY">
            <input type="number" step="0.001" min="0" value={createForm.daily_interest_rate}
              onChange={e => setCreateForm(f => ({ ...f, daily_interest_rate: e.target.value }))} className="bank-input" />
          </FormGroup>
          <FormGroup label="Color">
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setCreateForm(f => ({ ...f, color: c }))}
                  className={clsx('w-7 h-7 rounded-lg', createForm.color === c && 'ring-2 ring-white ring-offset-2 ring-offset-bank-card scale-110')}
                  style={{ background: c }} />
              ))}
            </div>
          </FormGroup>
          <div className="flex gap-3">
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
            <LoadingButton loading={submitting} onClick={handleCreate} className="btn-primary flex-1 justify-center">Create Tier</LoadingButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
