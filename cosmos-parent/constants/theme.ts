// constants/theme.ts — Cosmos Tutorials Premium Brand Palette (V2)

export const Colors = {
  // Deep Space Backgrounds (Ultra Premium Dark Mode)
  bg:       '#030409',     // Pure deep space
  surface:  'rgba(255, 255, 255, 0.03)', // Frosted glass ready
  card:     '#0A0D1A',     // Elevated card background
  border:   'rgba(255, 255, 255, 0.08)', // Barely-there borders

  // Primary Brand - Electric Indigo / Nebula
  primary:  '#6366F1',     // Vibrant Indigo
  primaryLight: '#818CF8', // Soft Indigo
  primaryDark:  '#4338CA', // Deep Indigo

  // Data / Accent
  blue:     '#3B82F6',
  orange:   '#F97316',
  yellow:   '#FBBF24',
  green:    '#10B981',
  red:      '#EF4444',
  cyan:     '#06B6D4',

  // Typography - Crisp & Minimal
  text:     '#FAFAFA',     // Brilliant White
  muted:    '#A1A1AA',     // Zinc 400
  subtle:   '#52525B',     // Zinc 600
  white:    '#FFFFFF',
  
  // Gradients presets
  gradientCard: ['#121626', '#090B14'] as const,
  gradientPrimary: ['#6366F1', '#4F46E5'] as const,
}

// V2 Modern Heat Colors for Performance/Attendance
export function getHeatColor(pct: number): { bg: string; text: string; label: string } {
  if (pct >= 85)  return { bg: 'rgba(16, 185, 129, 0.1)', text: '#34D399', label: 'Excellent' }
  if (pct >= 70)  return { bg: 'rgba(52, 211, 153, 0.1)', text: '#6EE7B7', label: 'Strong' }
  if (pct >= 55)  return { bg: 'rgba(251, 191, 36, 0.1)', text: '#FCD34D', label: 'Good' }
  if (pct >= 40)  return { bg: 'rgba(249, 115, 22, 0.1)', text: '#FDBA74', label: 'Needs Work' }
  if (pct >= 25)  return { bg: 'rgba(239, 68, 68, 0.1)',  text: '#FCA5A5', label: 'Weak' }
  return              { bg: 'rgba(185, 28, 28, 0.1)',  text: '#F87171', label: 'Critical' }
}
