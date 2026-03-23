/** @type {import('tailwindcss').Config} */
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
          bg:       '#F8FAFC',     // Slate 50
          surface:  'rgba(15, 23, 42, 0.04)', // Tinted Slate
          card:     '#FFFFFF',
          border:   'rgba(15, 23, 42, 0.08)',
          primary:  '#6366F1',   // Indigo
          warmoff:  '#F0EAE0',
          blue:     '#3B82F6',
          navy:     '#4338CA',
          orange:   '#EA580C',
          amber:    '#D97706',
          peach:    '#818CF8',
          lightor:  '#FA9E5D',
          gold:     '#F5C842',
          green:    '#059669',
          red:      '#DC2626',
          yellow:   '#D97706',
          cyan:     '#0891B2',
          text:     '#0F172A',
          muted:    '#64748B',
          subtle:   '#94A3B8',
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
