// app/(tabs)/performance.tsx
// THE CORE SCREEN — micro-concept heatmap of student performance
import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, LayoutAnimation
} from 'react-native'
import { supabase, type ConceptPerformance } from '../../lib/supabase'
import { useColors, getHeatColor } from '../../constants/theme'
import { useParentContext } from '../../lib/ParentContext'
import { LinearGradient } from 'expo-linear-gradient'
import { Activity, Target, Zap, ChevronRight } from 'lucide-react-native'
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width } = Dimensions.get('window')

interface GroupedPerformance {
  subject: string
  chapters: {
    chapter: string
    concepts: ConceptPerformance[]
  }[]
}export default function PerformanceScreen() {
  const Colors = useColors()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => getStyles(Colors), [Colors])
  const { selectedStudent, loading: ctxLoading } = useParentContext()
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  
  // Performance States
  const [allPerf, setAllPerf] = useState<ConceptPerformance[]>([])
  const [tests, setTests] = useState<{ id: string; test_name: string; test_date: string }[]>([])
  const [selectedTestId, setSelectedTestId] = useState<'all' | string>('all')
  const [testCache, setTestCache] = useState<{ [testId: string]: ConceptPerformance[] }>({})
  const [lackingConcepts, setLackingConcepts] = useState<ConceptPerformance[]>([])

  // Memoized Grouped Data Logic
  const grouped = useMemo(() => {
    if (!allPerf.length) return []
    const subjectMap: { [s: string]: { [c: string]: ConceptPerformance[] } } = {}
    allPerf.forEach((p) => {
      if (!subjectMap[p.subject]) subjectMap[p.subject] = {}
      if (!subjectMap[p.subject][p.chapter]) subjectMap[p.subject][p.chapter] = []
      subjectMap[p.subject][p.chapter].push(p)
    })
    return Object.entries(subjectMap).map(([subject, chapters]) => ({
      subject,
      chapters: Object.entries(chapters).map(([chapter, concepts]) => ({ chapter, concepts })),
    }))
  }, [allPerf])

  const overallScore = useMemo(() => {
    if (!allPerf.length) return 0
    const totalObtained = allPerf.reduce((s, p) => s + p.total_obtained, 0)
    const totalPossible = allPerf.reduce((s, p) => s + p.total_possible, 0)
    return totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0
  }, [allPerf])

  const initialize = useCallback(async () => {
    if (!selectedStudent) { setLoading(false); return }

    // 1. Fetch available tests
    const { data: scoreData } = await supabase.from('student_scores').select('test_id, tests(id, test_name, test_date)').eq('student_id', selectedStudent.id)
    const uniqueTestsMap: { [id: string]: any } = {}
    scoreData?.forEach((s: any) => { if (s.tests && !uniqueTestsMap[s.tests.id]) uniqueTestsMap[s.tests.id] = s.tests })
    setTests(Object.values(uniqueTestsMap).sort((a: any, b: any) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime()))

    // 2. Fetch overall performance data
    const { data: overallData } = await supabase.from('student_concept_performance').select('*').eq('student_id', selectedStudent.id).order('subject')
    const overall = overallData || []
    setAllPerf(overall)
    
    // Set initial subject filter
    if (overall.length > 0 && !selectedSubject) {
      setSelectedSubject(overall[0].subject)
    }

    setLoading(false)
    setRefreshing(false)
  }, [selectedStudent?.id, selectedSubject])

  const fetchInsights = useCallback(async (testId: string) => {
    if (!selectedStudent) return
    let focusPerf = allPerf

    if (testId !== 'all') {
      if (testCache[testId]) {
        focusPerf = testCache[testId]
      } else {
        const { data: testScores } = await supabase
          .from('student_scores')
          .select('marks_obtained, is_correct, question_id, test_questions(max_marks, micro_tags(id, subject, chapter, concept_name))')
          .eq('student_id', selectedStudent.id)
          .eq('test_id', testId)

        if (testScores) {
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
          const testResults = Object.values(conceptMap).map(c => ({
            ...c, student_id: selectedStudent.id, full_path: `${c.subject} > ${c.chapter} > ${c.concept_name}`,
            percentage_score: Math.round((c.total_obtained / c.total_possible) * 100)
          })) as ConceptPerformance[]
          
          setTestCache(prev => ({ ...prev, [testId]: testResults }))
          focusPerf = testResults
        }
      }
    }

    const lacking = focusPerf.filter(p => p.percentage_score < 60).sort((a,b) => a.percentage_score - b.percentage_score).slice(0, 3)
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setLackingConcepts(lacking)
  }, [selectedStudent?.id, allPerf, testCache])

  useEffect(() => { if (!ctxLoading && selectedStudent) initialize() }, [ctxLoading, selectedStudent?.id])
  useEffect(() => { fetchInsights(selectedTestId) }, [selectedTestId, selectedStudent?.id])

  const subjects = useMemo(() => grouped.map(g => g.subject), [grouped])
  const activeGroup = useMemo(() => grouped.find(g => g.subject === selectedSubject), [grouped, selectedSubject])
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); initialize() }} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Activity color={Colors.primary} size={24} strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>Skill Matrix</Text>
          <Text style={styles.subtitle}>{(selectedStudent?.full_name || 'Student').split(' ')[0]}&apos;s micro-concept mastery</Text>
        </View>

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

        {/* SECTION: Test Selector & Suggestions MOVED UP BELOW OVERALL SCORE */}
        {grouped.length > 0 && tests.length > 0 && (
          <Animated.View entering={FadeIn.duration(600).delay(400)} style={{ marginBottom: 32 }}>
            <View style={styles.testHeaderRow}>
              <Text style={styles.sectionLabel}>Test Analysis</Text>
              <ChevronRight color={Colors.muted} size={14} />
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.testSlider} contentContainerStyle={styles.testSliderContent}>
              <TouchableOpacity 
                onPress={() => setSelectedTestId('all')} 
                style={[styles.testPill, selectedTestId === 'all' && styles.testPillActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.testPillText, selectedTestId === 'all' && styles.testPillTextActive]}>🌌 Overall</Text>
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

            {lackingConcepts.length > 0 ? (
              <View style={[styles.lackingCard, { borderColor: Colors.bg === '#030409' ? 'rgba(244,63,94,0.3)' : 'rgba(239,68,68,0.2)' }]}>
                <View style={styles.lackingHeader}>
                  <View style={[styles.iconBoxSmall, { backgroundColor: Colors.bg === '#030409' ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: 'rgba(239,68,68,0.2)' }]}>
                    <Target color="#f43f5e" size={16} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.lackingTitle, { color: Colors.text }]}>Review Needed</Text>
                </View>
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
            ) : (
              <View style={[styles.lackingCard, { borderColor: 'rgba(16,185,129,0.2)', alignItems: 'center', paddingVertical: 16 }]}>
                <Text style={[styles.lackingTitle, { color: Colors.text, fontSize: 13 }]}>🎉 Great performance on this set!</Text>
              </View>
            )}
          </Animated.View>
        )}

        {subjects.length > 1 && (
          <Animated.View entering={FadeIn.duration(800).delay(200)}>
            <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>Deep Dive Matrix</Text>
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
            <Animated.View entering={FadeInDown.duration(600).springify().delay(index * 50)} key={chapter} style={styles.chapterBlock}>
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

  sectionLabel: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  testHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingRight: 4 },
})
