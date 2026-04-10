/**
 * Credex Bank - Currency Exchange Rates Page
 * Uses free open exchange rates API - no key needed
 */
import { useEffect, useState } from 'react'
import { DollarSign, RefreshCw, ArrowLeftRight, TrendingUp } from 'lucide-react'
import api from '../utils/api'
import { PageHeader, FormGroup, Alert } from '../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const SUPPORTED = [
  { code: 'USD', name: 'US Dollar',       symbol: '$',  flag: '🇺🇸' },
  { code: 'GBP', name: 'British Pound',   symbol: '£',  flag: '🇬🇧' },
  { code: 'EUR', name: 'Euro',            symbol: '€',  flag: '🇪🇺' },
]

// Additional popular currencies shown in the rates table
const POPULAR_EXTRAS = ['CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'NGN', 'ZAR', 'BRL', 'MXN']

export default function CurrencyPage() {
  const [rates, setRates] = useState({})
  const [base, setBase] = useState('USD')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [converting, setConverting] = useState({ amount: '1', from: 'USD', to: 'GBP' })
  const [convertResult, setConvertResult] = useState(null)
  const [cached, setCached] = useState(false)

  useEffect(() => { fetchRates() }, [base])

  const fetchRates = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/currency/rates?base=${base}`)
      setRates(res.data.rates || {})
      setLastUpdated(res.data.updated_at)
      setCached(res.data.cached)
    } catch { toast.error('Failed to fetch rates') }
    finally { setLoading(false) }
  }

  const handleConvert = async () => {
    const amt = Number(converting.amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    try {
      const res = await api.get(`/currency/convert?amount=${amt}&from_currency=${converting.from}&to_currency=${converting.to}`)
      setConvertResult(res.data)
    } catch { toast.error('Conversion failed') }
  }

  const swap = () => {
    setConverting(c => ({ ...c, from: c.to, to: c.from }))
    setConvertResult(null)
  }

  const ALL_CURRENCIES = [...SUPPORTED.map(c => c.code), ...POPULAR_EXTRAS]

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Exchange Rates" subtitle="Live currency rates powered by Open Exchange Rates API" />

      {/* Base selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-bank-muted">Base currency:</span>
        <div className="flex gap-2">
          {SUPPORTED.map(c => (
            <button key={c.code} onClick={() => setBase(c.code)}
              className={clsx('px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                base === c.code ? 'bg-primary-700 text-white' : 'btn-secondary')}>
              {c.flag} {c.code}
            </button>
          ))}
        </div>
        <button onClick={fetchRates} disabled={loading}
          className={clsx('btn-ghost p-2.5 rounded-xl', loading && 'animate-spin')}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Primary 3 currency rates */}
      <div className="grid grid-cols-3 gap-4">
        {SUPPORTED.map(c => {
          if (c.code === base) return null
          const rate = rates[c.code]
          return (
            <div key={c.code} className="bank-card p-4 text-center">
              <div className="text-3xl mb-2">{c.flag}</div>
              <div className="text-xs text-bank-muted mb-1">{c.name}</div>
              <div className="text-xl font-bold text-bank-light font-num">
                {loading ? '—' : rate?.toFixed(4) || '—'}
              </div>
              <div className="text-xs text-bank-muted mt-1">1 {base} = {rate?.toFixed(4)} {c.code}</div>
            </div>
          )
        })}
        {/* Show same pair when base changes */}
        {SUPPORTED.filter(c => c.code !== base).length < 2 && (
          <div className="bank-card p-4 text-center opacity-40">
            <div className="text-3xl mb-2">🌍</div>
            <div className="text-xs text-bank-muted">More currencies below</div>
          </div>
        )}
      </div>

      {/* Currency Converter */}
      <div className="bank-card p-5">
        <h3 className="text-sm font-bold text-bank-light mb-4 flex items-center gap-2">
          <ArrowLeftRight size={15} className="text-blue-400" /> Currency Converter
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <FormGroup label="Amount">
              <input type="number" min="0.01" step="0.01" value={converting.amount}
                onChange={e => { setConverting(c => ({ ...c, amount: e.target.value })); setConvertResult(null) }}
                className="bank-input" placeholder="1.00" />
            </FormGroup>
          </div>
          <div className="flex-1">
            <FormGroup label="From">
              <select value={converting.from} onChange={e => { setConverting(c => ({ ...c, from: e.target.value })); setConvertResult(null) }} className="bank-select">
                {ALL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormGroup>
          </div>
          <button onClick={swap} className="btn-ghost p-3 mb-0.5 rounded-xl">
            <ArrowLeftRight size={16} />
          </button>
          <div className="flex-1">
            <FormGroup label="To">
              <select value={converting.to} onChange={e => { setConverting(c => ({ ...c, to: e.target.value })); setConvertResult(null) }} className="bank-select">
                {ALL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormGroup>
          </div>
          <button onClick={handleConvert} className="btn-primary py-3 px-5 mb-0.5">Convert</button>
        </div>

        {convertResult && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
            <div className="text-center">
              <div className="text-sm text-bank-muted mb-1">
                {converting.amount} {convertResult.from_currency} =
              </div>
              <div className="text-3xl font-bold text-bank-light font-num">
                {convertResult.converted_amount.toFixed(4)} <span className="text-blue-400">{convertResult.to_currency}</span>
              </div>
              <div className="text-xs text-bank-muted mt-1">
                Rate: 1 {convertResult.from_currency} = {convertResult.rate} {convertResult.to_currency}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* All rates table */}
      <div className="bank-card overflow-hidden">
        <div className="p-4 border-b border-bank-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-bank-light">All Rates (base: {base})</h3>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-bank-muted">
              {cached ? '⚡ Cached' : '🔄 Live'}
              <span>· Updated {new Date(lastUpdated).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : (
          <div className="divide-y divide-bank-border">
            {ALL_CURRENCIES.filter(c => c !== base).map(code => {
              const rate = rates[code]
              const supported = SUPPORTED.find(s => s.code === code)
              return (
                <div key={code} className="flex items-center justify-between px-4 py-3 hover:bg-bank-surface transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{supported?.flag || '🏳️'}</span>
                    <div>
                      <div className="text-sm font-semibold text-bank-light">{code}</div>
                      <div className="text-xs text-bank-muted">{supported?.name || code}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-bank-light font-num">
                      {rate ? rate.toFixed(4) : '—'}
                    </div>
                    <div className="text-xs text-bank-muted">per 1 {base}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Alert type="info" message="Exchange rates are provided by Open Exchange Rates API and are updated hourly. For display purposes only." />
    </div>
  )
}
