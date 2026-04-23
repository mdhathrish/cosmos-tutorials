// app/weekly-reports.tsx
// Parent App — AI-powered weekly reports screen
import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useColors } from '../constants/theme'
import { useParentContext } from '../lib/ParentContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Calendar, BookOpen, CheckCircle, AlertCircle } from 'lucide-react-native'

interface WeeklyReport {
  id: string
  week_start: string
  week_end: string
  ai_summary: string
  overall_score: number | null
  previous_score: number | null
  attendance_summary: { present: number; absent: number; late: number; total: number }
  generated_at: string
}

export default function WeeklyReportsScreen() {
  const Colors = useColors()
  const insets = useSafeAreaInsets()
  const styles = getStyles(Colors)
  const router = useRouter()
  const { selectedStudent: student } = useParentContext()

  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!student) return
    try {
      const { data } = await supabase
        .from('weekly_reports')
        .select('id, week_start, week_end, ai_summary, overall_score, previous_score, attendance_summary, generated_at')
        .eq('student_id', student.id)
        .order('week_start', { ascending: false })
        .limit(12)
      setReports(data || [])
      if (data && data.length > 0) setExpandedId(data[0].id) // Auto-expand latest
    } catch (e) { /* silent */ }
    setLoading(false)
  }, [student])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const formatWeekRange = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString('en-IN', opts)}`
  }

  const getTrendIcon = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return { icon: Minus, color: Colors.textMuted, label: 'First week' }
    if (current > previous) return { icon: TrendingUp, color: Colors.success, label: `+${current - previous}%` }
    if (current < previous) return { icon: TrendingDown, color: Colors.error, label: `${current - previous}%` }
    return { icon: Minus, color: Colors.textMuted, label: 'No change' }
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Weekly Reports</Text>
        </View>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 80 }} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Weekly Reports</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {student && (
          <Text style={styles.studentName}>{student.full_name}</Text>
        )}

        {reports.length === 0 ? (
          <View style={styles.emptyCard}>
            <BookOpen size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No reports generated yet</Text>
            <Text style={styles.emptySubtext}>Reports are generated every Sunday automatically</Text>
          </View>
        ) : (
          reports.map((report, idx) => {
            const isExpanded = expandedId === report.id
            const trend = getTrendIcon(report.overall_score, report.previous_score)
            const TrendIcon = trend.icon
            const att = report.attendance_summary || { present: 0, absent: 0, late: 0, total: 0 }
            const attPct = att.total > 0 ? Math.round(att.present / att.total * 100) : 0

            return (
              <Animated.View key={report.id} entering={FadeInDown.delay(idx * 80).duration(400)}>
                <TouchableOpacity
                  style={[styles.reportCard, isExpanded && styles.reportCardExpanded]}
                  onPress={() => setExpandedId(isExpanded ? null : report.id)}
                  activeOpacity={0.8}
                >
                  {/* Header */}
                  <View style={styles.reportHeader}>
                    <View style={styles.reportWeek}>
                      <Calendar size={14} color={Colors.primary} />
                      <Text style={styles.reportWeekText}>{formatWeekRange(report.week_start, report.week_end)}</Text>
                    </View>
                    <View style={[styles.trendBadge, { backgroundColor: trend.color + '20' }]}>
                      <TrendIcon size={12} color={trend.color} />
                      <Text style={[styles.trendText, { color: trend.color }]}>{trend.label}</Text>
                    </View>
                  </View>

                  {/* Quick Stats */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{report.overall_score !== null ? `${report.overall_score}%` : '—'}</Text>
                      <Text style={styles.statLabel}>Score</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: Colors.border }]} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{att.present}/{att.total}</Text>
                      <Text style={styles.statLabel}>Attendance</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: Colors.border }]} />
                    <View style={styles.statItem}>
                      <View style={[styles.attDot, { backgroundColor: attPct >= 80 ? Colors.success : attPct >= 60 ? Colors.warning : Colors.error }]} />
                      <Text style={styles.statLabel}>{attPct}%</Text>
                    </View>
                  </View>

                  {/* Expanded: AI Report */}
                  {isExpanded && (
                    <View style={styles.reportBody}>
                      <View style={styles.aiLabel}>
                        <Text style={styles.aiLabelText}>✨ AI-Generated Report</Text>
                      </View>
                      <Text style={styles.reportText}>{report.ai_summary}</Text>
                    </View>
                  )}

                  {!isExpanded && (
                    <Text style={styles.tapHint}>Tap to read full AI report →</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

const getStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  content: { padding: 16, paddingBottom: 60 },
  studentName: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 16 },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 16 },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, marginTop: 6, textAlign: 'center' },
  reportCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  reportCardExpanded: { borderColor: Colors.primary + '40' },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reportWeek: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reportWeekText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  trendText: { fontSize: 11, fontWeight: '800' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 8 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '900', color: Colors.text },
  statLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 30 },
  attDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 2 },
  reportBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  aiLabel: {
    backgroundColor: Colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10,
  },
  aiLabelText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  reportText: { fontSize: 14, lineHeight: 22, color: Colors.text },
  tapHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
})
