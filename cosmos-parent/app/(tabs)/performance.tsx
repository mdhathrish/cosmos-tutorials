// app/(tabs)/performance.tsx
// THE CORE SCREEN — micro-concept heatmap of student performance
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions
} from 'react-native'
import { supabase, type ConceptPerformance } from '../../lib/supabase'
import { Colors, getHeatColor } from '../../constants/theme'

const { width } = Dimensions.get('window')

interface GroupedPerformance {
  subject: string
  chapters: {
    chapter: string
    concepts: ConceptPerformance[]
  }[]
}

export default function PerformanceScreen() {
  const [grouped, setGrouped] = useState<GroupedPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [studentName, setStudentName] = useState('')
  const [overallScore, setOverallScore] = useState(0)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: parentUser } = await supabase
      .from('users').select('id').eq('auth_id', user.id).single()
    if (!parentUser) return

    const { data: student } = await supabase
      .from('students').select('id, full_name').eq('parent_id', parentUser.id).eq('is_active', true).single()
    if (!student) return

    setStudentName(student.full_name)

    // Query the aggregated view
    const { data: perf } = await supabase
      .from('student_concept_performance')
      .select('*')
      .eq('student_id', student.id)
      .order('subject')

    if (perf && perf.length > 0) {
      // Calculate overall
      const totalObtained = perf.reduce((s: number, p: ConceptPerformance) => s + p.total_obtained, 0)
      const totalPossible = perf.reduce((s: number, p: ConceptPerformance) => s + p.total_possible, 0)
      setOverallScore(totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0)

      // Group by subject → chapter
      const subjectMap: { [s: string]: { [c: string]: ConceptPerformance[] } } = {}
      for (const p of perf as ConceptPerformance[]) {
        if (!subjectMap[p.subject]) subjectMap[p.subject] = {}
        if (!subjectMap[p.subject][p.chapter]) subjectMap[p.subject][p.chapter] = []
        subjectMap[p.subject][p.chapter].push(p)
      }

      const result: GroupedPerformance[] = Object.entries(subjectMap).map(([subject, chapters]) => ({
        subject,
        chapters: Object.entries(chapters).map(([chapter, concepts]) => ({ chapter, concepts })),
      }))

      setGrouped(result)
      if (result.length > 0 && !selectedSubject) setSelectedSubject(result[0].subject)
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const subjects = grouped.map(g => g.subject)
  const activeGroup = grouped.find(g => g.subject === selectedSubject)

  const overallColor = getHeatColor(overallScore)

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading concept map…</Text>
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
        <Text style={styles.title}>🧠 Concept Heatmap</Text>
        <Text style={styles.subtitle}>{studentName}&apos;s micro-skill breakdown</Text>
      </View>

      {/* Overall score ring */}
      <View style={[styles.overallCard, { backgroundColor: overallColor.bg, borderColor: overallColor.text + '40' }]}>
        <View style={styles.overallLeft}>
          <Text style={[styles.overallScore, { color: overallColor.text }]}>{overallScore}%</Text>
          <Text style={[styles.overallLabel, { color: overallColor.text }]}>{overallColor.label}</Text>
        </View>
        <View style={styles.overallRight}>
          <Text style={styles.overallDesc}>Overall across all tests</Text>
          <View style={styles.overallBar}>
            <View style={[styles.overallBarFill, { width: `${overallScore}%` as any, backgroundColor: overallColor.text }]} />
          </View>
        </View>
      </View>

      {/* Subject tabs */}
      {subjects.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
          {subjects.map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setSelectedSubject(s)}
              style={[styles.tab, selectedSubject === s && styles.tabActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, selectedSubject === s && styles.tabTextActive]}>
                {s === 'Mathematics' ? '📐 Math' :
                 s === 'Physics' ? '⚡ Physics' :
                 s === 'Chemistry' ? '🧪 Chemistry' :
                 s === 'Biology' ? '🌿 Biology' : s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Heatmap grid by chapter */}
      {activeGroup ? (
        activeGroup.chapters.map(({ chapter, concepts }) => (
          <View key={chapter} style={styles.chapterBlock}>
            <Text style={styles.chapterTitle}>{chapter}</Text>
            <View style={styles.conceptGrid}>
              {concepts.map(c => {
                const heat = getHeatColor(c.percentage_score || 0)
                return (
                  <View key={c.micro_tag_id} style={[styles.conceptCell, { backgroundColor: heat.bg, borderColor: heat.text + '30' }]}>
                    <Text style={[styles.conceptPct, { color: heat.text }]}>{Math.round(c.percentage_score || 0)}%</Text>
                    <Text style={styles.conceptName} numberOfLines={2}>{c.concept_name}</Text>
                    <Text style={[styles.conceptBadge, { color: heat.text }]}>{heat.label}</Text>
                    <View style={styles.conceptMeta}>
                      <Text style={styles.conceptMetaText}>{c.questions_attempted}Q</Text>
                      <Text style={styles.conceptMetaText}>{c.total_obtained}/{c.total_possible}m</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>No test data yet</Text>
          <Text style={styles.emptySubtitle}>Performance data will appear here once tests are entered by the admin.</Text>
        </View>
      )}

      {/* Legend */}
      {grouped.length > 0 && (
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Score Legend</Text>
          <View style={styles.legendRow}>
            {[
              { range: '≥85%', label: 'Excellent', color: '#4ade80' },
              { range: '70–84%', label: 'Strong', color: '#22c55e' },
              { range: '55–69%', label: 'Good', color: '#f5c842' },
              { range: '40–54%', label: 'Needs Work', color: '#f59e0b' },
              { range: '25–39%', label: 'Weak', color: '#ef4444' },
              { range: '<25%', label: 'Critical', color: '#dc2626' },
            ].map(l => (
              <View key={l.range} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
                <Text style={styles.legendRange}>{l.range}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const CELL_WIDTH = (width - 56) / 2

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  loadingText: { color: Colors.muted, marginTop: 12 },

  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.muted, marginTop: 4 },

  overallCard: {
    borderRadius: 16, padding: 20, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', marginBottom: 20,
  },
  overallLeft: { alignItems: 'center', marginRight: 20, minWidth: 70 },
  overallScore: { fontSize: 38, fontWeight: '900', fontFamily: 'Courier' },
  overallLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  overallRight: { flex: 1 },
  overallDesc: { fontSize: 12, color: Colors.muted, marginBottom: 10 },
  overallBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  overallBarFill: { height: '100%', borderRadius: 3 },

  tabsScroll: { marginBottom: 16 },
  tabs: { gap: 8, paddingRight: 4 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  tabText: { fontSize: 13, color: Colors.muted, fontWeight: '600' },
  tabTextActive: { color: Colors.primary },

  chapterBlock: { marginBottom: 24 },
  chapterTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  conceptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  conceptCell: {
    width: CELL_WIDTH, borderRadius: 14, borderWidth: 1,
    padding: 14, minHeight: 110,
  },
  conceptPct: { fontSize: 26, fontWeight: '900', fontFamily: 'Courier', marginBottom: 4 },
  conceptName: { fontSize: 12, color: Colors.text, fontWeight: '600', lineHeight: 16, marginBottom: 6, flex: 1 },
  conceptBadge: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  conceptMeta: { flexDirection: 'row', gap: 8, marginTop: 'auto' as any },
  conceptMetaText: { fontSize: 10, color: Colors.muted },

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20 },

  legendCard: { backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 16, marginTop: 8 },
  legendTitle: { fontSize: 11, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.text, fontWeight: '600' },
  legendRange: { fontSize: 10, color: Colors.muted },
})
