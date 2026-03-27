import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useColors } from '../constants/theme'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Megaphone } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'

interface Notice {
  id: string
  title: string
  content: string
  created_at: string
}

export default function NoticesScreen() {
  const Colors = useColors()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) setNotices(data)
    } catch (error) {
      console.error('Error loading notices:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadNotices()
  }, [])

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
        <Text style={[styles.title, { color: Colors.text }]}>Notice Board</Text>
      </View>

      <FlatList
        data={notices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotices() }} tintColor={Colors.primary} />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 100).duration(500).springify()}>
            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconFrame, { backgroundColor: Colors.orange + '10' }]}>
                  <Megaphone size={16} color={Colors.orange} />
                </View>
                <Text style={[styles.noticeDate, { color: Colors.primaryLight }]}>
                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Text style={[styles.noticeTitle, { color: Colors.text }]}>{item.title}</Text>
              <Text style={[styles.noticeContent, { color: Colors.muted }]}>{item.content}</Text>
            </View>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Megaphone size={48} color={Colors.muted} opacity={0.3} />
            <Text style={[styles.emptyText, { color: Colors.muted }]}>No notices posted yet.</Text>
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
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconFrame: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  noticeDate: { fontSize: 11, fontFamily: 'Outfit_500Medium' },
  noticeTitle: { fontSize: 15, fontFamily: 'Outfit_700Bold' },
  noticeContent: { fontSize: 13, fontFamily: 'Outfit_400Regular', lineHeight: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Outfit_400Regular' }
})
