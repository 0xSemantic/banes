/**
 * Banesco Bank - Login Page 
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store'
import { FormGroup, Alert } from '../components/ui'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) { setError('Please fill all fields'); return }

    const result = await login(form.email, form.password)
    if (result.success) {
      toast.success('Welcome back!')
      navigate(result.is_admin ? '/admin' : '/dashboard', { replace: true })
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-app)' }}>
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0a1f4a 0%, #0f2d6b 50%, #0a1628 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />
        <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-2xl text-white"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)', boxShadow: '0 0 30px rgba(29,78,216,0.5)' }}>
            B
          </div>
          <div>
            <div className="text-xl font-bold text-white">Banesco Bank</div>
            <div className="text-xs text-blue-300/80">Banking That Works For You</div>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Your finances,<br />
            <span style={{ background: 'linear-gradient(90deg, #60a5fa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              beautifully managed.
            </span>
          </h2>
          <p className="text-blue-200/70 text-base mb-8 max-w-sm leading-relaxed">
            Experience full-featured banking with instant transfers, smart savings, flexible loans, and real-time tracking.
          </p>
          <div className="space-y-3">
            {['Multi-currency support', 'Smart savings with daily interest', 'Instant loan processing', 'Real-time notifications'].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)' }}>
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <span className="text-sm text-blue-100/80">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-blue-300/50 relative z-10">
          <ShieldCheck size={13} />
          <span>256-bit SSL encrypted · Bank-grade security</span>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl text-white"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>C</div>
            <div className="font-bold text-lg text-bank-light">Banesco Bank</div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-bank-light mb-1">Welcome back</h1>
            <p className="text-sm text-bank-muted">Sign in to your account to continue</p>
          </div>

          {error && <Alert type="danger" message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormGroup label="Email Address">
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bank-muted" />
                <input
                  type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="bank-input pl-10" placeholder="you@example.com" autoComplete="email" />
              </div>
            </FormGroup>

            <FormGroup label="Password">
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bank-muted" />
                <input
                  type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  className="bank-input pl-10 pr-10" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-bank-muted hover:text-bank-light transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </FormGroup>

            <button type="submit" disabled={isLoading}
              className="btn-primary w-full py-3 text-sm justify-center mt-2">
              {isLoading ? <span className="spinner" /> : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-sm text-bank-muted mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
              Create account
            </Link>
          </p>

          {/* Demo hint */}
          {/* <div className="mt-6 p-4 rounded-xl text-xs text-bank-muted text-center"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <div className="font-semibold text-bank-light mb-1">Demo Credentials</div>
            <div>Admin: <span className="font-mono text-blue-400">admin@credexbank.com</span></div>
            <div>Password: <span className="font-mono text-blue-400">Admin@Credex2024</span></div>
          </div> */}
        </div>
      </div>
    </div>
  )
}
