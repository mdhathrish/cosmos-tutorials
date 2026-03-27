import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useColors } from '../constants/theme'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Calendar } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'

interface CalendarEvent {
  id: string
  title: string
  event_type: string
  event_date: string
  description: string | null
}

export default function CalendarScreen() {
  const Colors = useColors()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const loadStudentAndEvents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: parentUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', session.user.id)
        .single()

      if (!parentUser) {
        setLoading(false)
        return
      }

      const { data: student } = await supabase
        .from('students')
        .select('id, batch_id')
        .eq('parent_id', parentUser.id)
        .eq('is_active', true)
        .single()

      if (student) {
        setStudentId(student.id)
        setBatchId(student.batch_id)
        await loadEvents(student.batch_id)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error loading calendar data:', error)
      setLoading(false)
    } finally {
      setRefreshing(false)
    }
  }

  const loadEvents = async (bId: string | null) => {
    try {
      let query = supabase
        .from('calendar_events')
        .select('*')
        .order('event_date', { ascending: true })

      if (bId) {
        query = query.or(`batch_id.is.null,batch_id.eq.${bId}`)
      } else {
        query = query.is('batch_id', null)
      }

      const { data, error } = await query

      if (data) setEvents(data)
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudentAndEvents()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadStudentAndEvents()
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: Colors.text }]}>School Calendar</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 100).duration(500).springify()}>
            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <View style={[styles.dateBox, { backgroundColor: Colors.primary + '10' }]}>
                <Text style={[styles.dateMonth, { color: Colors.primary }]}>{new Date(item.event_date).toLocaleDateString('en-IN', { month: 'short' })}</Text>
                <Text style={[styles.dateDay, { color: Colors.text }]}>{new Date(item.event_date).toLocaleDateString('en-IN', { day: '2-digit' })}</Text>
              </View>
              
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.eventTitle, { color: Colors.text }]}>{item.title}</Text>
                {item.description && <Text style={[styles.eventDesc, { color: Colors.muted }]}>{item.description}</Text>}
              </View>

              <View style={[styles.typeBadge, { 
                backgroundColor: item.event_type === 'exam' ? '#fef2f2' : item.event_type === 'holiday' ? '#fffbeb' : '#f0f9ff' 
              }]}>
                <Text style={{ 
                  fontSize: 10, 
                  fontFamily: 'Outfit_700Bold', 
                  color: item.event_type === 'exam' ? '#ef4444' : item.event_type === 'holiday' ? '#f59e0b' : '#3b82f6' 
                }}>
                  {item.event_type.toUpperCase()}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Calendar size={48} color={Colors.muted} opacity={0.3} />
            <Text style={[styles.emptyText, { color: Colors.muted }]}>No events scheduled yet.</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, paddingTop: 20, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontFamily: 'Outfit_700Bold', marginLeft: 15 },
  list: { padding: 20, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  dateBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateMonth: { fontSize: 10, fontFamily: 'Outfit_700Bold', textTransform: 'uppercase' },
  dateDay: { fontSize: 16, fontFamily: 'Outfit_800ExtraBold' },
  eventTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold' },
  eventDesc: { fontSize: 12, fontFamily: 'Outfit_400Regular' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Outfit_400Regular' }
})
