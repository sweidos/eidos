/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vardi: {
          bg:           '#080810',
          surface:      '#0f0f1a',
          elevated:     '#16162a',
          border:       '#1e1e3f',
          'border-dim': '#131328',
          accent:       '#6366f1',
          'accent-dim': '#6366f115',
          'accent-mid': '#6366f130',
          green:        '#10b981',
          'green-dim':  '#10b98115',
          amber:        '#f59e0b',
          'amber-dim':  '#f59e0b15',
          red:          '#ef4444',
          'red-dim':    '#ef444415',
          muted:        '#64748b',
          text:         '#e2e8f0',
          'text-dim':   '#94a3b8',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':      'fadeIn 0.25s ease-out',
        'slide-up':     'slideUp 0.25s ease-out',
        'flash-green':  'flashGreen 0.8s ease-out',
        'spin-slow':    'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn:     { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:    { from: { transform: 'translateY(6px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        flashGreen: { '0%': { backgroundColor: '#10b98120' }, '100%': { backgroundColor: 'transparent' } },
      },
    },
  },
  plugins: [],
}
