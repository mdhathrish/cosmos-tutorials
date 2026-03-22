// app/(tabs)/homework.tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { supabase, type HomeworkSubmission } from '../../lib/supabase'
import { Colors } from '../../constants/theme'
import { BookOpen, AlertCircle, Calendar, CheckCircle2, Star, Clock } from 'lucide-react-native'
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function HomeworkScreen() {
  const insets = useSafeAreaInsets()
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: parentUser } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!parentUser) return

    const { data: student } = await supabase.from('students').select('id').eq('parent_id', parentUser.id).eq('is_active', true).single()
    if (!student) return

    const { data, error } = await supabase
      .from('homework_submissions')
      .select('*, homework(title, description, due_date)')
      .eq('student_id', student.id)

    if (error) {
      console.error('Error fetching homework submissions:', error)
    }

    setSubmissions(data || [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const pending = submissions.filter(s => s.status === 'pending')
  const submitted = submissions.filter(s => s.status !== 'pending')

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  const isDueToday = (dueDate: string) => new Date(dueDate).toDateString() === new Date().toDateString()

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
      contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top + 20, 60) }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <BookOpen color={Colors.primary} size={24} strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>Assignments</Text>
      </View>

      <Animated.View entering={FadeIn.duration(800)} style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: 'rgba(249, 115, 22, 0.2)', backgroundColor: 'rgba(249, 115, 22, 0.05)' }]}>
          <Text style={[styles.statNum, { color: Colors.orange }]}>{pending.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { borderColor: 'rgba(16, 185, 129, 0.2)', backgroundColor: 'rgba(16, 185, 129, 0.05)' }]}>
          <Text style={[styles.statNum, { color: Colors.green }]}>{submitted.length}</Text>
          <Text style={styles.statLabel}>Submitted</Text>
        </View>
        <View style={[styles.statCard, { borderColor: Colors.border, backgroundColor: Colors.surface }]}>
          <Text style={[styles.statNum, { color: Colors.text }]}>{submissions.length}</Text>
          <Text style={styles.statLabel}>Total Tasks</Text>
        </View>
      </Animated.View>

      {pending.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requires Action</Text>
          {pending.map((sub, index) => {
            const hwData = Array.isArray(sub.homework) ? sub.homework[0] : sub.homework;
            const due = hwData?.due_date || ''
            const overdue = isOverdue(due)
            const today = isDueToday(due)
            
            const accentColor = overdue ? Colors.red : today ? Colors.orange : Colors.primary

            return (
              <Animated.View entering={FadeInUp.duration(500).delay(index * 100).springify()} key={sub.id}>
                <LinearGradient 
                  colors={overdue ? ['#4c0519', '#2a020b'] : today ? ['#451a03', '#2e1001'] : Colors.gradientCard} 
                  style={[styles.hwCard, { borderColor: accentColor + '40' }]} 
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <View style={styles.hwTop}>
                    <Text style={styles.hwTitle}>{hwData?.title}</Text>
                    <View style={[styles.hwBadge, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
                      {overdue ? <AlertCircle color={accentColor} size={12} strokeWidth={3} /> : <Clock color={accentColor} size={12} strokeWidth={3} />}
                      <Text style={[styles.hwBadgeText, { color: accentColor }]}>
                        {overdue ? 'OVERDUE' : today ? 'DUE TODAY' : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                  {hwData?.description && (
                    <Text style={styles.hwDesc} numberOfLines={2}>{hwData.description}</Text>
                  )}
                  <View style={styles.hwFooter}>
                    <View style={styles.dueRow}>
                      <Calendar color={accentColor} size={14} opacity={0.7} />
                      <Text style={[styles.hwDue, { color: accentColor }]}>
                        Due: {new Date(due + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            )
          })}
        </View>
      )}

      {submitted.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed</Text>
          {submitted.map((sub, index) => {
            const hwData = Array.isArray(sub.homework) ? sub.homework[0] : sub.homework;
            const isGraded = sub.status === 'graded'
            
            return (
              <Animated.View entering={FadeInUp.duration(500).delay((pending.length + index) * 100).springify()} key={sub.id} style={[styles.hwCard, styles.hwDone]}>
                <View style={styles.hwTop}>
                  <Text style={[styles.hwTitle, { color: Colors.muted }]}>{hwData?.title}</Text>
                  <View style={[styles.hwBadge, { backgroundColor: isGraded ? 'rgba(251, 191, 36, 0.1)' : 'rgba(16, 185, 129, 0.1)', borderColor: isGraded ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)' }]}>
                    {isGraded ? <Star color={Colors.yellow} size={12} strokeWidth={3} /> : <CheckCircle2 color={Colors.green} size={12} strokeWidth={3} />}
                    <Text style={[styles.hwBadgeText, { color: isGraded ? Colors.yellow : Colors.green }]}>
                      {isGraded ? 'GRADED' : 'SUBMITTED'}
                    </Text>
                  </View>
                </View>
                {isGraded && sub.grade && (
                  <View style={styles.gradeRow}>
                    <Text style={styles.gradeLabel}>Instructor Grade</Text>
                    <Text style={styles.gradeValue}>{sub.grade}</Text>
                  </View>
                )}
                <View style={styles.hwFooter}>
                  <Text style={styles.hwDoneDue}>
                    {sub.submitted_at ? `Submitted • ${new Date(sub.submitted_at).toLocaleDateString('en-IN')}` : 'Submitted'}
                  </Text>
                </View>
              </Animated.View>
            )
          })}
        </View>
      )}

      {submissions.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyTitle}>No assignments</Text>
          <Text style={styles.emptySubtitle}>You&apos;re all caught up! Homework assigned by the instructors will appear here.</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 24, paddingBottom: 100 },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },

  header: { marginBottom: 32, alignItems: 'flex-start' },
  iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontFamily: 'Outfit_800ExtraBold', color: Colors.text, letterSpacing: -1 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  statCard: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 32, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -1 },
  statLabel: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: Colors.muted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 },

  hwCard: { borderRadius: 24, borderWidth: 1, padding: 20, marginBottom: 16 },
  hwDone: { backgroundColor: Colors.surface, borderColor: Colors.border },

  hwTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  hwTitle: { flex: 1, fontSize: 16, fontFamily: 'Outfit_700Bold', color: Colors.text, lineHeight: 22 },
  hwBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  hwBadgeText: { fontSize: 10, fontFamily: 'Outfit_800ExtraBold', letterSpacing: 0.5 },
  
  hwDesc: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: Colors.muted, lineHeight: 20, marginBottom: 16 },
  
  hwFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hwDue: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },
  hwDoneDue: { fontSize: 12, fontFamily: 'Outfit_500Medium', color: Colors.subtle },

  gradeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(251, 191, 36, 0.05)', borderRadius: 12, padding: 12, marginTop: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.2)' },
  gradeLabel: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: Colors.yellow },
  gradeValue: { fontSize: 22, fontFamily: 'Outfit_800ExtraBold', color: Colors.yellow },

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 56, marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: Colors.muted, textAlign: 'center', lineHeight: 22 },
})
