// app/(auth)/login.tsx — Two-step: Institute Code → Branded Login
import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import { useColors } from '../../constants/theme'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { Building2, Eye, EyeOff, LogIn, Info, ArrowLeft } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface InstituteBranding {
  id: string
  name: string
  logo_url: string | null
  theme_id: string | null
  tagline: string | null
  institute_code: string
}

// Simple theme map matching admin's themes.ts
const THEME_COLORS: Record<string, { primary: string; secondary: string }> = {
  'cosmos-classic': { primary: '#4f46e5', secondary: '#6366f1' },
  'ocean-premium': { primary: '#0891b2', secondary: '#06b6d4' },
  'emerald-luxury': { primary: '#059669', secondary: '#10b981' },
  'crimson-royal': { primary: '#e11d48', secondary: '#f43f5e' },
  'golden-slate': { primary: '#d97706', secondary: '#f59e0b' },
  'violet-night': { primary: '#7c3aed', secondary: '#8b5cf6' },
}

export default function LoginScreen() {
  const Colors = useColors()
  const insets = useSafeAreaInsets()

  const [step, setStep] = useState<'code' | 'login'>('code')
  const [institute, setInstitute] = useState<InstituteBranding | null>(null)

  // Code entry
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')

  // Login
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  // Derived colors from institute theme
  const themeColors = institute?.theme_id ? THEME_COLORS[institute.theme_id] : null
  const primaryColor = themeColors?.primary || Colors.primary
  const secondaryColor = themeColors?.secondary || Colors.primaryLight
  const gradientColors = [primaryColor, secondaryColor] as const

  // Restore saved institute on mount
  useEffect(() => {
    AsyncStorage.getItem('cosmos_institute_code').then(saved => {
      if (saved) lookupInstitute(saved)
    })
  }, [])

  const lookupInstitute = async (inputCode: string) => {
    setCodeLoading(true)
    setCodeError('')
    const trimmed = inputCode.trim().toUpperCase()
    if (!trimmed) { setCodeError('Please enter an institute code'); setCodeLoading(false); return }

    const { data, error } = await supabase
      .from('institutes')
      .select('id, name, logo_url, theme_id, tagline, institute_code')
      .eq('institute_code', trimmed)
      .single()

    if (error || !data) {
      setCodeError('Institute not found. Check the code and try again.')
      setCodeLoading(false)
      return
    }

    setInstitute(data)
    AsyncStorage.setItem('cosmos_institute_code', trimmed)
    setStep('login')
    setCodeLoading(false)
  }

  const handleBack = () => {
    setStep('code')
    setInstitute(null)
    setCodeError('')
    AsyncStorage.removeItem('cosmos_institute_code')
  }

  const handleLogin = async () => {
    if (!email.trim())    { Alert.alert('Missing Email', 'Please enter your email address.'); return }
    if (!password.trim()) { Alert.alert('Missing Password', 'Please enter your password.'); return }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login')) {
        Alert.alert('Authentication Failed', 'Incorrect email or password.\n\nPlease contact the academy if you lost your credentials.')
      } else {
        Alert.alert('Connection Error', error.message)
      }
      setLoading(false)
    }
  }

  const styles = getStyles(Colors, primaryColor, secondaryColor)

  // ───────── STEP 1: Institute Code Entry ─────────
  if (step === 'code') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top + 20, 60) }]} keyboardShouldPersistTaps="handled">

          <Animated.View entering={FadeInDown.duration(800).springify().damping(12)} style={styles.logoContainer}>
            <View style={[styles.codeIconCircle, { backgroundColor: Colors.primary + '15' }]}>
              <Building2 color={Colors.primary} size={40} strokeWidth={2} />
            </View>
            <Text style={styles.brandName}>Welcome</Text>
            <Text style={styles.brandTagline}>Enter your institute code to continue</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(800).delay(200).springify().damping(14)}>
            <LinearGradient colors={Colors.gradientCard} style={styles.card} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
              <Text style={styles.cardTitle}>Institute Code</Text>
              <Text style={styles.cardSubtitle}>
                This code is provided by your institute. Enter it below to access your academy's portal.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Code</Text>
                <TextInput
                  style={[styles.input, { textAlign: 'center', fontSize: 22, letterSpacing: 6, fontFamily: 'Outfit_800ExtraBold' }]}
                  placeholder="e.g. JSR001"
                  placeholderTextColor={Colors.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={code}
                  onChangeText={t => setCode(t.toUpperCase())}
                  maxLength={20}
                  autoFocus
                  onSubmitEditing={() => lookupInstitute(code)}
                  returnKeyType="go"
                />
              </View>

              {codeError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{codeError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.btn, codeLoading && styles.btnDisabled]}
                onPress={() => lookupInstitute(code)}
                disabled={codeLoading}
                activeOpacity={0.8}
              >
                {codeLoading
                  ? <ActivityIndicator color="#fff" />
                  : (
                    <>
                      <Text style={styles.btnText}>Find My Institute</Text>
                      <Building2 color="#fff" size={18} strokeWidth={2.5} />
                    </>
                  )
                }
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(1000).delay(400)} style={styles.footer}>
            Powered by Cosmos Platform
          </Animated.Text>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ───────── STEP 2: Branded Login Form ─────────
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top + 20, 60) }]} keyboardShouldPersistTaps="handled">

        {/* Back button */}
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft color={primaryColor} size={18} />
          <Text style={[styles.backText, { color: primaryColor }]}>Change Institute</Text>
        </TouchableOpacity>

        <Animated.View entering={FadeInDown.duration(800).springify().damping(12)} style={styles.logoContainer}>
          {institute?.logo_url ? (
            <View style={[styles.logoCircle, { backgroundColor: 'transparent', borderWidth: 1, borderColor: primaryColor + '30' }]}>
              <Image source={{ uri: institute.logo_url }} style={{ width: 88, height: 88, borderRadius: 28 }} />
            </View>
          ) : (
            <LinearGradient colors={gradientColors} style={styles.logoCircle}>
              <Text style={{ fontSize: 36, fontFamily: 'Outfit_800ExtraBold', color: '#fff' }}>
                {institute?.name?.[0] || 'A'}
              </Text>
            </LinearGradient>
          )}
          <Text style={[styles.brandName, { color: primaryColor }]}>{institute?.name || 'Academy'}</Text>
          <Text style={[styles.brandTagline, { color: secondaryColor }]}>{institute?.tagline || 'Parent Portal'}</Text>

          {/* Code badge */}
          <View style={[styles.codeBadge, { backgroundColor: primaryColor + '15' }]}>
            <Building2 color={primaryColor} size={10} />
            <Text style={[styles.codeBadgeText, { color: primaryColor }]}>{institute?.institute_code}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(200).springify().damping(14)}>
          <LinearGradient colors={Colors.gradientCard} style={[styles.card, { borderColor: primaryColor + '20' }]} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>
              Sign in with the credentials provided by {institute?.name || 'your academy'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Registered Email</Text>
              <TextInput
                style={styles.input}
                placeholder="parent@email.com"
                placeholderTextColor={Colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.muted}
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn} activeOpacity={0.7}>
                  {showPass ? <EyeOff color={secondaryColor} size={20} /> : <Eye color={Colors.muted} size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: primaryColor, shadowColor: primaryColor }, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : (
                  <>
                    <Text style={styles.btnText}>Authenticate</Text>
                    <LogIn color="#fff" size={18} strokeWidth={2.5} />
                  </>
                )
              }
            </TouchableOpacity>

            <View style={[styles.helpBox, { borderColor: primaryColor + '20', backgroundColor: primaryColor + '08' }]}>
              <Info color={secondaryColor} size={16} />
              <Text style={[styles.helpText, { color: secondaryColor }]}>
                No account? Contact {institute?.name || 'the academy'} for onboarding.
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.Text entering={FadeInDown.duration(1000).delay(400)} style={styles.footer}>
          {institute?.name || 'Academy'} · Powered by Cosmos
        </Animated.Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const getStyles = (Colors: any, primaryColor: string, secondaryColor: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll:    { flexGrow: 1, justifyContent: 'center', padding: 24 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },

  logoContainer: { alignItems: 'center', marginBottom: 40 },
  codeIconCircle: {
    width: 88, height: 88, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 88, height: 88, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, overflow: 'hidden',
    shadowColor: primaryColor, shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 10 }, shadowRadius: 24, elevation: 12,
  },
  brandName:    { fontSize: 36, fontFamily: 'Outfit_800ExtraBold', color: Colors.text, letterSpacing: -1 },
  brandTagline: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: Colors.primaryLight, marginTop: 4, letterSpacing: 0.5 },

  codeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  codeBadgeText: { fontSize: 10, fontFamily: 'Outfit_800ExtraBold', letterSpacing: 2 },

  card: {
    borderRadius: 28,
    borderWidth: 1, borderColor: Colors.border, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 15 },
  },
  cardTitle:    { fontSize: 24, fontFamily: 'Outfit_700Bold', color: Colors.text, marginBottom: 8, letterSpacing: -0.5 },
  cardSubtitle: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: Colors.muted, marginBottom: 28, lineHeight: 20 },

  inputGroup:  { marginBottom: 20 },
  inputLabel: {
    fontSize: 11, fontFamily: 'Outfit_700Bold', color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 16,
    color: Colors.text, fontSize: 16, fontFamily: 'Outfit_500Medium',
  },
  passwordRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  passwordInput:{ flex: 1 },
  eyeBtn: {
    paddingHorizontal: 14, paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
  },

  btn: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginTop: 12,
    flexDirection: 'row', gap: 10,
    shadowColor: Colors.primary, shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit_700Bold', letterSpacing: 0.5 },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12, padding: 12, marginBottom: 8,
  },
  errorText: { color: '#ef4444', fontSize: 13, fontFamily: 'Outfit_500Medium', textAlign: 'center' },

  helpBox: {
    marginTop: 24, padding: 14, borderRadius: 12,
    flexDirection: 'row', gap: 10, alignItems: 'center',
    borderWidth: 1,
  },
  helpText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: 'Outfit_500Medium' },

  footer: { textAlign: 'center', color: Colors.subtle, fontSize: 11, marginTop: 40, fontFamily: 'Outfit_500Medium', letterSpacing: 0.5 },
})
