// app/(auth)/login.tsx
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/theme'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { Telescope, Eye, EyeOff, LogIn, Info } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top + 20, 60) }]} keyboardShouldPersistTaps="handled">

        <Animated.View entering={FadeInDown.duration(800).springify().damping(12)} style={styles.logoContainer}>
          <LinearGradient colors={Colors.gradientPrimary} style={styles.logoCircle}>
            <Telescope color="#fff" size={40} strokeWidth={2} />
          </LinearGradient>
          <Text style={styles.brandName}>Cosmos</Text>
          <Text style={styles.brandTagline}>IIT Foundation · Parent Portal</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(200).springify().damping(14)}>
          <LinearGradient colors={Colors.gradientCard} style={styles.card} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>
              Sign in with the secure credentials provided by your instructor
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
              <Text style={styles.inputLabel}>Security Code</Text>
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
                <TouchableOpacity
                  onPress={() => setShowPass(p => !p)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  {showPass ? <EyeOff color={Colors.primaryLight} size={20} /> : <Eye color={Colors.muted} size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
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

            <View style={styles.helpBox}>
              <Info color={Colors.primaryLight} size={16} />
              <Text style={styles.helpText}>
                No account? Please contact academy administration for onboarding.
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.Text entering={FadeInDown.duration(1000).delay(400)} style={styles.footer}>
          Cosmos Tutorials · Hyderabad · Securing Futures
        </Animated.Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll:    { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary, shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 10 }, shadowRadius: 24, elevation: 12,
  },
  brandName:    { fontSize: 36, fontFamily: 'Outfit_800ExtraBold', color: Colors.text, letterSpacing: -1 },
  brandTagline: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: Colors.primaryLight, marginTop: 4, letterSpacing: 0.5 },

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

  helpBox: {
    marginTop: 24, padding: 14, borderRadius: 12, 
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)'
  },
  helpText: { flex: 1, fontSize: 12, color: Colors.primaryLight, lineHeight: 18, fontFamily: 'Outfit_500Medium' },

  footer: { textAlign: 'center', color: Colors.subtle, fontSize: 11, marginTop: 40, fontFamily: 'Outfit_500Medium', letterSpacing: 0.5 },
})
