// constants/theme.ts — Cosmos Tutorials Premium Brand Palette (V2)

import { useColorScheme } from 'react-native'

export const LightColors = {
  bg:       '#F8FAFC',     // Slate 50
  surface:  'rgba(15, 23, 42, 0.04)', // Tinted Slate
  card:     '#FFFFFF',
  border:   'rgba(15, 23, 42, 0.08)',
  
  primary:  '#6366F1',
  primaryLight: '#818CF8',
  primaryDark:  '#4338CA',
  blue:     '#3B82F6',
  orange:   '#EA580C',     // Darkened for contrast on white
  yellow:   '#D97706',
  green:    '#059669',
  red:      '#DC2626',
  cyan:     '#0891B2',

  text:     '#0F172A',     // Slate 900
  muted:    '#64748B',     // Slate 500
  subtle:   '#94A3B8',     // Slate 400
  white:    '#FFFFFF',
  
  gradientCard: ['#FFFFFF', '#F8FAFC'] as const,
  gradientPrimary: ['#6366F1', '#4F46E5'] as const,
}

export const DarkColors = {
  bg:       '#030409',     // Pure space
  surface:  'rgba(255, 255, 255, 0.03)', 
  card:     '#0A0D1A',     
  border:   'rgba(255, 255, 255, 0.08)', 

  primary:  '#6366F1',
  primaryLight: '#818CF8',
  primaryDark:  '#4338CA',
  blue:     '#3B82F6',
  orange:   '#F97316',
  yellow:   '#FBBF24',
  green:    '#10B981',
  red:      '#EF4444',
  cyan:     '#06B6D4',

  text:     '#FAFAFA',
  muted:    '#A1A1AA',
  subtle:   '#52525B',
  white:    '#FFFFFF',
  
  gradientCard: ['#121626', '#090B14'] as const,
  gradientPrimary: ['#6366F1', '#4F46E5'] as const,
}

export function useColors() {
  const scheme = useColorScheme()
  return scheme === 'light' ? LightColors : DarkColors
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
