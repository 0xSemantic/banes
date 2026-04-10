/**
 * Banesco Bank - Admin Settings Page
 * Configure bank name, theme, loan settings, etc.
 */
import { useState } from 'react'
import { Settings, Palette, Building, DollarSign, Save, Info } from 'lucide-react'
import { PageHeader, FormGroup, Alert } from '../../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function AdminSettings() {
  const [saved, setSaved] = useState(false)

  const showSaveNote = () => {
    toast('Settings are configured via environment variables in backend/config.py', {
      icon: 'ℹ️',
      duration: 5000,
      style: { background: '#1a2a44', color: '#e8f0ff', border: '1px solid #243554' }
    })
  }

  const CONFIG_SECTIONS = [
    {
      title: 'Bank Identity',
      icon: Building,
      color: '#3b82f6',
      items: [
        { key: 'APP_NAME', label: 'Bank Name', default: 'Banesco Bank', desc: 'The name shown throughout the app' },
        { key: 'APP_TAGLINE', label: 'Tagline', default: 'Banking That Works For You', desc: 'Subtitle shown on login and splash' },
        { key: 'APP_LOGO', label: 'Logo Path', default: '/static/logo.png', desc: 'Path to logo PNG file' },
      ]
    },
    {
      title: 'Theme Colors',
      icon: Palette,
      color: '#8b5cf6',
      items: [
        { key: 'PRIMARY_COLOR', label: 'Primary Color', default: '#1a56db', type: 'color', desc: 'Main brand color (buttons, accents)' },
        { key: 'ACCENT_COLOR', label: 'Accent Color', default: '#06b6d4', type: 'color', desc: 'Secondary accent color' },
        { key: 'PWA_THEME_COLOR', label: 'PWA Theme Color', default: '#0f1f3d', type: 'color', desc: 'Mobile browser bar color' },
      ]
    },
    {
      title: 'Loan Configuration',
      icon: DollarSign,
      color: '#10b981',
      items: [
        { key: 'MIN_LOAN_AMOUNT', label: 'Minimum Loan Amount', default: '100', desc: 'Smallest loan users can apply for' },
        { key: 'MAX_LOAN_AMOUNT', label: 'Maximum Loan Amount', default: '100000', desc: 'Largest loan users can apply for' },
        { key: 'LOAN_INTEREST_RATE', label: 'Loan Interest Rate (%/month)', default: '5.0', desc: 'Monthly interest rate for all loans' },
      ]
    },
    {
      title: 'Security',
      icon: Settings,
      color: '#f59e0b',
      items: [
        { key: 'ADMIN_EMAIL', label: 'Admin Email', default: 'admin@banescobank.com', desc: 'Admin login email' },
        { key: 'ADMIN_PASSWORD', label: 'Admin Password', default: '••••••••', desc: 'Change in config.py or via env variable', type: 'password' },
        { key: 'ACCESS_TOKEN_EXPIRE_MINUTES', label: 'Session Duration (minutes)', default: '1440', desc: '1440 = 24 hours' },
      ]
    }
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" subtitle="Application configuration and customization" />

      <Alert type="info"
        title="How to configure"
        message="All settings are configured via environment variables or by editing backend/config.py. This page shows the current configuration for reference. To change settings, update your .env file and restart the server." />

      {/* Config sections */}
      {CONFIG_SECTIONS.map(section => (
        <div key={section.title} className="bank-card overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-bank-border"
            style={{ background: `${section.color}08` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${section.color}20` }}>
              <section.icon size={15} style={{ color: section.color }} />
            </div>
            <h3 className="text-sm font-bold text-bank-light">{section.title}</h3>
          </div>
          <div className="divide-y divide-bank-border">
            {section.items.map(item => (
              <div key={item.key} className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-bank-light">{item.label}</div>
                  <div className="text-xs text-bank-muted mt-0.5">{item.desc}</div>
                  <div className="text-[10px] font-mono text-bank-muted/60 mt-0.5">ENV: {item.key}</div>
                </div>
                <div className="flex items-center gap-3">
                  {item.type === 'color' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg border border-bank-border" style={{ background: item.default }} />
                      <span className="font-mono text-xs text-bank-light">{item.default}</span>
                    </div>
                  ) : (
                    <span className={clsx('font-mono text-xs text-bank-muted px-2 py-1 rounded-lg', 'bg-bank-surface')}>
                      {item.type === 'password' ? '••••••••' : item.default}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* How to customize section */}
      <div className="bank-card p-5">
        <h3 className="text-sm font-bold text-bank-light mb-4 flex items-center gap-2">
          <Info size={15} className="text-blue-400" /> How to Customize
        </h3>
        <div className="space-y-3 text-sm text-bank-muted">
          <div className="p-3 rounded-xl font-mono text-xs" style={{ background: 'var(--bg-surface)' }}>
            <div className="text-blue-400 mb-1"># Create a .env file in the Banesco/ directory:</div>
            <div>APP_NAME="My Custom Bank"</div>
            <div>APP_TAGLINE="Your trusted partner"</div>
            <div>PRIMARY_COLOR="#e11d48"</div>
            <div>ADMIN_EMAIL="myadmin@mybank.com"</div>
            <div>ADMIN_PASSWORD="SecurePassword123"</div>
          </div>
          <p>Or directly edit <span className="font-mono text-xs bg-bank-surface px-1.5 py-0.5 rounded">backend/config.py</span> to change defaults permanently.</p>
          <p>For the logo, replace <span className="font-mono text-xs bg-bank-surface px-1.5 py-0.5 rounded">frontend/public/logo.png</span> with your own PNG (recommended: 200×200px).</p>
          <p>To add new currencies, add them to the <span className="font-mono text-xs bg-bank-surface px-1.5 py-0.5 rounded">SUPPORTED_CURRENCIES</span> list in config.py.</p>
        </div>
      </div>

      {/* System info */}
      <div className="bank-card p-5">
        <h3 className="text-sm font-bold text-bank-light mb-3">System Information</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Backend', value: 'FastAPI + SQLite' },
            { label: 'Frontend', value: 'React 19 + Tailwind' },
            { label: 'Real-time', value: 'WebSockets' },
            { label: 'PWA', value: 'Vite PWA Plugin' },
            { label: 'Interest Engine', value: 'Built-in Scheduler' },
            { label: 'App Version', value: '1.0.0' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between p-2 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
              <span className="text-bank-muted text-xs">{label}</span>
              <span className="text-bank-light text-xs font-semibold">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
