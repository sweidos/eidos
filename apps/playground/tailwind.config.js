/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Zinc-based dark + sky-blue accent
        // Deliberately not purple — sky evokes networking and connectivity
        eidos: {
          bg:           '#0a0a0f',
          surface:      '#111118',
          elevated:     '#1a1a24',
          border:       '#25252f',
          'border-dim': '#1c1c26',
          accent:       '#38bdf8',   // sky-400
          'accent-dim': 'rgba(56,189,248,0.07)',
          'accent-mid': 'rgba(56,189,248,0.15)',
          green:        '#34d399',   // emerald-400
          'green-dim':  'rgba(52,211,153,0.08)',
          amber:        '#fbbf24',   // amber-400
          'amber-dim':  'rgba(251,191,36,0.08)',
          red:          '#f87171',   // red-400
          'red-dim':    'rgba(248,113,113,0.08)',
          muted:        '#52525b',   // zinc-600
          text:         '#f4f4f5',   // zinc-100
          'text-dim':   '#a1a1aa',   // zinc-400
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-up':    'slideUp 0.2s ease-out',
        'slide-right': 'slideRight 0.2s ease-out',
        'pulse-slow':  'pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':   'spin 2s linear infinite',
        'blink':       'blink 1.2s step-end infinite',
      },
      keyframes: {
        fadeIn:     { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:    { from: { transform: 'translateY(6px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideRight: { from: { transform: 'translateX(-6px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        blink:      { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
    },
  },
  plugins: [],
}
