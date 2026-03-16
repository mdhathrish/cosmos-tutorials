// constants/theme.ts — Cosmos Tutorials brand palette
export const Colors = {
  // Backgrounds
  bg:       '#060C1E',
  surface:  '#0C1633',
  card:     '#112048',
  border:   '#1E3470',

  // PRIMARY — warm white from logo background
  primary:  '#FAFAFA',
  warmoff:  '#F0EAE0',

  // Supporting brand
  blue:     '#1748A0',
  navy:     '#0E3080',
  orange:   '#F28233',
  amber:    '#D96B1D',
  peach:    '#FBBA8C',
  lightor:  '#FA9E5D',

  // Utility
  green:    '#22C55E',
  red:      '#EF4444',
  yellow:   '#F5C842',
  cyan:     '#38BDF8',

  // Text
  text:     '#E8EDF8',
  muted:    '#8899CC',
  subtle:   '#4A6090',
  white:    '#FFFFFF',
}

export function getHeatColor(pct: number): { bg: string; text: string; label: string } {
  if (pct >= 85)  return { bg: '#0A2A10', text: '#22C55E',  label: 'Excellent' }
  if (pct >= 70)  return { bg: '#102010', text: '#4ADE80',  label: 'Strong' }
  if (pct >= 55)  return { bg: '#1E1800', text: '#FA9E5D',  label: 'Good' }
  if (pct >= 40)  return { bg: '#2A1400', text: '#F28233',  label: 'Needs Work' }
  if (pct >= 25)  return { bg: '#2A0C00', text: '#D96B1D',  label: 'Weak' }
  return              { bg: '#1A0800',  text: '#EF4444',  label: 'Critical' }
}
