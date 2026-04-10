/**
 * Credex Bank - Transactions Page
 */
import { useEffect, useState } from 'react'
import { ArrowLeftRight, Search, Filter, Download } from 'lucide-react'
import api from '../utils/api'
import { formatCurrency, formatDateTime, getTxnMeta, timeAgo } from '../utils/helpers'
import { PageHeader, EmptyState, StatusBadge, CardSkeleton } from '../components/ui'
import clsx from 'clsx'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [offset, setOffset] = useState(0)
  const LIMIT = 20

  useEffect(() => { loadTransactions() }, [offset])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/transactions/?limit=${LIMIT}&offset=${offset}`)
      setTransactions(p => offset === 0 ? res.data : [...p, ...res.data])
    } catch {} finally { setLoading(false) }
  }

  const filtered = transactions.filter(t => {
    const matchType = typeFilter === 'all' || t.transaction_type === typeFilter
    const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.reference_id?.toLowerCase().includes(search.toLowerCase()) ||
      t.recipient_name?.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const TYPE_FILTERS = [
    { val: 'all', label: 'All' },
    { val: 'deposit', label: 'Deposits' },
    { val: 'withdrawal', label: 'Withdrawals' },
    { val: 'transfer_out', label: 'Transfers' },
    { val: 'savings_interest', label: 'Interest' },
    { val: 'loan_disbursement', label: 'Loans' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Transactions" subtitle="Full history of all your transactions" />

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bank-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="bank-input pl-10" placeholder="Search transactions..." />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TYPE_FILTERS.map(f => (
            <button key={f.val} onClick={() => setTypeFilter(f.val)}
              className={clsx('px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                typeFilter === f.val
                  ? 'bg-primary-700 text-white'
                  : 'text-bank-muted hover:text-bank-light'
              )} style={typeFilter !== f.val ? { background: 'var(--bg-surface)' } : {}}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div className="bank-card overflow-hidden">
        {loading && transactions.length === 0 ? (
          <div className="p-4 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="No transactions found" description="Try adjusting your filters." />
        ) : (
          <div>
            {filtered.map((txn, idx) => {
              const meta = getTxnMeta(txn.transaction_type)
              return (
                <div key={txn.id} className={clsx('flex items-center gap-4 p-4 transition-colors hover:bg-bank-surface',
                  idx !== filtered.length - 1 && 'border-b border-bank-border')}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: txn.is_debit ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }}>
                    <ArrowLeftRight size={15} color={txn.is_debit ? '#f87171' : '#34d399'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-bank-light">{meta.label}</div>
                    <div className="text-xs text-bank-muted truncate max-w-xs">
                      {txn.description || txn.recipient_name || 'Transaction'}
                    </div>
                    <div className="text-[10px] text-bank-muted/70 mt-0.5 font-mono">{txn.reference_id?.slice(0,12)}...</div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <div className={clsx('text-sm font-bold font-num', txn.is_debit ? 'amount-debit' : 'amount-credit')}>
                      {txn.is_debit ? '-' : '+'}{formatCurrency(txn.amount, txn.currency)}
                    </div>
                    <div className="text-[10px] text-bank-muted">{formatDateTime(txn.created_at)}</div>
                    <StatusBadge status={txn.status} />
                  </div>
                </div>
              )
            })}
            {filtered.length >= LIMIT && (
              <div className="p-4 text-center">
                <button onClick={() => setOffset(o => o + LIMIT)} className="btn-secondary text-sm">
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
