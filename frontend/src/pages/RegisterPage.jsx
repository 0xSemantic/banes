/**
 * Banesco Bank - Register Page
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, User, Phone, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store'
import { FormGroup, Alert } from '../components/ui'
import toast from 'react-hot-toast'

const CURRENCIES = [
  { code: 'USD', label: '🇺🇸 US Dollar (USD)' },
  { code: 'GBP', label: '🇬🇧 British Pound (GBP)' },
  { code: 'EUR', label: '🇪🇺 Euro (EUR)' },
]

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', full_name: '', password: '', phone: '', preferred_currency: 'USD' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const { register, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.full_name || !form.password) {
      setError('Please fill all required fields'); return
    }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }

    const result = await register(form)
    if (result.success) {
      toast.success('Account created! Welcome to Banesco Bank.')
      navigate('/dashboard', { replace: true })
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-app)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-2xl text-white"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)', boxShadow: '0 0 30px rgba(29,78,216,0.4)' }}>
            B
          </div>
          <div>
            <div className="text-xl font-bold text-bank-light">Banesco Bank</div>
            <div className="text-xs text-bank-muted">Banking That Works For You</div>
          </div>
        </div>

        <div className="bank-card p-6">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-bank-light">Open an account</h1>
            <p className="text-sm text-bank-muted mt-1">Join thousands of happy customers</p>
          </div>

          {error && <Alert type="danger" message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormGroup label="Full Name *">
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bank-muted" />
                <input type="text" value={form.full_name} onChange={(e) => set('full_name', e.target.value)}
                  className="bank-input pl-10" placeholder="John Doe" />
              </div>
            </FormGroup>

            <FormGroup label="Email Address *">
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bank-muted" />
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  className="bank-input pl-10" placeholder="you@example.com" />
              </div>
            </FormGroup>

            <FormGroup label="Phone Number">
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bank-muted" />
                <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                  className="bank-input pl-10" placeholder="+1 234 567 8900" />
              </div>
            </FormGroup>

            <FormGroup label="Preferred Currency">
              <select value={form.preferred_currency} onChange={(e) => set('preferred_currency', e.target.value)}
                className="bank-select">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </FormGroup>

            <FormGroup label="Password *" hint="Minimum 8 characters">
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bank-muted" />
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  className="bank-input pl-10 pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-bank-muted hover:text-bank-light">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </FormGroup>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-sm justify-center mt-2">
              {isLoading ? <span className="spinner" /> : <><span>Create Account</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-sm text-bank-muted mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 font-semibold hover:text-blue-300">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs text-bank-muted mt-4">
          By creating an account you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
