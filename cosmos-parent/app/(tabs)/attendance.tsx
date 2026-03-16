// app/(tabs)/attendance.tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { supabase, type AttendanceLog } from '../../lib/supabase'
import { Colors } from '../../constants/theme'

export default function AttendanceScreen() {
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({ present: 0, absent: 0, total: 0 })

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: parentUser } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!parentUser) return

    const { data: student } = await supabase.from('students').select('id').eq('parent_id', parentUser.id).eq('is_active', true).single()
    if (!student) return

    // Get last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: attendanceLogs } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('student_id', student.id)
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

  useEffect(() => { load() }, [])

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={Colors.primary} />}
    >
      <Text style={styles.title}>📍 Attendance History</Text>
      <Text style={styles.subtitle}>Last 30 days</Text>

      {/* Summary */}
      <View style={styles.summaryCard}>
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
            <Text style={[styles.summaryCount, { color: Colors.cyan }]}>{stats.total}</Text>
            <Text style={styles.summaryCountLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Log list */}
      <Text style={styles.sectionTitle}>Session Log</Text>
      {logs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>No attendance records yet</Text>
        </View>
      ) : (
        logs.map(log => (
          <View key={log.id} style={[styles.logCard,
            log.status === 'present' ? styles.logPresent :
            log.status === 'absent' ? styles.logAbsent : styles.logLate
          ]}>
            <View style={styles.logLeft}>
              <Text style={styles.logEmoji}>
                {log.status === 'present' ? '✅' : log.status === 'absent' ? '❌' : '🕐'}
              </Text>
              <View>
                <Text style={styles.logDate}>
                  {new Date(log.log_date + 'T00:00:00').toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short'
                  })}
                </Text>
                <Text style={[styles.logStatus, {
                  color: log.status === 'present' ? Colors.green :
                         log.status === 'absent' ? Colors.red : Colors.orange
                }]}>
                  {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                </Text>
              </View>
            </View>
            {log.status === 'present' && (
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
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },

  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.muted, marginBottom: 20 },

  summaryCard: {
    backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1,
    borderColor: Colors.border, padding: 20, marginBottom: 24,
  },
  summaryMain: { marginBottom: 20 },
  summaryPct: { fontSize: 44, fontWeight: '900', fontFamily: 'Courier' },
  summaryLabel: { fontSize: 13, color: Colors.muted, marginBottom: 10 },
  summaryBar: { height: 8, backgroundColor: Colors.surface, borderRadius: 4, overflow: 'hidden' },
  summaryBarFill: { height: '100%', borderRadius: 4 },
  summaryCounts: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 },
  summaryCountItem: { flex: 1, alignItems: 'center' },
  summaryCountDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  summaryCount: { fontSize: 22, fontWeight: '800' },
  summaryCountLabel: { fontSize: 11, color: Colors.muted, marginTop: 2 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  logCard: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  logPresent: { backgroundColor: Colors.green + '10', borderColor: Colors.green + '30' },
  logAbsent: { backgroundColor: Colors.red + '10', borderColor: Colors.red + '30' },
  logLate: { backgroundColor: Colors.orange + '10', borderColor: Colors.orange + '30' },
  logLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logEmoji: { fontSize: 22 },
  logDate: { fontSize: 14, fontWeight: '600', color: Colors.text },
  logStatus: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  logTimes: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logTimeItem: { alignItems: 'center' },
  logTimeLabel: { fontSize: 9, color: Colors.muted, fontWeight: '700', textTransform: 'uppercase' },
  logTimeValue: { fontSize: 13, fontFamily: 'Courier', fontWeight: '700', color: Colors.green },
  logTimeSep: { color: Colors.muted, fontSize: 12 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 14, color: Colors.muted },
})
