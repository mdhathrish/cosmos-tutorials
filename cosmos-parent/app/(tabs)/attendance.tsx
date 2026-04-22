// app/(tabs)/attendance.tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { supabase, type AttendanceLog } from '../../lib/supabase'
import { useColors } from '../../constants/theme'
import { useParentContext } from '../../lib/ParentContext'
import { MapPin, CheckCircle, XCircle, Clock, Calendar, ClipboardList } from 'lucide-react-native'
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function AttendanceScreen() {
  const Colors = useColors()
  const insets = useSafeAreaInsets()
  const styles = getStyles(Colors)
  const { selectedStudent, loading: ctxLoading } = useParentContext()
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({ present: 0, absent: 0, total: 0 })

  const load = async () => {
    if (!selectedStudent) { setLoading(false); return }
    // Get last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: attendanceLogs } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('student_id', selectedStudent.id)
      .gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('log_date', { ascending: false })

    const logsData = attendanceLogs || []
    setLogs(logsData)
    setStats({
      present: logsData.filter(l => l.status === 'present').length,
      absent: logsData.filter(l => l.status === 'absent').length,
      total: logsData.length,
    })
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { if (!ctxLoading && selectedStudent) load() }, [ctxLoading, selectedStudent?.id])

  const formatTime = (ts: string | null) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingTop: 20 }]}

      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <MapPin color={Colors.primary} size={24} strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>Attendance History</Text>
        <Text style={styles.subtitle}>Last 30 days summary</Text>
      </View>

      {/* Summary */}
      <Animated.View entering={FadeInDown.duration(600).springify()}>
        <LinearGradient colors={Colors.gradientCard} style={styles.summaryCard} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
          <View style={styles.summaryMain}>
            <Text style={[styles.summaryPct, { color: pct >= 75 ? Colors.green : pct >= 60 ? Colors.orange : Colors.red }]}>
              {pct}%
            </Text>
            <Text style={styles.summaryLabel}>Attendance Rate</Text>
            <View style={styles.summaryBar}>
              <View style={[styles.summaryBarFill, {
                width: `${pct}%` as any,
                backgroundColor: pct >= 75 ? Colors.green : pct >= 60 ? Colors.orange : Colors.red,
              }]} />
            </View>
          </View>
          <View style={styles.summaryCounts}>
            <View style={styles.summaryCountItem}>
              <Text style={[styles.summaryCount, { color: Colors.green }]}>{stats.present}</Text>
              <Text style={styles.summaryCountLabel}>Present</Text>
            </View>
            <View style={[styles.summaryCountItem, styles.summaryCountDivider]}>
              <Text style={[styles.summaryCount, { color: Colors.red }]}>{stats.absent}</Text>
              <Text style={styles.summaryCountLabel}>Absent</Text>
            </View>
            <View style={styles.summaryCountItem}>
              <Text style={[styles.summaryCount, { color: Colors.text }]}>{stats.total}</Text>
              <Text style={styles.summaryCountLabel}>Total</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Log list */}
      <Animated.View entering={FadeIn.duration(800).delay(100)}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Session Log</Text>
        </View>
      </Animated.View>

      {logs.length === 0 ? (
        <Animated.View entering={FadeInUp.duration(500).delay(200)}>
          <View style={styles.emptyState}>
            <ClipboardList color={Colors.muted} size={48} strokeWidth={1.5} opacity={0.6} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No attendance records</Text>
            <Text style={styles.emptySubtitle}>Data will appear here once sessions are marked.</Text>
          </View>
        </Animated.View>
      ) : (
        logs.map((log, index) => {
          const isPresent = log.status === 'present'
          const isAbsent = log.status === 'absent'
          const accentColor = isPresent ? Colors.green : isAbsent ? Colors.red : Colors.orange
          const IconComponent = isPresent ? CheckCircle : isAbsent ? XCircle : Clock

          return (
            <Animated.View entering={FadeInUp.duration(600).delay(150 + index * 50).springify()} key={log.id}>
              <View style={[styles.logCard, { backgroundColor: accentColor + '08', borderColor: accentColor + '20' }]}>
                <View style={styles.logLeft}>
                  <IconComponent color={accentColor} size={22} strokeWidth={2.5} />
                  <View>
                    <Text style={styles.logDate}>
                      {new Date(log.log_date + 'T00:00:00').toLocaleDateString('en-IN', {
                        weekday: 'short', day: 'numeric', month: 'short'
                      })}
                    </Text>
                    <Text style={[styles.logStatus, { color: accentColor }]}>
                      {log.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {isPresent && (
                  <View style={styles.logTimes}>
                    <View style={styles.logTimeItem}>
                      <Text style={styles.logTimeLabel}>IN</Text>
                      <Text style={styles.logTimeValue}>{formatTime(log.check_in_time)}</Text>
                    </View>
                    <Text style={styles.logTimeSep}>→</Text>
                    <View style={styles.logTimeItem}>
                      <Text style={styles.logTimeLabel}>OUT</Text>
                      <Text style={[styles.logTimeValue, { color: log.check_out_time ? Colors.cyan : Colors.muted }]}>
                        {formatTime(log.check_out_time)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </Animated.View>
          )
        })
      )}
      </ScrollView>
    </View>
  )
}

const getStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 24, paddingBottom: 100 },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },

  header: { marginBottom: 32, alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontFamily: 'Outfit_800ExtraBold', color: Colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 14, fontFamily: 'Outfit_500Medium', color: Colors.muted, marginTop: 6 },

  summaryCard: {
    borderRadius: 24, borderWidth: 1, borderColor: Colors.border, padding: 24, marginBottom: 32,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }
  },
  summaryMain: { marginBottom: 24 },
  summaryPct: { fontSize: 44, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -1 },
  summaryLabel: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: Colors.muted, marginBottom: 12 },
  summaryBar: { height: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden' },
  summaryBarFill: { height: '100%', borderRadius: 4 },
  summaryCounts: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 20 },
  summaryCountItem: { flex: 1, alignItems: 'center' },
  summaryCountDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  summaryCount: { fontSize: 24, fontFamily: 'Outfit_800ExtraBold' },
  summaryCountLabel: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: Colors.muted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.5 },

  logCard: {
    borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  logLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logDate: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: Colors.text },
  logStatus: { fontSize: 11, fontFamily: 'Outfit_800ExtraBold', marginTop: 4, letterSpacing: 1 },
  logTimes: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logTimeItem: { alignItems: 'flex-end' },
  logTimeLabel: { fontSize: 10, color: Colors.muted, fontFamily: 'Outfit_700Bold', letterSpacing: 1 },
  logTimeValue: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: Colors.green, marginTop: 2 },
  logTimeSep: { color: Colors.muted, fontSize: 14, fontFamily: 'Outfit_400Regular' },

  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: Colors.muted, textAlign: 'center', lineHeight: 22 },
})
