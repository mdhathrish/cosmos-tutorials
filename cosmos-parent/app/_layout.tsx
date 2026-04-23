// app/_layout.tsx
import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { supabase } from '../lib/supabase'
import { useColors } from '../constants/theme'
import { View, ActivityIndicator } from 'react-native'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { ParentProvider } from '../lib/ParentContext'
import { 
  useFonts, 
  Outfit_400Regular, 
  Outfit_500Medium, 
  Outfit_600SemiBold, 
  Outfit_700Bold,
  Outfit_800ExtraBold 
} from '@expo-google-fonts/outfit'

export default function RootLayout() {
  const router   = useRouter()
  const segments = useSegments()
  const [sessionReady, setSessionReady] = useState(false)
  const [session, setSession] = useState<any>(null)
  
  const Colors = useColors()

  usePushNotifications(session?.user?.id)

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSessionReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessionReady) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, segments, sessionReady])

  if (!sessionReady || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    )
  }

  return (
    <ParentProvider>
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <StatusBar style={Colors.bg === '#030409' ? 'light' : 'dark'} backgroundColor={Colors.bg} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
    </ParentProvider>
  )
}

export { ErrorBoundary } from 'expo-router'
