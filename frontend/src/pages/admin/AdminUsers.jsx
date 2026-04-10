/**
 * Credex Bank - Admin Users Page
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, Eye, UserCheck, UserX, DollarSign, Snowflake } from 'lucide-react'
import api from '../../utils/api'
import { formatCurrency, formatDate, getKycBadge } from '../../utils/helpers'
import { PageHeader, EmptyState, Modal, FormGroup, LoadingButton } from '../../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addFundsModal, setAddFundsModal] = useState(null)
  const [userAccounts, setUserAccounts] = useState([])
  const [fundsForm, setFundsForm] = useState({ account_id: '', amount: '', description: 'Admin credit' })
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/users${search ? `?search=${search}` : ''}`)
      setUsers(res.data)
    } catch {} finally { setLoading(false) }
  }

  const handleSearch = (e) => {
    e.preventDefault(); loadUsers()
  }

  const toggleActive = async (userId, isActive) => {
    try {
      await api.put(`/admin/users/${userId}`, { is_active: !isActive })
      toast.success(`User ${!isActive ? 'activated' : 'deactivated'}`)
      loadUsers()
    } catch { toast.error('Failed') }
  }

  const openAddFunds = async (user) => {
    try {
      const res = await api.get(`/admin/users/${user.id}`)
      setUserAccounts(res.data.accounts || [])
      setAddFundsModal(user)
      setFundsForm({ account_id: res.data.accounts?.[0]?.id || '', amount: '', description: 'Admin credit' })
    } catch { toast.error('Failed to load accounts') }
  }

  const handleAddFunds = async () => {
    if (!fundsForm.account_id || !fundsForm.amount || Number(fundsForm.amount) <= 0) {
      toast.error('Fill all fields with valid amount'); return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/admin/accounts/add-funds', {
        account_id: fundsForm.account_id,
        amount: Number(fundsForm.amount),
        description: fundsForm.description
      })
      toast.success(res.data.message)
      setAddFundsModal(null)
      loadUsers()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Users" subtitle="Manage customer accounts and KYC" />

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bank-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="bank-input pl-10" placeholder="Search by name or email..." />
        </div>
        <button type="submit" className="btn-primary">Search</button>
        {search && <button type="button" onClick={() => { setSearch(''); loadUsers() }} className="btn-secondary">Clear</button>}
      </form>

      {/* Users table */}
      <div className="bank-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bank-border">
                  {['User', 'KYC', 'Accounts', 'Balance', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-bank-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={u.id} className={clsx('border-b border-bank-border hover:bg-bank-surface transition-colors', idx === users.length - 1 && 'border-0')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                          {u.full_name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-bank-light">{u.full_name}</div>
                          <div className="text-xs text-bank-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge text-[10px]', getKycBadge(u.kyc_status))}>
                        {u.kyc_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-bank-light">{u.account_count}</td>
                    <td className="px-4 py-3 font-bold font-num text-bank-light">{formatCurrency(u.total_balance, u.preferred_currency, true)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge text-[10px]', u.is_active ? 'badge-success' : 'badge-danger')}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-bank-muted">{formatDate(u.created_at, 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/admin/users/${u.id}`)}
                          className="btn-ghost p-1.5 rounded-lg" title="View details">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => openAddFunds(u)}
                          className="btn-ghost p-1.5 rounded-lg text-emerald-400" title="Add funds">
                          <DollarSign size={13} />
                        </button>
                        <button onClick={() => toggleActive(u.id, u.is_active)}
                          className={clsx('btn-ghost p-1.5 rounded-lg', u.is_active ? 'text-red-400' : 'text-emerald-400')}
                          title={u.is_active ? 'Deactivate' : 'Activate'}>
                          {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Funds Modal */}
      <Modal isOpen={!!addFundsModal} onClose={() => setAddFundsModal(null)} title={`Add Funds — ${addFundsModal?.full_name}`}>
        <div className="space-y-4">
          <FormGroup label="Select Account">
            <select value={fundsForm.account_id} onChange={e => setFundsForm(f => ({ ...f, account_id: e.target.value }))} className="bank-select">
              {userAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.type?.toUpperCase()} ••{a.account_number?.slice(-4)} — {formatCurrency(a.balance, a.currency)}
                </option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="Amount">
            <input type="number" min="1" step="0.01" value={fundsForm.amount}
              onChange={e => setFundsForm(f => ({ ...f, amount: e.target.value }))}
              className="bank-input" placeholder="0.00" />
          </FormGroup>
          <FormGroup label="Description">
            <input type="text" value={fundsForm.description}
              onChange={e => setFundsForm(f => ({ ...f, description: e.target.value }))}
              className="bank-input" />
          </FormGroup>
          <div className="flex gap-3">
            <button onClick={() => setAddFundsModal(null)} className="btn-secondary flex-1">Cancel</button>
            <LoadingButton loading={submitting} onClick={handleAddFunds} className="btn-success flex-1 justify-center">
              <DollarSign size={14} /> Credit Account
            </LoadingButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
