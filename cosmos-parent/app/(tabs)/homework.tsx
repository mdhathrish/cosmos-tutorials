// app/(tabs)/homework.tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { supabase, type HomeworkSubmission } from '../../lib/supabase'
import { Colors } from '../../constants/theme'

export default function HomeworkScreen() {
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

    const { data } = await supabase
      .from('homework_submissions')
      .select('*, homework(title, description, due_date)')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })

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
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={Colors.primary} />}
    >
      <Text style={styles.title}>📚 Homework</Text>

      {/* Summary row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: Colors.orange + '40', backgroundColor: Colors.orange + '10' }]}>
          <Text style={[styles.statNum, { color: Colors.orange }]}>{pending.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { borderColor: Colors.green + '40', backgroundColor: Colors.green + '10' }]}>
          <Text style={[styles.statNum, { color: Colors.green }]}>{submitted.length}</Text>
          <Text style={styles.statLabel}>Submitted</Text>
        </View>
        <View style={[styles.statCard, { borderColor: Colors.border, backgroundColor: Colors.card }]}>
          <Text style={[styles.statNum, { color: Colors.cyan }]}>{submissions.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Pending */}
      {pending.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pending</Text>
          {pending.map(sub => {
            const due = sub.homework?.due_date || ''
            const overdue = isOverdue(due)
            const today = isDueToday(due)
            return (
              <View key={sub.id} style={[styles.hwCard, overdue ? styles.hwOverdue : today ? styles.hwToday : styles.hwPending]}>
                <View style={styles.hwTop}>
                  <Text style={styles.hwTitle}>{sub.homework?.title}</Text>
                  <View style={[styles.hwBadge,
                    overdue ? { backgroundColor: Colors.red + '20', borderColor: Colors.red + '40' } :
                    today ? { backgroundColor: Colors.orange + '20', borderColor: Colors.orange + '40' } :
                    { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '40' }
                  ]}>
                    <Text style={[styles.hwBadgeText, { color: overdue ? Colors.red : today ? Colors.orange : Colors.primary }]}>
                      {overdue ? '⚠ Overdue' : today ? '⏰ Due Today' : '📌 Pending'}
                    </Text>
                  </View>
                </View>
                {sub.homework?.description && (
                  <Text style={styles.hwDesc} numberOfLines={2}>{sub.homework.description}</Text>
                )}
                <View style={styles.hwFooter}>
                  <Text style={[styles.hwDue, { color: overdue ? Colors.red : today ? Colors.orange : Colors.muted }]}>
                    Due: {new Date(due + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              </View>
            )
          })}
        </>
      )}

      {/* Completed */}
      {submitted.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: pending.length > 0 ? 8 : 0 }]}>Completed</Text>
          {submitted.map(sub => (
            <View key={sub.id} style={[styles.hwCard, styles.hwDone]}>
              <View style={styles.hwTop}>
                <Text style={styles.hwTitle}>{sub.homework?.title}</Text>
                <View style={[styles.hwBadge, { backgroundColor: Colors.green + '20', borderColor: Colors.green + '40' }]}>
                  <Text style={[styles.hwBadgeText, { color: Colors.green }]}>
                    {sub.status === 'graded' ? '⭐ Graded' : '✅ Submitted'}
                  </Text>
                </View>
              </View>
              {sub.status === 'graded' && sub.grade && (
                <View style={styles.gradeRow}>
                  <Text style={styles.gradeLabel}>Grade:</Text>
                  <Text style={styles.gradeValue}>{sub.grade}</Text>
                </View>
              )}
              <Text style={styles.hwDue}>
                {sub.submitted_at ? `Submitted ${new Date(sub.submitted_at).toLocaleDateString('en-IN')}` : 'Submitted'}
              </Text>
            </View>
          ))}
        </>
      )}

      {submissions.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyTitle}>No homework assigned yet</Text>
          <Text style={styles.emptySubtitle}>Homework assigned by your teacher will appear here.</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },

  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 16 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '900' },
  statLabel: { fontSize: 11, color: Colors.muted, marginTop: 2 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  hwCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  hwPending: { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '30' },
  hwToday: { backgroundColor: Colors.orange + '10', borderColor: Colors.orange + '40' },
  hwOverdue: { backgroundColor: Colors.red + '10', borderColor: Colors.red + '40' },
  hwDone: { backgroundColor: Colors.green + '08', borderColor: Colors.green + '20' },

  hwTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  hwTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  hwBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, flexShrink: 0 },
  hwBadgeText: { fontSize: 11, fontWeight: '700' },
  hwDesc: { fontSize: 12, color: Colors.muted, lineHeight: 18, marginBottom: 8 },
  hwFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hwDue: { fontSize: 11, color: Colors.muted },

  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  gradeLabel: { fontSize: 12, color: Colors.muted },
  gradeValue: { fontSize: 16, fontWeight: '800', color: Colors.orange },

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
})
