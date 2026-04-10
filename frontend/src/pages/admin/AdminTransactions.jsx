/**
 * Credex Bank - Admin Transactions Page
 */
import { useEffect, useState } from 'react'
import { ArrowLeftRight, Search } from 'lucide-react'
import api from '../../utils/api'
import { formatCurrency, formatDateTime, getTxnMeta } from '../../utils/helpers'
import { PageHeader, EmptyState, StatusBadge } from '../../components/ui'
import clsx from 'clsx'

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  useEffect(() => { loadTransactions() }, [offset])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/transactions?limit=${LIMIT}&offset=${offset}`)
      setTransactions(p => offset === 0 ? res.data : [...p, ...res.data])
    } catch {} finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="All Transactions" subtitle="Complete transaction ledger across all accounts" />

      <div className="bank-card overflow-hidden">
        {loading && transactions.length === 0 ? (
          <div className="p-4 space-y-2">{[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
        ) : transactions.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="No transactions yet" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bank-border">
                    {['Type', 'Amount', 'Account', 'Description', 'Status', 'Date'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-bank-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, idx) => {
                    const meta = getTxnMeta(t.transaction_type)
                    return (
                      <tr key={t.id} className={clsx('border-b border-bank-border hover:bg-bank-surface', idx === transactions.length - 1 && 'border-0')}>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-bank-light">{meta.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('font-bold font-num text-sm', t.is_debit ? 'text-red-400' : 'text-emerald-400')}>
                            {t.is_debit ? '-' : '+'}{formatCurrency(t.amount, t.currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-bank-muted">
                          {t.account_id?.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-xs text-bank-muted max-w-xs truncate">
                          {t.description || t.recipient_name || '—'}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                        <td className="px-4 py-3 text-xs text-bank-muted whitespace-nowrap">
                          {formatDateTime(t.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {transactions.length >= LIMIT && (
              <div className="p-4 text-center border-t border-bank-border">
                <button onClick={() => setOffset(o => o + LIMIT)} className="btn-secondary text-sm">
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
