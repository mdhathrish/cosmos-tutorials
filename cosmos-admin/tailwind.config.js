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
          bg:       '#030409',     // Pure space
          surface:  'rgba(255, 255, 255, 0.03)',
          card:     '#0A0D1A',
          border:   'rgba(255, 255, 255, 0.08)',
          primary:  '#6366F1',   // Indigo
          warmoff:  '#F0EAE0',
          blue:     '#3B82F6',
          navy:     '#4338CA',
          orange:   '#F97316',
          amber:    '#FBBF24',
          peach:    '#818CF8',
          lightor:  '#FA9E5D',
          gold:     '#F5C842',
          green:    '#10B981',
          red:      '#EF4444',
          yellow:   '#F5C842',
          cyan:     '#06B6D4',
          text:     '#FAFAFA',
          muted:    '#A1A1AA',
          subtle:   '#52525B',
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
