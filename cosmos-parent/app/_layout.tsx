// app/_layout.tsx
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useRouter, useSegments } from 'expo-router'
import { supabase } from '../lib/supabase'
import { Colors } from '../constants/theme'
import { View } from 'react-native'

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const inAuthGroup = segments[0] === '(auth)'
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login')
      } else if (session && inAuthGroup) {
        router.replace('/(tabs)/')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.replace('/(auth)/login')
      } else {
        router.replace('/(tabs)/')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar style="light" backgroundColor={Colors.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  )
}
