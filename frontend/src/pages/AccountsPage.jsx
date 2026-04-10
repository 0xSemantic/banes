/**
 * Banesco Bank - Accounts Page 
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Plus, Copy, ArrowDownLeft, ArrowUpRight, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAccountStore, useAuthStore } from '../store'
import api from '../utils/api'
import { formatCurrency, formatDate, copyToClipboard } from '../utils/helpers'
import { Modal, FormGroup, LoadingButton, PageHeader, EmptyState, Alert, StatusBadge } from '../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function AccountsPage() {
  const { accounts, fetchAccounts, isLoading } = useAccountStore()
  const { user } = useAuthStore()
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [activeAcc, setActiveAcc] = useState(null)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [depositForm, setDepositForm] = useState({ amount: '', currency: user?.preferred_currency || 'USD', description: '' })
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', description: '', withdrawal_method: 'bank_transfer' })
  const [createForm, setCreateForm] = useState({ account_type: 'checking', currency: user?.preferred_currency || 'USD' })
  const navigate = useNavigate()

  const handleDeposit = async () => {
    if (!depositForm.amount || isNaN(depositForm.amount) || Number(depositForm.amount) <= 0) {
      toast.error('Enter a valid amount'); return
    }
    setSubmitting(true)
    try {
      await api.post('/transactions/deposit-request', {
        account_id: activeAcc.id,
        amount: Number(depositForm.amount),
        currency: depositForm.currency,
        description: depositForm.description
      })
      toast.success('Deposit request sent to admin')
      setShowDeposit(false)
      setDepositForm({ amount: '', currency: user?.preferred_currency || 'USD', description: '' })
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to submit request')
    } finally { setSubmitting(false) }
  }

  const handleWithdraw = async () => {
    if (!withdrawForm.amount || isNaN(withdrawForm.amount) || Number(withdrawForm.amount) <= 0) {
      toast.error('Enter a valid amount'); return
    }
    if (Number(withdrawForm.amount) > activeAcc.available_balance) {
      toast.error('Insufficient balance'); return
    }
    setSubmitting(true)
    try {
      await api.post('/transactions/withdrawal-request', {
        account_id: activeAcc.id,
        amount: Number(withdrawForm.amount),
        description: withdrawForm.description,
        withdrawal_method: withdrawForm.withdrawal_method
      })
      toast.success('Withdrawal request sent to admin')
      setShowWithdraw(false)
      fetchAccounts()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to submit request')
    } finally { setSubmitting(false) }
  }

  const handleCreateAccount = async () => {
    setSubmitting(true)
    try {
      await api.post('/accounts/', createForm)
      toast.success('Account created successfully')
      setShowCreate(false)
      fetchAccounts()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create account')
    } finally { setSubmitting(false) }
  }

  const handleCopy = async (text) => {
    const ok = await copyToClipboard(text)
    if (ok) toast.success('Copied to clipboard')
  }

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)

  return (
    <div className="space-y-6">
      <PageHeader title="My Accounts" subtitle="Manage your bank accounts"
        action={
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            <Plus size={15} /> New Account
          </button>
        }
      />

      {/* Total balance */}
      <div className="bank-card p-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, rgba(29,78,216,0.15), rgba(8,145,178,0.1))', borderColor: 'rgba(29,78,216,0.25)' }}>
        <div>
          <div className="text-xs text-bank-muted mb-1">Combined Balance</div>
          <div className="text-2xl font-bold text-bank-light font-num">
            {balanceVisible ? formatCurrency(totalBalance, user?.preferred_currency || 'USD') : '••••••'}
          </div>
          <div className="text-xs text-bank-muted mt-0.5">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={() => setBalanceVisible(v => !v)} className="btn-ghost">
          {balanceVisible ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>

      {/* Account cards */}
      {accounts.length === 0 ? (
        <EmptyState icon={Wallet} title="No accounts yet"
          description="Create your first account to start banking."
          action={<button onClick={() => setShowCreate(true)} className="btn-primary">Create Account</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map(acc => (
            <div key={acc.id} className="bank-card overflow-hidden">
              {/* Card header */}
              <div className="p-5" style={{ background: 'linear-gradient(135deg, #1a2a44, #0f1f3d)' }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="badge badge-primary text-[10px]">{acc.account_type.toUpperCase()}</span>
                  <div className="flex items-center gap-1.5">
                    {acc.is_frozen && <span className="badge badge-danger text-[10px]">FROZEN</span>}
                    <span className="badge badge-muted text-[10px]">{acc.currency}</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white font-num mb-1">
                  {balanceVisible ? formatCurrency(acc.balance, acc.currency) : '••••••'}
                </div>
                <div className="text-xs text-blue-300/60">
                  Available: {balanceVisible ? formatCurrency(acc.available_balance, acc.currency) : '••••'}
                </div>
              </div>

              {/* Account details */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-bank-muted uppercase tracking-wider">Account Number</div>
                    <div className="text-sm font-bold font-mono text-bank-light mt-0.5">
                      {acc.account_number?.replace(/(.{4})/g, '$1 ').trim()}
                    </div>
                  </div>
                  <button onClick={() => handleCopy(acc.account_number)} className="btn-ghost p-1.5">
                    <Copy size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-bank-muted">Daily Limit</div>
                    <div className="font-semibold text-bank-light">{formatCurrency(acc.daily_limit, acc.currency)}</div>
                  </div>
                  <div>
                    <div className="text-bank-muted">Opened</div>
                    <div className="font-semibold text-bank-light">{formatDate(acc.created_at, 'MMM yyyy')}</div>
                  </div>
                </div>

                {/* Actions */}
                {!acc.is_frozen && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setActiveAcc(acc); setShowDeposit(true) }}
                      className="btn-success flex-1 py-2 text-xs">
                      <ArrowDownLeft size={13} /> Deposit
                    </button>
                    <button onClick={() => { setActiveAcc(acc); setShowWithdraw(true) }}
                      className="btn-danger flex-1 py-2 text-xs">
                      <ArrowUpRight size={13} /> Withdraw
                    </button>
                    <button onClick={() => navigate('/transactions')}
                      className="btn-secondary py-2 text-xs px-3">
                      History
                    </button>
                  </div>
                )}
                {acc.is_frozen && (
                  <Alert type="danger" message="This account is frozen. Contact support to unfreeze." />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DEPOSIT MODAL ──────────────────────────────── */}
      <Modal isOpen={showDeposit} onClose={() => setShowDeposit(false)} title="Request Deposit">
        {activeAcc && (
          <div className="space-y-4">
            <Alert type="info" message="Your deposit request will be processed by admin. Funds will be credited upon approval." />
            <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-surface)' }}>
              <span className="text-bank-muted">Account: </span>
              <span className="font-mono font-semibold text-bank-light">{activeAcc.account_number}</span>
            </div>
            <FormGroup label="Amount">
              <input type="number" min="1" step="0.01" value={depositForm.amount}
                onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))}
                className="bank-input" placeholder="0.00" />
            </FormGroup>
            <FormGroup label="Currency">
              <select value={depositForm.currency} onChange={e => setDepositForm(f => ({ ...f, currency: e.target.value }))} className="bank-select">
                {['USD', 'GBP', 'EUR'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Description (optional)">
              <input type="text" value={depositForm.description}
                onChange={e => setDepositForm(f => ({ ...f, description: e.target.value }))}
                className="bank-input" placeholder="Purpose of deposit" />
            </FormGroup>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowDeposit(false)} className="btn-secondary flex-1">Cancel</button>
              <LoadingButton loading={submitting} onClick={handleDeposit} className="btn-primary flex-1 justify-center">
                Submit Request
              </LoadingButton>
            </div>
          </div>
        )}
      </Modal>

      {/* ── WITHDRAWAL MODAL ───────────────────────────── */}
      <Modal isOpen={showWithdraw} onClose={() => setShowWithdraw(false)} title="Request Withdrawal">
        {activeAcc && (
          <div className="space-y-4">
            <Alert type="warning" message="Withdrawal requests are reviewed by admin. Processing may take a few minutes." />
            <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-surface)' }}>
              <div className="flex justify-between">
                <span className="text-bank-muted">Available Balance</span>
                <span className="font-bold font-num text-emerald-400">{formatCurrency(activeAcc.available_balance, activeAcc.currency)}</span>
              </div>
            </div>
            <FormGroup label="Amount">
              <input type="number" min="1" step="0.01" max={activeAcc.available_balance}
                value={withdrawForm.amount}
                onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                className="bank-input" placeholder="0.00" />
            </FormGroup>
            <FormGroup label="Method">
              <select value={withdrawForm.withdrawal_method}
                onChange={e => setWithdrawForm(f => ({ ...f, withdrawal_method: e.target.value }))}
                className="bank-select">
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash Pickup</option>
                <option value="atm">ATM</option>
              </select>
            </FormGroup>
            <FormGroup label="Description (optional)">
              <input type="text" value={withdrawForm.description}
                onChange={e => setWithdrawForm(f => ({ ...f, description: e.target.value }))}
                className="bank-input" placeholder="Purpose of withdrawal" />
            </FormGroup>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowWithdraw(false)} className="btn-secondary flex-1">Cancel</button>
              <LoadingButton loading={submitting} onClick={handleWithdraw} className="btn-danger flex-1 justify-center">
                Submit Request
              </LoadingButton>
            </div>
          </div>
        )}
      </Modal>

      {/* ── CREATE ACCOUNT MODAL ───────────────────────── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Open New Account">
        <div className="space-y-4">
          <FormGroup label="Account Type">
            <select value={createForm.account_type}
              onChange={e => setCreateForm(f => ({ ...f, account_type: e.target.value }))}
              className="bank-select">
              <option value="checking">Checking Account</option>
              <option value="savings">Savings Account</option>
              <option value="fixed">Fixed Deposit</option>
            </select>
          </FormGroup>
          <FormGroup label="Currency">
            <select value={createForm.currency}
              onChange={e => setCreateForm(f => ({ ...f, currency: e.target.value }))}
              className="bank-select">
              {['USD', 'GBP', 'EUR'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormGroup>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
            <LoadingButton loading={submitting} onClick={handleCreateAccount} className="btn-primary flex-1 justify-center">
              Open Account
            </LoadingButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
