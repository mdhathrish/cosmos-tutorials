// app/(auth)/login.tsx
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/theme'

export default function LoginScreen() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp]   = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async () => {
    if (!phone.trim()) { Alert.alert('Enter your phone number'); return }
    setLoading(true)

    // Format phone: ensure +91 prefix
    const formatted = phone.startsWith('+') ? phone : `+91${phone.replace(/\s/g, '')}`

    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setStep('otp')
    }
    setLoading(false)
  }

  const handleVerifyOtp = async () => {
    if (!otp.trim()) { Alert.alert('Enter the OTP'); return }
    setLoading(true)
    const formatted = phone.startsWith('+') ? phone : `+91${phone.replace(/\s/g, '')}`

    const { error } = await supabase.auth.verifyOtp({
      phone: formatted,
      token: otp,
      type: 'sms'
    })
    if (error) Alert.alert('Invalid OTP', error.message)
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🔭</Text>
          </View>
          <Text style={styles.brandName}>Cosmos Tutorials</Text>
          <Text style={styles.brandTagline}>IIT Foundation · Parent Portal</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {step === 'phone' ? 'Welcome Back' : 'Verify OTP'}
          </Text>
          <Text style={styles.cardSubtitle}>
            {step === 'phone'
              ? 'Enter your registered phone number'
              : `We sent a 6-digit code to ${phone}`}
          </Text>

          {step === 'phone' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    placeholder="98765 43210"
                    placeholderTextColor={Colors.muted}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    maxLength={10}
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Send OTP →</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>6-Digit OTP</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="• • • • • •"
                  placeholderTextColor={Colors.muted}
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={setOtp}
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Verify & Login</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backBtn} onPress={() => setStep('phone')}>
                <Text style={styles.backBtnText}>← Change number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.footer}>Cosmos Tutorials, Hyderabad</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, shadowColor: Colors.primary, shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  logoEmoji: { fontSize: 32 },
  brandName: { fontSize: 24, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  brandTagline: { fontSize: 13, color: Colors.muted, marginTop: 4 },

  card: {
    backgroundColor: Colors.card, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, padding: 24,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: Colors.muted, marginBottom: 24 },

  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  phoneRow: { flexDirection: 'row', gap: 10 },
  countryCode: {
    paddingHorizontal: 12, paddingVertical: 13,
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, justifyContent: 'center',
  },
  countryCodeText: { fontSize: 14, color: Colors.text },
  input: {
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 13,
    color: Colors.text, fontSize: 15,
  },
  phoneInput: { flex: 1, fontFamily: 'Courier', letterSpacing: 1 },
  otpInput: { textAlign: 'center', fontSize: 22, fontWeight: '700', letterSpacing: 8 },

  btn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 15, elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.bg, fontSize: 15, fontWeight: '700' },

  backBtn: { marginTop: 16, alignItems: 'center' },
  backBtnText: { color: Colors.muted, fontSize: 13 },

  footer: { textAlign: 'center', color: Colors.border, fontSize: 12, marginTop: 32 },
})
