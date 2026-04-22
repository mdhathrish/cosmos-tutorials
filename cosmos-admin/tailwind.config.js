/** @type {import('tailwindcss').Config} */

// Helper: wrap a CSS variable in a way that Tailwind's opacity modifier works
// This uses the modern CSS color-mix approach
function withOpacity(varName) {
  return `var(${varName})`
}

module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cosmos: {
          bg:       'var(--cosmos-bg)',
          surface:  'var(--cosmos-surface)',
          card:     'var(--cosmos-card)',
          border:   'var(--cosmos-border)',
          primary:  'var(--cosmos-primary)',
          warmoff:  'var(--cosmos-warmoff)',
          blue:     'var(--cosmos-blue)',
          navy:     'var(--cosmos-navy)',
          orange:   'var(--cosmos-orange)',
          amber:    'var(--cosmos-amber)',
          peach:    'var(--cosmos-peach)',
          lightor:  'var(--cosmos-lightor)',
          gold:     'var(--cosmos-gold)',
          green:    'var(--cosmos-green)',
          red:      'var(--cosmos-red)',
          yellow:   'var(--cosmos-yellow)',
          cyan:     'var(--cosmos-cyan)',
          text:     'var(--cosmos-text)',
          muted:    'var(--cosmos-muted)',
          subtle:   'var(--cosmos-subtle)',
        }
      },
      fontFamily: {
        display: ['var(--font-sora)', 'sans-serif'],
        body:    ['var(--font-inter)', 'sans-serif'],
        mono:    ['var(--font-jetbrains)', 'monospace'],
      },
      boxShadow: {
        glow:         '0 0 24px rgba(250,250,250,0.15)',
        'glow-orange':'0 0 24px rgba(242,130,51,0.4)',
        'glow-blue':  '0 0 24px rgba(23,72,160,0.4)',
      },
      backgroundImage: {
        'cosmos-gradient':  'linear-gradient(135deg, #060C1E 0%, #0C1633 50%, #060C1E 100%)',
        'primary-gradient': 'linear-gradient(135deg, #FAFAFA, #EDE5D8)',
        'orange-gradient':  'linear-gradient(135deg, #F28233, #D96B1D)',
        'blue-gradient':    'linear-gradient(135deg, #1748A0, #0E3080)',
      }
    },
  },
  plugins: [],
}
