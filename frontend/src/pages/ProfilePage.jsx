/**
 * Credex Bank - Profile Page
 */
import { useState } from 'react'
import { User, Mail, Phone, MapPin, Calendar, Shield, Lock, CheckCircle, AlertCircle, Edit2 } from 'lucide-react'
import { useAuthStore } from '../store'
import api from '../utils/api'
import { formatDate } from '../utils/helpers'
import { PageHeader, FormGroup, LoadingButton, Alert, Modal } from '../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function ProfilePage() {
  const { user, refreshProfile } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [showChangePass, setShowChangePass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    date_of_birth: user?.date_of_birth || '',
    preferred_currency: user?.preferred_currency || 'USD',
  })
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setPass = (k, v) => setPassForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSubmitting(true)
    try {
      await api.put('/users/profile', form)
      await refreshProfile()
      toast.success('Profile updated')
      setEditing(false)
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to update') }
    finally { setSubmitting(false) }
  }

  const handleChangePass = async () => {
    if (passForm.new_password !== passForm.confirm_password) { toast.error('Passwords do not match'); return }
    if (passForm.new_password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setSubmitting(true)
    try {
      await api.post('/users/change-password', { current_password: passForm.current_password, new_password: passForm.new_password })
      toast.success('Password changed successfully')
      setShowChangePass(false)
      setPassForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const handleKycSubmit = async () => {
    try {
      await api.post('/users/kyc-submit')
      await refreshProfile()
      toast.success('KYC submitted for verification')
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
  }

  const kycColors = { verified: '#10b981', pending: '#f59e0b', rejected: '#ef4444' }
  const kycColor = kycColors[user?.kyc_status] || '#8899b5'

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Profile" subtitle="Manage your personal information" />

      {/* Profile header card */}
      <div className="bank-card p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
          {user?.full_name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold text-bank-light">{user?.full_name}</div>
          <div className="text-sm text-bank-muted">{user?.email}</div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${kycColor}20`, color: kycColor, border: `1px solid ${kycColor}40` }}>
              KYC: {user?.kyc_status?.toUpperCase()}
            </span>
            {user?.is_verified && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle size={11} /> Verified
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setEditing(e => !e)} className="btn-secondary text-xs py-2">
          <Edit2 size={13} /> {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* KYC Alert */}
      {user?.kyc_status !== 'verified' && (
        <div className="bank-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.15)' }}>
              <Shield size={16} className="text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-bank-light">Identity Verification</div>
              <div className="text-xs text-bank-muted">
                {user?.kyc_status === 'rejected' ? 'Verification failed. Please resubmit.' : 'Submit KYC to unlock all features.'}
              </div>
            </div>
          </div>
          <button onClick={handleKycSubmit} className="btn-primary text-xs py-2">
            {user?.kyc_status === 'pending' ? 'Resubmit' : 'Verify Now'}
          </button>
        </div>
      )}

      {/* Personal Info */}
      <div className="bank-card p-5">
        <h3 className="text-sm font-bold text-bank-light mb-4 flex items-center gap-2">
          <User size={15} className="text-bank-muted" /> Personal Information
        </h3>
        {editing ? (
          <div className="space-y-4">
            <FormGroup label="Full Name">
              <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} className="bank-input" />
            </FormGroup>
            <FormGroup label="Phone Number">
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="bank-input" placeholder="+1 234 567 8900" />
            </FormGroup>
            <FormGroup label="Address">
              <input type="text" value={form.address} onChange={e => set('address', e.target.value)} className="bank-input" placeholder="Your address" />
            </FormGroup>
            <FormGroup label="Date of Birth">
              <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className="bank-input" />
            </FormGroup>
            <FormGroup label="Preferred Currency">
              <select value={form.preferred_currency} onChange={e => set('preferred_currency', e.target.value)} className="bank-select">
                {['USD', 'GBP', 'EUR'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormGroup>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
              <LoadingButton loading={submitting} onClick={handleSave} className="btn-primary flex-1 justify-center">Save Changes</LoadingButton>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { icon: User, label: 'Full Name', value: user?.full_name },
              { icon: Mail, label: 'Email', value: user?.email },
              { icon: Phone, label: 'Phone', value: user?.phone || '—' },
              { icon: MapPin, label: 'Address', value: user?.address || '—' },
              { icon: Calendar, label: 'Date of Birth', value: user?.date_of_birth || '—' },
              { icon: Calendar, label: 'Member Since', value: formatDate(user?.created_at) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 py-2 border-b border-bank-border last:border-0">
                <Icon size={14} className="text-bank-muted flex-shrink-0" />
                <span className="text-xs text-bank-muted w-28 flex-shrink-0">{label}</span>
                <span className="text-sm text-bank-light">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security */}
      <div className="bank-card p-5">
        <h3 className="text-sm font-bold text-bank-light mb-4 flex items-center gap-2">
          <Lock size={15} className="text-bank-muted" /> Security
        </h3>
        <div className="flex items-center justify-between py-3 border-b border-bank-border">
          <div>
            <div className="text-sm font-semibold text-bank-light">Password</div>
            <div className="text-xs text-bank-muted">Last changed: Unknown</div>
          </div>
          <button onClick={() => setShowChangePass(true)} className="btn-secondary text-xs py-2">Change</button>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-semibold text-bank-light">Last Login</div>
            <div className="text-xs text-bank-muted">{user?.last_login ? formatDate(user.last_login, 'MMM d, yyyy · h:mm a') : 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal isOpen={showChangePass} onClose={() => setShowChangePass(false)} title="Change Password">
        <div className="space-y-4">
          <FormGroup label="Current Password">
            <input type="password" value={passForm.current_password} onChange={e => setPass('current_password', e.target.value)} className="bank-input" placeholder="••••••••" />
          </FormGroup>
          <FormGroup label="New Password">
            <input type="password" value={passForm.new_password} onChange={e => setPass('new_password', e.target.value)} className="bank-input" placeholder="Min. 8 characters" />
          </FormGroup>
          <FormGroup label="Confirm New Password">
            <input type="password" value={passForm.confirm_password} onChange={e => setPass('confirm_password', e.target.value)} className="bank-input" placeholder="Repeat new password" />
          </FormGroup>
          {passForm.new_password && passForm.confirm_password && passForm.new_password !== passForm.confirm_password && (
            <p className="text-xs text-red-400">Passwords do not match</p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setShowChangePass(false)} className="btn-secondary flex-1">Cancel</button>
            <LoadingButton loading={submitting} onClick={handleChangePass} className="btn-primary flex-1 justify-center">Update Password</LoadingButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
