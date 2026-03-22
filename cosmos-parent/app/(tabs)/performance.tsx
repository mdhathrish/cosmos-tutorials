// app/(tabs)/performance.tsx
// THE CORE SCREEN — micro-concept heatmap of student performance
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions
} from 'react-native'
import { supabase, type ConceptPerformance } from '../../lib/supabase'
import { Colors, getHeatColor } from '../../constants/theme'
import { LinearGradient } from 'expo-linear-gradient'
import { Activity, Target, Zap } from 'lucide-react-native'
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width } = Dimensions.get('window')

interface GroupedPerformance {
  subject: string
  chapters: {
    chapter: string
    concepts: ConceptPerformance[]
  }[]
}

export default function PerformanceScreen() {
  const insets = useSafeAreaInsets()
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

    const { data: perf } = await supabase
      .from('student_concept_performance')
      .select('*')
      .eq('student_id', student.id)
      .order('subject')

    if (perf && perf.length > 0) {
      const totalObtained = perf.reduce((s: number, p: ConceptPerformance) => s + p.total_obtained, 0)
      const totalPossible = perf.reduce((s: number, p: ConceptPerformance) => s + p.total_possible, 0)
      setOverallScore(totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0)

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
        <Text style={styles.loadingText}>Analyzing progress mapping…</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top + 20, 60) }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Activity color={Colors.primary} size={24} strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>Skill Matrix</Text>
        <Text style={styles.subtitle}>{studentName.split(' ')[0]}&apos;s micro-concept mastery</Text>
      </View>

      <Animated.View entering={FadeInDown.duration(600).springify()}>
        <LinearGradient 
          colors={overallScore >= 70 ? ['#052e16', '#022c22'] : overallScore >= 40 ? ['#451a03', '#2e1001'] : ['#4c0519', '#2a020b']} 
          style={[styles.overallCard, { borderColor: overallColor.text + '50' }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.overallLeft}>
            <Text style={[styles.overallScore, { color: overallColor.text }]}>{overallScore}<Text style={styles.pct}>%</Text></Text>
            <View style={[styles.badge, { backgroundColor: overallColor.bg }]}>
              <Text style={[styles.overallLabel, { color: overallColor.text }]}>{overallColor.label}</Text>
            </View>
          </View>
          <View style={styles.overallRight}>
            <View style={styles.targetRow}>
              <Target color={Colors.muted} size={14} />
              <Text style={styles.overallDesc}>Overall Academy Score</Text>
            </View>
            <View style={styles.overallBar}>
              <View style={[styles.overallBarFill, { width: `${overallScore}%` as any, backgroundColor: overallColor.text, shadowColor: overallColor.text, shadowOpacity: 0.8, shadowRadius: 10 }]} />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {subjects.length > 1 && (
        <Animated.View entering={FadeIn.duration(800).delay(200)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
            {subjects.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => setSelectedSubject(s)}
                style={[styles.tab, selectedSubject === s && styles.tabActive]}
                activeOpacity={0.7}
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
        </Animated.View>
      )}

      {activeGroup ? (
        activeGroup.chapters.map(({ chapter, concepts }, index) => (
          <Animated.View entering={FadeInDown.duration(600).springify().delay(300 + index * 100)} key={chapter} style={styles.chapterBlock}>
            <Text style={styles.chapterTitle}>{chapter}</Text>
            <View style={styles.conceptGrid}>
              {concepts.map(c => {
                const heat = getHeatColor(c.percentage_score || 0)
                return (
                  <View key={c.micro_tag_id} style={[styles.conceptCell, { backgroundColor: heat.bg, borderColor: heat.text + '30' }]}>
                    <View style={styles.conceptTop}>
                      <Text style={[styles.conceptPct, { color: heat.text }]}>{Math.round(c.percentage_score || 0)}%</Text>
                      <Zap color={heat.text} size={14} opacity={0.5} />
                    </View>
                    <Text style={styles.conceptName} numberOfLines={2}>{c.concept_name}</Text>
                    <Text style={[styles.conceptBadge, { color: heat.text }]}>{heat.label}</Text>
                    <View style={styles.conceptMeta}>
                      <Text style={styles.conceptMetaText}>{c.questions_attempted} Q</Text>
                      <Text style={styles.conceptMetaText}>{c.total_obtained}/{c.total_possible} pts</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </Animated.View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>No matrices available</Text>
          <Text style={styles.emptySubtitle}>Granular performance data will reconstruct here after examinations.</Text>
        </View>
      )}

      {grouped.length > 0 && (
        <Animated.View entering={FadeIn.duration(1000).delay(600)} style={styles.legendCard}>
          <Text style={styles.legendTitle}>Mastery Spectrum</Text>
          <View style={styles.legendRow}>
            {[
              { range: '≥85%', label: 'Excellent', color: '#34D399' },
              { range: '70–84%', label: 'Strong', color: '#6EE7B7' },
              { range: '55–69%', label: 'Good', color: '#FCD34D' },
              { range: '40–54%', label: 'Needs Work', color: '#FDBA74' },
              { range: '25–39%', label: 'Weak', color: '#FCA5A5' },
              { range: '<25%', label: 'Critical', color: '#F87171' },
            ].map(l => (
              <View key={l.range} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
                <Text style={styles.legendRange}>{l.range}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </ScrollView>
  )
}

const CELL_WIDTH = (width - 60) / 2

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 24, paddingBottom: 100 },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  loadingText: { color: Colors.muted, marginTop: 16, fontFamily: 'Outfit_500Medium' },

  header: { marginBottom: 32, alignItems: 'center' },
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontFamily: 'Outfit_800ExtraBold', color: Colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 14, fontFamily: 'Outfit_500Medium', color: Colors.muted, marginTop: 6 },

  overallCard: {
    borderRadius: 24, padding: 24, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', marginBottom: 32,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }
  },
  overallLeft: { alignItems: 'flex-start', marginRight: 24 },
  overallScore: { fontSize: 44, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -1 },
  pct: { fontSize: 24, fontFamily: 'Outfit_600SemiBold', opacity: 0.6 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: -4 },
  overallLabel: { fontSize: 11, fontFamily: 'Outfit_700Bold', textTransform: 'uppercase', letterSpacing: 1.5 },
  overallRight: { flex: 1 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  overallDesc: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: Colors.muted },
  overallBar: { height: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden' },
  overallBarFill: { height: '100%', borderRadius: 4 },

  tabsScroll: { marginBottom: 32 },
  tabs: { gap: 10, paddingRight: 4 },
  tab: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  tabText: { fontSize: 14, color: Colors.muted, fontFamily: 'Outfit_600SemiBold' },
  tabTextActive: { color: Colors.primary, fontFamily: 'Outfit_700Bold' },

  chapterBlock: { marginBottom: 32 },
  chapterTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: Colors.text, marginBottom: 16, letterSpacing: -0.5 },
  conceptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  conceptCell: {
    width: CELL_WIDTH, borderRadius: 20, borderWidth: 1,
    padding: 16, minHeight: 120,
  },
  conceptTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  conceptPct: { fontSize: 28, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -1 },
  conceptName: { fontSize: 13, color: Colors.text, fontFamily: 'Outfit_600SemiBold', lineHeight: 18, marginBottom: 8, flex: 1 },
  conceptBadge: { fontSize: 10, fontFamily: 'Outfit_700Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  conceptMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' as any },
  conceptMetaText: { fontSize: 11, fontFamily: 'Outfit_500Medium', color: Colors.muted },

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: Colors.muted, textAlign: 'center', lineHeight: 22 },

  legendCard: { backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, padding: 20, marginTop: 16 },
  legendTitle: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: Colors.text, fontFamily: 'Outfit_600SemiBold' },
  legendRange: { fontSize: 11, color: Colors.muted, fontFamily: 'Outfit_500Medium' },
})
