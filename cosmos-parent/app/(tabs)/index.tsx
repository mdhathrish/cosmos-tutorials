// app/(tabs)/index.tsx
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native'
import { supabase, type Student, type AttendanceLog } from '../../lib/supabase'
import { Colors } from '../../constants/theme'
// Push notifications disabled in Expo Go SDK 54
// import { registerForPushNotifications } from '../../lib/notifications'

export default function HomeScreen() {
  const [student, setStudent] = useState<Student | null>(null)
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null)
  const [recentLogs, setRecentLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userName, setUserName] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get parent user record
      const { data: parentUser } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('auth_id', user.id)
        .single()

      if (!parentUser) return
      setUserName(parentUser.full_name)

      // Get student
      const { data: studentData } = await supabase
        .from('students')
        .select('*, batches(batch_name, subject, timing_start, timing_end)')
        .eq('parent_id', parentUser.id)
        .eq('is_active', true)
        .single()

      if (studentData) {
        setStudent(studentData)

        // Today's attendance
        const { data: todayAttendance } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('student_id', studentData.id)
          .eq('log_date', today)
          .single()

        setTodayLog(todayAttendance)

        // Recent 7 days
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const { data: recent } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('student_id', studentData.id)
          .gte('log_date', weekAgo.toISOString().split('T')[0])
          .order('log_date', { ascending: false })

        setRecentLogs(recent || [])
      }
    } catch (error) {
      console.error('Error loading home data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  // Subscribe to real-time attendance changes
  useEffect(() => {
    if (!student) return

    const channel = supabase
      .channel('attendance-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_logs',
        filter: `student_id=eq.${student.id}`,
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
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Text style={styles.brandEmoji}>🔭</Text>
          <View>
            <Text style={styles.brandName}>Cosmos Tutorials</Text>
            <Text style={styles.brandSub}>Parent Dashboard</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <Text style={styles.greeting}>{greeting} 👋</Text>

      {/* Student card */}
      {student && (
        <View style={styles.studentCard}>
          <View style={styles.studentAvatar}>
            <Text style={styles.studentAvatarText}>{student.full_name[0].toUpperCase()}</Text>
          </View>
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
        </View>
      )}

      {/* Today's attendance spotlight */}
      <Text style={styles.sectionTitle}>Today&apos;s Attendance</Text>
      <View style={[styles.attendanceCard,
        todayLog?.status === 'present' ? styles.attendancePresent :
        todayLog?.status === 'absent' ? styles.attendanceAbsent :
        styles.attendanceUnknown
      ]}>
        {!todayLog ? (
          <View style={styles.attendanceRow}>
            <Text style={styles.attendanceEmoji}>⏳</Text>
            <View>
              <Text style={styles.attendanceStatus}>Not Marked Yet</Text>
              <Text style={styles.attendanceSubtext}>Session may not have started</Text>
            </View>
          </View>
        ) : todayLog.status === 'absent' ? (
          <View style={styles.attendanceRow}>
            <Text style={styles.attendanceEmoji}>❌</Text>
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
              <Text style={styles.attendanceEmoji}>✅</Text>
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
                  <Text style={[styles.timingChipLabel, { color: Colors.muted }]}>CHECK OUT</Text>
                  <Text style={[styles.timingChipTime, { color: Colors.cyan }]}>{formatTime(todayLog.check_out_time)}</Text>
                </View>
              ) : (
                <View style={[styles.timingChip, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                  <Text style={styles.timingChipLabel}>CHECK OUT</Text>
                  <Text style={[styles.timingChipTime, { color: Colors.muted }]}>In session…</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* 7-day streak */}
      <Text style={styles.sectionTitle}>Last 7 Days</Text>
      <View style={styles.streakRow}>
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - i))
          const ds = d.toISOString().split('T')[0]
          const log = recentLogs.find(l => l.log_date === ds)
          const isToday = ds === today
          return (
            <View key={ds} style={[styles.streakDay, isToday && styles.streakDayToday]}>
              <Text style={styles.streakDayName}>{d.toLocaleDateString('en-IN', { weekday: 'narrow' })}</Text>
              <Text style={styles.streakDayNum}>{d.getDate()}</Text>
              <Text style={styles.streakDot}>
                {!log ? '○' : log.status === 'present' ? '●' : log.status === 'absent' ? '✕' : '◑'}
              </Text>
            </View>
          )
        })}
      </View>
      <View style={styles.streakLegend}>
        <Text style={styles.legendItem}><Text style={{ color: Colors.green }}>●</Text> Present</Text>
        <Text style={styles.legendItem}><Text style={{ color: Colors.red }}>✕</Text> Absent</Text>
        <Text style={styles.legendItem}><Text style={{ color: Colors.muted }}>○</Text> No Class</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandEmoji: { fontSize: 26 },
  brandName: { fontSize: 15, fontWeight: '800', color: Colors.text },
  brandSub: { fontSize: 11, color: Colors.muted },
  signOutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  signOutText: { fontSize: 12, color: Colors.muted },

  greeting: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 16 },

  studentCard: {
    backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1,
    borderColor: Colors.border, padding: 16, flexDirection: 'row',
    alignItems: 'center', marginBottom: 28, gap: 14,
  },
  studentAvatar: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  studentAvatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  studentMeta: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  studentBatch: { fontSize: 11, color: Colors.primary, marginTop: 2 },
  timingBadge: { backgroundColor: Colors.primary + '22', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: Colors.primary + '44' },
  timingText: { fontSize: 11, color: Colors.primary, fontFamily: 'Courier', fontWeight: '700' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  attendanceCard: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 28 },
  attendancePresent: { backgroundColor: Colors.green + '15', borderColor: Colors.green + '40' },
  attendanceAbsent: { backgroundColor: Colors.red + '15', borderColor: Colors.red + '40' },
  attendanceUnknown: { backgroundColor: Colors.orange + '10', borderColor: Colors.orange + '30' },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  attendanceEmoji: { fontSize: 32 },
  attendanceStatus: { fontSize: 17, fontWeight: '700', color: Colors.text },
  attendanceSubtext: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  timingRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  timingChip: { flex: 1, backgroundColor: Colors.green + '20', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.green + '40' },
  timingChipOut: { backgroundColor: Colors.cyan + '15', borderColor: Colors.cyan + '30' },
  timingChipLabel: { fontSize: 10, fontWeight: '700', color: Colors.green, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  timingChipTime: { fontSize: 18, fontWeight: '800', color: Colors.green, fontFamily: 'Courier' },

  streakRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  streakDay: { alignItems: 'center', flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, marginHorizontal: 2 },
  streakDayToday: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  streakDayName: { fontSize: 10, color: Colors.muted, fontWeight: '600' },
  streakDayNum: { fontSize: 13, fontWeight: '700', color: Colors.text, marginVertical: 3 },
  streakDot: { fontSize: 12, color: Colors.green },
  streakLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 6 },
  legendItem: { fontSize: 11, color: Colors.muted },
})
