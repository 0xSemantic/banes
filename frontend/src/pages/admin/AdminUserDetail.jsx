/**
 * Credex Bank - Admin User Detail Page
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Snowflake, UserCheck, UserX, DollarSign, ShieldCheck } from 'lucide-react'
import api from '../../utils/api'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { PageHeader, StatusBadge, Alert, LoadingButton } from '../../components/ui'
import toast from 'react-hot-toast'

export default function AdminUserDetail() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadUser() }, [userId])

  const loadUser = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/users/${userId}`)
      setData(res.data)
    } catch { toast.error('User not found') }
    finally { setLoading(false) }
  }

  const updateUser = async (updates) => {
    setSubmitting(true)
    try {
      await api.put(`/admin/users/${userId}`, updates)
      toast.success('User updated')
      loadUser()
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  const toggleAccountFreeze = async (accountId) => {
    try {
      const res = await api.post(`/admin/accounts/${accountId}/freeze`)
      toast.success(res.data.message)
      loadUser()
    } catch { toast.error('Failed') }
  }

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>
  if (!data) return <div className="text-bank-muted">User not found</div>

  const { user, accounts, loans, cards } = data

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate('/admin/users')} className="btn-ghost p-2 rounded-xl">
          <ArrowLeft size={16} />
        </button>
        <PageHeader title={user.full_name} subtitle={`User ID: ${user.id}`} />
      </div>

      {/* User info card */}
      <div className="bank-card p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
              {user.full_name?.charAt(0)}
            </div>
            <div>
              <div className="text-lg font-bold text-bank-light">{user.full_name}</div>
              <div className="text-sm text-bank-muted">{user.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge text-[10px] ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className={`badge text-[10px] ${user.kyc_status === 'verified' ? 'badge-success' : user.kyc_status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                  KYC: {user.kyc_status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => updateUser({ is_active: !user.is_active })} disabled={submitting}
              className={`btn-ghost text-xs py-2 px-3 ${user.is_active ? 'text-red-400' : 'text-emerald-400'}`}>
              {user.is_active ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Activate</>}
            </button>
            {user.kyc_status !== 'verified' && (
              <button onClick={() => updateUser({ kyc_status: 'verified', is_verified: true })} disabled={submitting}
                className="btn-success text-xs py-2 px-3">
                <ShieldCheck size={12} /> Verify KYC
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-bank-border text-sm">
          <div><div className="text-xs text-bank-muted">Phone</div><div className="text-bank-light">{user.phone || '—'}</div></div>
          <div><div className="text-xs text-bank-muted">Currency</div><div className="text-bank-light">{user.preferred_currency}</div></div>
          <div><div className="text-xs text-bank-muted">Joined</div><div className="text-bank-light">{formatDate(user.created_at)}</div></div>
        </div>
      </div>

      {/* Accounts */}
      <div className="bank-card p-5">
        <h3 className="text-sm font-bold text-bank-light mb-4">Accounts ({accounts.length})</h3>
        {accounts.length === 0 ? <div className="text-sm text-bank-muted">No accounts</div> : (
          <div className="space-y-3">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                <div>
                  <div className="text-sm font-semibold text-bank-light">{a.account_number} · {a.type?.toUpperCase()}</div>
                  <div className="text-xs text-bank-muted">{a.currency}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold font-num text-bank-light">{formatCurrency(a.balance, a.currency)}</div>
                    {a.is_frozen && <span className="badge badge-danger text-[10px]">Frozen</span>}
                  </div>
                  <button onClick={() => toggleAccountFreeze(a.id)}
                    className={`btn-ghost p-2 rounded-xl text-xs ${a.is_frozen ? 'text-amber-400' : 'text-blue-400'}`}>
                    <Snowflake size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loans */}
      {loans.length > 0 && (
        <div className="bank-card p-5">
          <h3 className="text-sm font-bold text-bank-light mb-4">Loans ({loans.length})</h3>
          <div className="space-y-2">
            {loans.map(l => (
              <div key={l.loan_number} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                <div>
                  <div className="text-sm font-semibold text-bank-light">#{l.loan_number}</div>
                  <div className="text-xs text-bank-muted">{formatCurrency(l.amount, 'USD')} requested</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right text-xs">
                    <div className="text-red-400 font-num">{formatCurrency(l.outstanding, 'USD')} outstanding</div>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards */}
      {cards.length > 0 && (
        <div className="bank-card p-5">
          <h3 className="text-sm font-bold text-bank-light mb-4">Cards ({cards.length})</h3>
          <div className="space-y-2">
            {cards.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                <div className="text-sm">
                  <span className="text-bank-light font-mono">{c.card_number}</span>
                  <span className="text-bank-muted ml-2">· {c.type} · {c.network?.toUpperCase()}</span>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
