// app/(auth)/login.tsx
// Email + Password login — free, no Twilio, session persists forever
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/theme'

export default function LoginScreen() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    if (!email.trim())    { Alert.alert('Please enter your email'); return }
    if (!password.trim()) { Alert.alert('Please enter your password'); return }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login')) {
        Alert.alert('Login Failed', 'Incorrect email or password.\n\nContact your teacher to get your login details.')
      } else {
        Alert.alert('Error', error.message)
      }
      setLoading(false)
    }
    // On success — session auto-persists, _layout.tsx redirects to tabs
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🔭</Text>
          </View>
          <Text style={styles.brandName}>Cosmos Tutorials</Text>
          <Text style={styles.brandTagline}>IIT Foundation · Parent Portal</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>
            Sign in with the email & password provided by your teacher
          </Text>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
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

          {/* Password */}
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
              <TouchableOpacity
                onPress={() => setShowPass(p => !p)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={Colors.bg} />
              : <Text style={styles.btnText}>Sign In →</Text>
            }
          </TouchableOpacity>

          {/* Help text */}
          <View style={styles.helpBox}>
            <Text style={styles.helpText}>
              📞 Don&apos;t have login details? Contact your teacher to get your email & password.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>Cosmos Tutorials · Hyderabad · IIT Foundation</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll:    { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoContainer: { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary, shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  logoEmoji:    { fontSize: 36 },
  brandName:    { fontSize: 26, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5 },
  brandTagline: { fontSize: 13, color: Colors.muted, marginTop: 4 },

  card: {
    backgroundColor: Colors.card, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, padding: 24,
  },
  cardTitle:    { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: Colors.muted, marginBottom: 24, lineHeight: 18 },

  inputGroup:  { marginBottom: 16 },
  inputLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 13,
    color: Colors.text, fontSize: 15,
  },
  passwordRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passwordInput:{ flex: 1 },
  eyeBtn: {
    paddingHorizontal: 12, paddingVertical: 13,
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  eyeText: { fontSize: 16 },

  btn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
    shadowColor: Colors.primary, shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.bg, fontSize: 16, fontWeight: '800' },

  helpBox: {
    marginTop: 16, backgroundColor: Colors.surface,
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border,
  },
  helpText: { fontSize: 12, color: Colors.muted, lineHeight: 18, textAlign: 'center' },

  footer: { textAlign: 'center', color: Colors.subtle, fontSize: 11, marginTop: 28 },
})
