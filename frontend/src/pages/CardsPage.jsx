/**
 * Banesco Bank - Cards Page 
 */
import { useEffect, useState } from 'react'
import { CreditCard, Plus, Snowflake, Link2, Wifi } from 'lucide-react'
import { useAccountStore, useAuthStore } from '../store'
import api from '../utils/api'
import { formatDate, getCardGradient } from '../utils/helpers'
import { PageHeader, Modal, FormGroup, LoadingButton, EmptyState, StatusBadge, Alert } from '../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const NETWORKS = ['visa', 'mastercard', 'verve']
const THEMES = ['dark-blue', 'midnight', 'ocean', 'forest', 'royal', 'premium', 'rose', 'slate']

export default function CardsPage() {
  const { accounts } = useAccountStore()
  const { user } = useAuthStore()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showVirtual, setShowVirtual] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [virtualForm, setVirtualForm] = useState({ account_id: accounts[0]?.id || '', card_network: 'visa', color_theme: 'dark-blue' })
  const [linkForm, setLinkForm] = useState({ account_id: accounts[0]?.id || '', card_number_last4: '', expiry_month: '', expiry_year: '', card_holder_name: user?.full_name || '', bank_name: '', card_network: 'visa' })

  useEffect(() => { loadCards() }, [])

  const loadCards = async () => {
    setLoading(true)
    try { const res = await api.get('/cards/'); setCards(res.data) }
    catch {} finally { setLoading(false) }
  }

  const handleVirtual = async () => {
    setSubmitting(true)
    try {
      await api.post('/cards/request-virtual', virtualForm)
      toast.success('Virtual card request submitted!')
      setShowVirtual(false); loadCards()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const handleLink = async () => {
    const { card_number_last4, expiry_month, expiry_year, card_holder_name, bank_name } = linkForm
    if (!card_number_last4 || !expiry_month || !expiry_year || !bank_name) { toast.error('Fill all fields'); return }
    setSubmitting(true)
    try {
      await api.post('/cards/link-external', linkForm)
      toast.success('Card link request submitted!')
      setShowLink(false); loadCards()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const handleFreeze = async (cardId) => {
    try {
      const res = await api.post(`/cards/${cardId}/freeze`)
      toast.success(res.data.message)
      loadCards()
    } catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Cards" subtitle="Manage virtual and linked cards"
        action={
          <div className="flex gap-2">
            <button onClick={() => setShowVirtual(true)} className="btn-primary text-sm"><Plus size={14} /> Virtual Card</button>
            <button onClick={() => setShowLink(true)} className="btn-secondary text-sm"><Link2 size={14} /> Link Card</button>
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[1,2].map(i => <div key={i} className="skeleton h-52 rounded-2xl" />)}</div>
      ) : cards.length === 0 ? (
        <EmptyState icon={CreditCard} title="No cards yet"
          description="Request a virtual card or link an existing bank card."
          action={<button onClick={() => setShowVirtual(true)} className="btn-primary">Get Virtual Card</button>} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {cards.map(card => (
            <div key={card.id} className="space-y-3">
              {/* Card visual */}
              <div className={clsx('credit-card-display bg-gradient-to-br', getCardGradient(card.color_theme))}
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                {/* Frosted overlay if frozen */}
                {card.is_frozen && (
                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center z-20"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="text-center"><Snowflake size={28} className="text-blue-300 mx-auto mb-1" /><div className="text-sm text-blue-200 font-semibold">Card Frozen</div></div>
                  </div>
                )}
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                      {card.card_type === 'virtual' ? 'Virtual Card' : card.bank_name || 'Linked Card'}
                    </div>
                    <Wifi size={16} className="text-white/50" />
                  </div>
                  <div className="card-chip" />
                  <div>
                    <div className="text-lg font-bold tracking-widest text-white font-mono mb-1">{card.card_number_masked}</div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[9px] text-white/50 uppercase">Card Holder</div>
                        <div className="text-sm font-semibold text-white">{card.card_holder_name}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-white/50 uppercase">Expires</div>
                        <div className="text-sm font-semibold text-white">{card.expiry_month}/{card.expiry_year?.slice(-2)}</div>
                      </div>
                      <div className="text-2xl font-black text-white/80 uppercase italic">{card.card_network}</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Card actions */}
              <div className="bank-card p-3 flex items-center justify-between">
                <StatusBadge status={card.status} />
                <div className="flex gap-2">
                  {card.status === 'active' && (
                    <button onClick={() => handleFreeze(card.id)}
                      className={clsx('btn-ghost text-xs px-3 py-1.5', card.is_frozen ? 'text-amber-400' : 'text-blue-400')}>
                      <Snowflake size={12} /> {card.is_frozen ? 'Unfreeze' : 'Freeze'}
                    </button>
                  )}
                </div>
              </div>
              {card.status === 'pending' && (
                <Alert type="info" message="Card is pending admin activation." />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Virtual Card Modal */}
      <Modal isOpen={showVirtual} onClose={() => setShowVirtual(false)} title="Request Virtual Card">
        <div className="space-y-4">
          <FormGroup label="Account">
            <select value={virtualForm.account_id} onChange={e => setVirtualForm(f => ({ ...f, account_id: e.target.value }))} className="bank-select">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_type.toUpperCase()} ••{a.account_number?.slice(-4)}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Network">
            <div className="grid grid-cols-3 gap-2">
              {NETWORKS.map(n => (
                <button key={n} onClick={() => setVirtualForm(f => ({ ...f, card_network: n }))}
                  className={clsx('px-3 py-2 rounded-xl text-sm font-semibold transition-all capitalize',
                    virtualForm.card_network === n ? 'bg-primary-700 text-white' : 'btn-secondary')}>
                  {n}
                </button>
              ))}
            </div>
          </FormGroup>
          <FormGroup label="Card Theme">
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map(t => (
                <button key={t} onClick={() => setVirtualForm(f => ({ ...f, color_theme: t }))}
                  className={clsx('h-10 rounded-xl transition-all bg-gradient-to-br', getCardGradient(t),
                    virtualForm.color_theme === t ? 'ring-2 ring-blue-400 scale-110' : 'opacity-60 hover:opacity-90')} />
              ))}
            </div>
          </FormGroup>
          <div className="flex gap-3">
            <button onClick={() => setShowVirtual(false)} className="btn-secondary flex-1">Cancel</button>
            <LoadingButton loading={submitting} onClick={handleVirtual} className="btn-primary flex-1 justify-center">Request Card</LoadingButton>
          </div>
        </div>
      </Modal>

      {/* Link Card Modal */}
      <Modal isOpen={showLink} onClose={() => setShowLink(false)} title="Link External Card">
        <div className="space-y-3">
          <Alert type="info" message="We only store last 4 digits for security. This is for display purposes only." />
          <FormGroup label="Account">
            <select value={linkForm.account_id} onChange={e => setLinkForm(f => ({ ...f, account_id: e.target.value }))} className="bank-select">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_type.toUpperCase()} ••{a.account_number?.slice(-4)}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Card Last 4 Digits">
            <input maxLength={4} value={linkForm.card_number_last4} onChange={e => setLinkForm(f => ({ ...f, card_number_last4: e.target.value.replace(/\D/g,'').slice(0,4) }))} className="bank-input font-mono" placeholder="1234" />
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Expiry Month">
              <input maxLength={2} placeholder="MM" value={linkForm.expiry_month} onChange={e => setLinkForm(f => ({ ...f, expiry_month: e.target.value }))} className="bank-input font-mono" />
            </FormGroup>
            <FormGroup label="Expiry Year">
              <input maxLength={4} placeholder="YYYY" value={linkForm.expiry_year} onChange={e => setLinkForm(f => ({ ...f, expiry_year: e.target.value }))} className="bank-input font-mono" />
            </FormGroup>
          </div>
          <FormGroup label="Card Holder Name">
            <input type="text" value={linkForm.card_holder_name} onChange={e => setLinkForm(f => ({ ...f, card_holder_name: e.target.value }))} className="bank-input" />
          </FormGroup>
          <FormGroup label="Bank Name">
            <input type="text" value={linkForm.bank_name} onChange={e => setLinkForm(f => ({ ...f, bank_name: e.target.value }))} className="bank-input" placeholder="Your bank's name" />
          </FormGroup>
          <div className="flex gap-3">
            <button onClick={() => setShowLink(false)} className="btn-secondary flex-1">Cancel</button>
            <LoadingButton loading={submitting} onClick={handleLink} className="btn-primary flex-1 justify-center">Link Card</LoadingButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
