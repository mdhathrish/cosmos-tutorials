// app/(tabs)/performance.tsx
// THE CORE SCREEN — micro-concept heatmap of student performance
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions
} from 'react-native'
import { supabase, type ConceptPerformance } from '../../lib/supabase'
import { useColors, getHeatColor } from '../../constants/theme'
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
  const Colors = useColors()
  const insets = useSafeAreaInsets()
  const styles = getStyles(Colors)
  
  const [grouped, setGrouped] = useState<GroupedPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [studentName, setStudentName] = useState('')
  const [overallScore, setOverallScore] = useState(0)

  // NEW: Filter States
  const [tests, setTests] = useState<{ id: string; test_name: string; test_date: string }[]>([])
  const [selectedTestId, setSelectedTestId] = useState<'all' | string>('all')
  const [allPerf, setAllPerf] = useState<ConceptPerformance[]>([]) // Cache overall
  const [lackingConcepts, setLackingConcepts] = useState<ConceptPerformance[]>([])


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

    // 1. Fetch available tests that the student took
    const { data: scoreData } = await supabase
      .from('student_scores')
      .select('test_id, tests(id, test_name, test_date)')
      .eq('student_id', student.id)
    
    const uniqueTestsMap: { [id: string]: any } = {}
    if (scoreData) {
      scoreData.forEach((s: any) => {
        if (s.tests && !uniqueTestsMap[s.tests.id]) {
          uniqueTestsMap[s.tests.id] = s.tests
        }
      })
    }
    const testsList = Object.values(uniqueTestsMap).sort((a: any, b: any) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())
    setTests(testsList as any)

    // 2. Fetch overall or test performance data
    let perf: ConceptPerformance[] = []
    if (selectedTestId === 'all') {
      const { data } = await supabase.from('student_concept_performance').select('*').eq('student_id', student.id).order('subject')
      perf = data || []
    } else {
      const data = await loadTestSpecificPerformance(selectedTestId, student.id)
      perf = data || []
    }

    setAllPerf(perf)
    processPerformance(perf)

    setLoading(false)
    setRefreshing(false)
  }

  const loadTestSpecificPerformance = async (testId: string, studentId: string) => {
    const { data: testScores } = await supabase
      .from('student_scores')
      .select('marks_obtained, is_correct, question_id, test_questions(max_marks, micro_tags(id, subject, chapter, concept_name))')
      .eq('student_id', studentId)
      .eq('test_id', testId)

    if (!testScores) return []

    const conceptMap: { [concept: string]: any } = {}
    testScores.forEach((s: any) => {
      const q = s.test_questions
      if (!q || !q.micro_tags) return
      const tag = q.micro_tags
      const key = tag.concept_name

      if (!conceptMap[key]) {
        conceptMap[key] = {
          micro_tag_id: tag.id, subject: tag.subject, chapter: tag.chapter || 'General', concept_name: tag.concept_name,
          questions_attempted: 0, total_obtained: 0, total_possible: 0
        }
      }
      conceptMap[key].questions_attempted += 1
      conceptMap[key].total_obtained += s.marks_obtained || 0
      conceptMap[key].total_possible += q.max_marks || 1
    })

    return Object.values(conceptMap).map(c => ({
      ...c, student_id: studentId, full_path: `${c.subject} > ${c.chapter} > ${c.concept_name}`,
      percentage_score: Math.round((c.total_obtained / c.total_possible) * 100)
    })) as ConceptPerformance[]
  }

  const processPerformance = (perf: ConceptPerformance[]) => {
    if (perf && perf.length > 0) {
      const totalObtained = perf.reduce((s: number, p: ConceptPerformance) => s + p.total_obtained, 0)
      const totalPossible = perf.reduce((s: number, p: ConceptPerformance) => s + p.total_possible, 0)
      setOverallScore(totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0)

      const subjectMap: { [s: string]: { [c: string]: ConceptPerformance[] } } = {}
      for (const p of perf) {
        if (!subjectMap[p.subject]) subjectMap[p.subject] = {}
        if (!subjectMap[p.subject][p.chapter]) subjectMap[p.subject][p.chapter] = []
        subjectMap[p.subject][p.chapter].push(p)
      }

      const result: GroupedPerformance[] = Object.entries(subjectMap).map(([subject, chapters]) => ({
        subject,
        chapters: Object.entries(chapters).map(([chapter, concepts]) => ({ chapter, concepts })),
      }))

      setGrouped(result)
      if (result.length > 0) {
        const hasSelected = result.some(r => r.subject === selectedSubject)
        if (!hasSelected) setSelectedSubject(result[0].subject)
      }

      // Compute Lacking Concepts (< 60%) sorted by lowest
      const lacking = perf.filter(p => p.percentage_score < 60).sort((a,b) => a.percentage_score - b.percentage_score).slice(0, 3)
      setLackingConcepts(lacking)
    } else {
      setGrouped([])
      setOverallScore(0)
      setLackingConcepts([])
    }
  }

  useEffect(() => { load() }, [selectedTestId])

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingTop: 20, paddingBottom: Math.max(insets.bottom + 110, 110) }]}

      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Activity color={Colors.primary} size={24} strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>Skill Matrix</Text>
        <Text style={styles.subtitle}>{studentName.split(' ')[0]}&apos;s micro-concept mastery</Text>
      </View>

      {/* NEW: Test Selector Slider */}
      {tests.length > 0 && (
        <Animated.View entering={FadeIn.duration(500)} style={{ marginBottom: 24 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.testSlider} contentContainerStyle={styles.testSliderContent}>
            <TouchableOpacity 
              onPress={() => setSelectedTestId('all')} 
              style={[styles.testPill, selectedTestId === 'all' && styles.testPillActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.testPillText, selectedTestId === 'all' && styles.testPillTextActive]}>🌌 Overall Matrix</Text>
            </TouchableOpacity>
            {tests.map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setSelectedTestId(t.id)}
                style={[styles.testPill, selectedTestId === t.id && styles.testPillActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.testPillText, selectedTestId === t.id && styles.testPillTextActive]}>📝 {t.test_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}


      <Animated.View entering={FadeInDown.duration(600).springify()}>
        <LinearGradient 
          colors={overallScore >= 70 ? (Colors.bg === '#030409' ? ['#052e16', '#022c22'] : ['#f0fdf4', '#dcfce7']) : overallScore >= 40 ? (Colors.bg === '#030409' ? ['#451a03', '#2e1001'] : ['#fff7ed', '#ffedd5']) : (Colors.bg === '#030409' ? ['#4c0519', '#2a020b'] : ['#fef2f2', '#fee2e2'])} 
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
              <View style={[styles.overallBarFill, { width: `${overallScore}%` as any, backgroundColor: overallColor.text }]} />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* NEW: Areas Needing Focus Card */}
      {lackingConcepts.length > 0 && (
        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
          <View style={[styles.lackingCard, { borderColor: Colors.bg === '#030409' ? 'rgba(244,63,94,0.3)' : 'rgba(239,68,68,0.2)' }]}>
            <View style={styles.lackingHeader}>
              <View style={[styles.iconBoxSmall, { backgroundColor: Colors.bg === '#030409' ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: 'rgba(239,68,68,0.2)' }]}>
                <Target color="#f43f5e" size={16} strokeWidth={2.5} />
              </View>
              <Text style={[styles.lackingTitle, { color: Colors.text }]}>Areas Needing Focus</Text>
            </View>
            <Text style={styles.lackingSubtitle}>Child scored below 60% on these concepts. Targeted review recommended:</Text>
            <View style={styles.lackingList}>
              {lackingConcepts.map((c) => {
                const heat = getHeatColor(c.percentage_score || 0)
                return (
                  <View key={c.micro_tag_id} style={styles.lackingItem}>
                    <View style={[styles.lackingItemDot, { backgroundColor: heat.text }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.lackingItemText, { color: Colors.text }]}>{c.concept_name}</Text>
                      <Text style={styles.lackingItemSub}>{c.subject} • {c.percentage_score}% Mastery</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        </Animated.View>
      )}


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
                    <Text style={[styles.conceptName, { color: Colors.text }]} numberOfLines={2}>{c.concept_name}</Text>
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
              <View key={l.range} style={[styles.legendItem, { backgroundColor: Colors.bg === '#030409' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }]}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={[styles.legendText, { color: Colors.text }]}>{l.label}</Text>
                <Text style={styles.legendRange}>{l.range}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}
      </ScrollView>
    </View>
  )
}

const CELL_WIDTH = (width - 60) / 2

const getStyles = (Colors: any) => StyleSheet.create({
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
  conceptName: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', lineHeight: 18, marginBottom: 8, flex: 1 },
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
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },
  legendRange: { fontSize: 11, color: Colors.muted, fontFamily: 'Outfit_500Medium' },

  // NEW STYLES
  testSlider: { marginBottom: 4 },
  testSliderContent: { gap: 8, paddingRight: 4 },
  testPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  testPillActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  testPillText: { fontSize: 13, color: Colors.muted, fontFamily: 'Outfit_600SemiBold' },
  testPillTextActive: { color: Colors.primary, fontFamily: 'Outfit_700Bold' },

  lackingCard: {
    backgroundColor: Colors.surface, borderRadius: 24, padding: 20,
    borderWidth: 1, marginBottom: 32, gap: 12,
  },
  lackingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBoxSmall: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lackingTitle: { fontSize: 16, fontFamily: 'Outfit_700Bold' },
  lackingSubtitle: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: Colors.muted, lineHeight: 18 },
  lackingList: { gap: 10, marginTop: 4 },
  lackingItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  lackingItemDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  lackingItemText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  lackingItemSub: { fontSize: 12, fontFamily: 'Outfit_500Medium', color: Colors.muted, marginTop: 2 },
})
