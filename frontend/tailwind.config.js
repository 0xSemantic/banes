/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary bank brand colors - easily changeable
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Dark navy banking surface colors
        surface: {
          50:  '#f0f4ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        bank: {
          dark:    '#0a1628',
          navy:    '#0f1f3d',
          surface: '#162032',
          card:    '#1a2a44',
          border:  '#243554',
          muted:   '#8899b5',
          text:    '#c8d8f0',
          light:   '#e8f0ff',
        },
        // Status colors
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#ef4444',
        info:    '#06b6d4',
      },
      fontFamily: {
        sans:    ['Sora', 'system-ui', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card':    '0 4px 24px rgba(0,0,0,0.35)',
        'card-lg': '0 8px 40px rgba(0,0,0,0.45)',
        'glow':    '0 0 20px rgba(59,130,246,0.3)',
        'glow-lg': '0 0 40px rgba(59,130,246,0.4)',
      },
      backgroundImage: {
        'gradient-bank': 'linear-gradient(135deg, #0a1628 0%, #0f1f3d 50%, #0a1628 100%)',
        'gradient-card': 'linear-gradient(135deg, #1a2a44 0%, #162032 100%)',
        'gradient-primary': 'linear-gradient(135deg, #1d4ed8 0%, #1a56db 50%, #0891b2 100%)',
        'gradient-gold': 'linear-gradient(135deg, #92400e 0%, #d97706 50%, #fbbf24 100%)',
        'gradient-green': 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
      },
      animation: {
        'fade-in':     'fadeIn 0.3s ease-out',
        'slide-up':    'slideUp 0.35s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'pulse-slow':  'pulse 3s infinite',
        'shimmer':     'shimmer 2s infinite linear',
        'float':       'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideRight:{ from: { opacity: 0, transform: 'translateX(-20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
    },
  },
  plugins: [],
}
