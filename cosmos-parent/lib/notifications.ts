// lib/notifications.ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices.')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('attendance', {
      name: 'Attendance Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C5CFC',
    })
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data

  // Save token to supabase (add push_token column to users table if needed)
  await supabase.from('users').update({ push_token: token } as any).eq('id', userId)

  return token
}

// Format attendance notification
export function buildAttendanceNotification(
  studentName: string,
  type: 'check_in' | 'check_out',
  time: string
): Notifications.NotificationContentInput {
  const timeStr = new Date(time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return {
    title: type === 'check_in'
      ? `✅ ${studentName} has arrived`
      : `🏠 ${studentName} has left`,
    body: type === 'check_in'
      ? `Checked in at Cosmos Tutorials at ${timeStr}`
      : `Checked out from Cosmos Tutorials at ${timeStr}`,
    data: { type, studentName, time },
    sound: 'default',
  }
}
