// app/(tabs)/index.tsx
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { supabase, type Student, type AttendanceLog } from '../../lib/supabase'
import { useColors } from '../../constants/theme'
import { LinearGradient } from 'expo-linear-gradient'
import { LogOut, Clock, XCircle, CheckCircle, Flame, AlertTriangle, CreditCard, Megaphone } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function HomeScreen() {
  const Colors = useColors()
  const insets = useSafeAreaInsets()
  const styles = getStyles(Colors)
  const router = useRouter()

  const [student, setStudent] = useState<Student | null>(null)
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null)
  const [recentLogs, setRecentLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userName, setUserName] = useState('')
  const [pendingFee, setPendingFee] = useState(false)
  const [notices, setNotices] = useState<{ id: string, title: string, content: string, created_at: string }[]>([])
  const [events, setEvents] = useState<{ id: string; title: string; event_type: string; event_date: string; description: string | null }[]>([])

  const today = new Date().toISOString().split('T')[0]

  const load = async () => {
    try {
      // 1. Load cached data for instant UI
      const cachedName = await AsyncStorage.getItem('user_name')
      const cachedStudent = await AsyncStorage.getItem('student_profile')
      if (cachedName) setUserName(cachedName)
      if (cachedStudent) {
        setStudent(JSON.parse(cachedStudent))
        setLoading(false) // Show partial UI if we have a student
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: parentUser } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('auth_id', user.id)
        .single()

      if (!parentUser) return
      setUserName(parentUser.full_name)
      AsyncStorage.setItem('user_name', parentUser.full_name)

      const { data: studentData } = await supabase
        .from('students')
        .select('*, batches(batch_name, subject, timing_start, timing_end)')
        .eq('parent_id', parentUser.id)
        .eq('is_active', true)
        .single()

      if (studentData) {
        setStudent(studentData)
        AsyncStorage.setItem('student_profile', JSON.stringify(studentData))
        setLoading(false)

        // Parallelize all remaining data fetches
        const [
          { data: todayAttendance },
          { data: recentAttendance },
          { data: pendingFees },
          { data: noticeData },
          { data: eventData }
        ] = await Promise.all([
          supabase.from('attendance_logs').select('*').eq('student_id', studentData.id).eq('log_date', today).single(),
          supabase.from('attendance_logs').select('*').eq('student_id', studentData.id).gte('log_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('log_date', { ascending: false }),
          supabase.from('fee_records').select('id').eq('student_id', studentData.id).eq('status', 'pending'),
          supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(3),
          supabase.from('calendar_events').select('*').or(`batch_id.is.null,batch_id.eq.${studentData.batch_id}`).gte('event_date', today).order('event_date', { ascending: true }).limit(3)
        ])

        if (todayAttendance) setTodayLog(todayAttendance)
        setRecentLogs(recentAttendance || [])
        setPendingFee(pendingFees && pendingFees.length > 0)
        if (noticeData) setNotices(noticeData)
        if (eventData) setEvents(eventData)
      }
    } catch (error) {
      console.error('Error loading home data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!student) return
    const channel = supabase
      .channel('attendance-realtime')
      .on('postgres_changes', {
        event: '*',schema: 'public', table: 'attendance_logs', filter: `student_id=eq.${student.id}`,
      }, (payload) => {
        if (payload.new && (payload.new as AttendanceLog).log_date === today) {
          setTodayLog(payload.new as AttendanceLog)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [student])

  const formatTime = (ts: string | null) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  const greetingHour = new Date().getHours()
  const greeting = 
    greetingHour >= 5 && greetingHour < 12 ? 'Good morning' : 
    greetingHour >= 12 && greetingHour < 17 ? 'Good afternoon' : 
    greetingHour >= 17 && greetingHour < 21 ? 'Good evening' : 'Good night'


  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Fixed Header outside ScrollView prevents Notch bleed overlapping */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
          <View>
            <Text style={styles.brandName}>Cosmos</Text>
            <Text style={styles.brandSub}>Parent Portal</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.signOutBtn} activeOpacity={0.7}>
          <LogOut color={Colors.muted} size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollWrapper}
        contentContainerStyle={[
          styles.scroll, 
          { 
            paddingBottom: Math.max(insets.bottom + 110, 110) 
          }
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={Colors.primary} />}
      >
        <Text style={styles.greeting}>{greeting}, {userName.split(' ')[0]}</Text>

        {student && (
          <Animated.View entering={FadeInDown.duration(600).springify()}>
            <LinearGradient colors={Colors.gradientCard} style={styles.studentCard} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
              <LinearGradient colors={Colors.gradientPrimary} style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>{student.full_name[0].toUpperCase()}</Text>
              </LinearGradient>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.full_name}</Text>
                <Text style={styles.studentMeta}>Grade {student.grade} · {student.batches?.subject}</Text>
                <Text style={styles.studentBatch}>{student.batches?.batch_name}</Text>
              </View>
              <View style={styles.timingBadge}>
                <Text style={styles.timingText}>
                  {student.batches?.timing_start?.slice(0, 5)} – {student.batches?.timing_end?.slice(0, 5)}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {pendingFee && (
          <Animated.View entering={FadeInDown.duration(650).springify().delay(50)}>
            <TouchableOpacity 
              style={[styles.feeCard, { backgroundColor: Colors.surface, borderColor: Colors.orange + '40' }]}
              onPress={() => router.push('/fees' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.feeIconFrame, { backgroundColor: Colors.orange + '15' }]}>
                <AlertTriangle size={20} color={Colors.orange} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.feeTitle, { color: Colors.text }]}>Fee Payment Pending</Text>
                <Text style={{ color: Colors.muted, fontSize: 12 }}>Please complete your fee to keep logs current.</Text>
              </View>
              <View style={[styles.feeAction, { backgroundColor: Colors.orange }]}>
                 <CreditCard size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Quick Actions Grid */}
        <Animated.View entering={FadeInDown.duration(650).springify().delay(60)}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.gridContainer}>
            <TouchableOpacity style={[styles.gridItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]} onPress={() => router.push('/fees' as any)}>
              <View style={[styles.gridIconFrame, { backgroundColor: Colors.primary + '10' }]}>
                <CreditCard size={22} color={Colors.primary} />
              </View>
              <Text style={[styles.gridText, { color: Colors.text }]}>Fees</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.gridItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]} onPress={() => router.push('/notices' as any)}>
              <View style={[styles.gridIconFrame, { backgroundColor: Colors.orange + '10' }]}>
                <Megaphone size={22} color={Colors.orange} />
              </View>
              <Text style={[styles.gridText, { color: Colors.text }]}>Notices</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.gridItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]} onPress={() => router.push('/calendar' as any)}>
              <View style={[styles.gridIconFrame, { backgroundColor: Colors.green + '10' }]}>
                <Clock size={22} color={Colors.green} />
              </View>
              <Text style={[styles.gridText, { color: Colors.text }]}>Calendar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {notices.length > 0 && (
          <Animated.View entering={FadeInDown.duration(650).springify().delay(80)}>
            <View style={[styles.sectionHeaderRow, { marginBottom: 12 }]}>
              <Text style={styles.sectionTitle}>Announcements</Text>
              <Megaphone color={Colors.primary} size={14} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.noticesList} style={{ marginBottom: 32 }}>
              {notices.map((notice) => (
                <View key={notice.id} style={[styles.noticeCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                  <Text style={[styles.noticeTitle, { color: Colors.text }]} numberOfLines={1}>{notice.title}</Text>
                  <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 4 }} numberOfLines={2}>{notice.content}</Text>
                  <Text style={{ color: Colors.primaryLight, fontSize: 10, marginTop: 8 }}>
                    {new Date(notice.created_at).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {events.length > 0 && (
          <Animated.View entering={FadeInDown.duration(650).springify().delay(90)}>
            <View style={[styles.sectionHeaderRow, { marginBottom: 12 }]}>
              <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
            </View>
            <View style={{ gap: 10, marginBottom: 32 }}>
              {events.map((event) => (
                <View key={event.id} style={[styles.eventCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                  <View style={[styles.eventDateBox, { backgroundColor: Colors.primary + '10' }]}>
                    <Text style={[styles.eventDateMonth, { color: Colors.primary }]}>{new Date(event.event_date).toLocaleDateString('en-IN', { month: 'short' })}</Text>
                    <Text style={[styles.eventDateDay, { color: Colors.text }]}>{new Date(event.event_date).toLocaleDateString('en-IN', { day: '2-digit' })}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2, justifyContent: 'center' }}>
                    <Text style={[styles.eventTitle, { color: Colors.text }]} numberOfLines={1}>{event.title}</Text>
                    {event.description && <Text style={{ color: Colors.muted, fontSize: 11 }} numberOfLines={1}>{event.description}</Text>}
                  </View>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: event.event_type === 'exam' ? '#fef2f2' : event.event_type === 'holiday' ? '#fffbeb' : '#f0f9ff' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Outfit_700Bold', color: event.event_type === 'exam' ? '#ef4444' : event.event_type === 'holiday' ? '#f59e0b' : '#3b82f6' }}>{event.event_type.toUpperCase()}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(700).springify().delay(100)}>
          <Text style={styles.sectionTitle}>Today&apos;s Status</Text>
          <View style={[styles.attendanceCard,
            todayLog?.status === 'present' ? styles.attendancePresent :
            todayLog?.status === 'absent' ? styles.attendanceAbsent :
            styles.attendanceUnknown
          ]}>
            {!todayLog ? (
              <View style={styles.attendanceRow}>
                <Clock color={Colors.orange} size={32} strokeWidth={2} />
                <View>
                  <Text style={styles.attendanceStatus}>Not Marked Yet</Text>
                  <Text style={styles.attendanceSubtext}>Session may not have started</Text>
                </View>
              </View>
            ) : todayLog.status === 'absent' ? (
              <View style={styles.attendanceRow}>
                <XCircle color={Colors.red} size={32} strokeWidth={2} />
                <View>
                  <Text style={[styles.attendanceStatus, { color: Colors.red }]}>Absent Today</Text>
                  <Text style={styles.attendanceSubtext}>
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.attendanceRow}>
                  <CheckCircle color={Colors.green} size={32} strokeWidth={2} />
                  <View>
                    <Text style={[styles.attendanceStatus, { color: Colors.green }]}>Present Today</Text>
                    <Text style={styles.attendanceSubtext}>
                      {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
                <View style={styles.timingRow}>
                  <View style={styles.timingChip}>
                    <Text style={styles.timingChipLabel}>CHECK IN</Text>
                    <Text style={styles.timingChipTime}>{formatTime(todayLog.check_in_time)}</Text>
                  </View>
                  {todayLog.check_out_time ? (
                    <View style={[styles.timingChip, styles.timingChipOut]}>
                      <Text style={[styles.timingChipLabel, { color: Colors.cyan }]}>CHECK OUT</Text>
                      <Text style={[styles.timingChipTime, { color: Colors.cyan }]}>{formatTime(todayLog.check_out_time)}</Text>
                    </View>
                  ) : (
                    <View style={[styles.timingChip, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                      <Text style={[styles.timingChipLabel, { color: Colors.muted }]}>CHECK OUT</Text>
                      <Text style={[styles.timingChipTime, { color: Colors.muted }]}>In session…</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(800).springify().delay(200)}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Attendance Streak</Text>
            <Flame color={Colors.primary} size={16} />
          </View>
          
          <View style={styles.streakRow}>
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date()
              d.setDate(d.getDate() - (6 - i))
              const ds = d.toISOString().split('T')[0]
              const log = recentLogs.find(l => l.log_date === ds)
              const isToday = ds === today
              
              let dotColor = Colors.muted
              if (log?.status === 'present') dotColor = Colors.green
              if (log?.status === 'absent') dotColor = Colors.red

              return (
                <View key={ds} style={[styles.streakDay, isToday && styles.streakDayToday]}>
                  <Text style={styles.streakDayName}>{d.toLocaleDateString('en-IN', { weekday: 'narrow' })}</Text>
                  <Text style={styles.streakDayNum}>{d.getDate()}</Text>
                  <View style={[styles.streakDotRecord, { backgroundColor: dotColor }]} />
                </View>
              )
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

const getStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollWrapper: { flex: 1 },
  scroll: { padding: 24, paddingTop: 10 },
  centered: { justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bg },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoImage: { width: 48, height: 48, borderRadius: 12 },
  brandName: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: Colors.text, letterSpacing: -0.5 },
  brandSub: { fontSize: 12, fontFamily: 'Outfit_500Medium', color: Colors.primaryLight },
  signOutBtn: { padding: 10, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },

  greeting: { fontSize: 28, fontFamily: 'Outfit_700Bold', color: Colors.text, marginVertical: 24, letterSpacing: -0.5 },

  studentCard: {
    borderRadius: 24, borderWidth: 1,
    borderColor: Colors.border, padding: 20, flexDirection: 'row',
    alignItems: 'center', marginBottom: 32, gap: 16,
    shadowColor: Colors.primary, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }
  },
  studentAvatar: {
    width: 54, height: 54, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
  },
  studentAvatarText: { fontSize: 22, fontFamily: 'Outfit_800ExtraBold', color: '#fff' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', color: Colors.text },
  studentMeta: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: Colors.muted, marginTop: 4 },
  studentBatch: { fontSize: 12, fontFamily: 'Outfit_500Medium', color: Colors.primaryLight, marginTop: 4 },
  timingBadge: { backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  timingText: { fontSize: 12, color: Colors.primaryLight, fontFamily: 'Outfit_600SemiBold' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.5 },

  attendanceCard: { borderRadius: 24, padding: 20, borderWidth: 1, marginBottom: 32 },
  attendancePresent: { backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  attendanceAbsent: { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' },
  attendanceUnknown: { backgroundColor: 'rgba(249, 115, 22, 0.05)', borderColor: 'rgba(249, 115, 22, 0.2)' },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  attendanceStatus: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: Colors.text },
  attendanceSubtext: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: Colors.muted, marginTop: 4 },
  timingRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  timingChip: { flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  timingChipOut: { backgroundColor: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.2)' },
  timingChipLabel: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: Colors.green, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  timingChipTime: { fontSize: 20, fontFamily: 'Outfit_800ExtraBold', color: Colors.green },

  streakRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  streakDay: { alignItems: 'center', flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  streakDayToday: { borderColor: Colors.primary, backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  streakDayName: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: Colors.muted },
  streakDayNum: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: Colors.text, marginVertical: 8 },
  streakDotRecord: { width: 8, height: 8, borderRadius: 4 },
  feeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 32 },
  feeIconFrame: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  feeTitle: { fontSize: 15, fontFamily: 'Outfit_700Bold' },
  feeAction: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  noticesList: { gap: 12, paddingRight: 16 },
  noticeCard: { width: 240, padding: 16, borderRadius: 16, borderWidth: 1 },
  noticeTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold' },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1 },
  eventDateBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventDateMonth: { fontSize: 10, fontFamily: 'Outfit_700Bold', textTransform: 'uppercase' },
  eventDateDay: { fontSize: 16, fontFamily: 'Outfit_800ExtraBold' },
  eventTitle: { fontSize: 13, fontFamily: 'Outfit_700Bold' },

  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 32, marginTop: 12 },
  gridItem: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 20, borderWidth: 1, gap: 8 },
  gridIconFrame: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  gridText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },
})
