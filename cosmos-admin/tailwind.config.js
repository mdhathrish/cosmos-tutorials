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
          bg:       '#060C1E',
          surface:  '#0C1633',
          card:     '#112048',
          border:   '#1E3470',
          primary:  '#FAFAFA',   // warm white — logo background
          warmoff:  '#F0EAE0',   // slightly warm tint for hover
          blue:     '#1748A0',   // royal blue — supporting
          navy:     '#0E3080',
          orange:   '#F28233',   // accent
          amber:    '#D96B1D',
          peach:    '#FBBA8C',
          lightor:  '#FA9E5D',
          gold:     '#F5C842',
          green:    '#22C55E',
          red:      '#EF4444',
          yellow:   '#F5C842',
          cyan:     '#38BDF8',
          text:     '#E8EDF8',
          muted:    '#8899CC',
          subtle:   '#4A6090',
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
