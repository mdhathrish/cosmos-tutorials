import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native'
import { useColors } from '../../constants/theme'
import { useParentContext } from '../../lib/ParentContext'
import { supabase } from '../../lib/supabase'
import { MessageCircle, Plus, ChevronRight } from 'lucide-react-native'
import { useRouter } from 'expo-router'

interface Conversation {
  id: string
  student_id: string
  category: string
  status: string
  updated_at: string
}

export default function MessagesScreen() {
  const Colors = useColors()
  const router = useRouter()
  const { selectedStudent, institute, loading: ctxLoading } = useParentContext()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  // New Conversation Modal state
  const [modalVisible, setModalVisible] = useState(false)
  const [category, setCategory] = useState<'academic' | 'leave' | 'feedback_complaint' | 'general'>('general')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)

  async function loadConversations() {
    if (!selectedStudent) { setLoading(false); return }
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('student_id', selectedStudent.id)
      .order('updated_at', { ascending: false })
    if (data) setConversations(data)
    setLoading(false)
  }

  useEffect(() => {
    if (!ctxLoading && selectedStudent) loadConversations()
  }, [ctxLoading, selectedStudent?.id])

  const handleStartConversation = async () => {
    if (!selectedStudent || !message.trim()) return

    setCreating(true)
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        student_id: selectedStudent.id,
        institute_id: institute?.id || selectedStudent.institute_id,
        category,
        status: 'open'
      })
      .select()
      .single()

    if (conv && !convErr) {
       await supabase.from('messages').insert({
         conversation_id: conv.id,
         sender_role: 'parent',
         sender_id: selectedStudent.id,
         content: message.trim()
       })
       setModalVisible(false)
       setMessage('')
       loadConversations()
    }
    setCreating(false)
  }

  const categoryLabels: Record<string, string> = {
    academic: 'Academic',
    leave: 'Leave',
    feedback_complaint: 'Feedback / Complaint',
    general: 'General'
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.bg, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors.text }]}>Messages</Text>
        <Text style={[styles.subtitle, { color: Colors.muted }]}>Contact support or your teacher</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: Colors.card, borderColor: Colors.border }]}
            onPress={() => router.push({ pathname: '/messages/[id]' as any, params: { id: item.id } })}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.iconFrame, { backgroundColor: Colors.primary + '10' }]}>
                <MessageCircle size={18} color={Colors.primary} />
              </View>
              <View style={{ gap: 2 }}>
                <Text style={[styles.cardTitle, { color: Colors.text }]}>{categoryLabels[item.category]}</Text>
                <Text style={{ color: Colors.muted, fontSize: 11 }}>Status: {item.status}</Text>
              </View>
            </View>
            <ChevronRight size={16} color={Colors.muted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: Colors.muted }]}>No conversations yet.</Text>
            <TouchableOpacity 
              style={[styles.emptyBtn, { backgroundColor: Colors.primary }]}
              onPress={() => setModalVisible(true)}
            >
              <Plus size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>Start Conversation</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: Colors.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Plus size={24} color="#FFF" />
      </TouchableOpacity>

      {/* New Conversation Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
            <Text style={[styles.modalTitle, { color: Colors.text }]}>New Message</Text>
            
            <Text style={[styles.label, { color: Colors.muted }]}>Category</Text>
            <View style={styles.categoryRow}>
              {(['academic', 'leave', 'feedback_complaint', 'general'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catButton, 
                    { borderColor: Colors.border },
                    category === cat && { backgroundColor: Colors.primary + '20', borderColor: Colors.primary }
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={{ color: category === cat ? Colors.primary : Colors.text, fontSize: 12 }}>
                    {categoryLabels[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: Colors.muted, marginTop: 15 }]}>Message</Text>
            <TextInput
              style={[styles.input, { color: Colors.text, backgroundColor: Colors.bg, borderColor: Colors.border }]}
              placeholder="Type your feedback/complaint..."
              placeholderTextColor={Colors.muted}
              multiline
              numberOfLines={4}
              value={message}
              onChangeText={setMessage}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnSecondary}>
                <Text style={{ color: Colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                disabled={creating || !message.trim()} 
                onPress={handleStartConversation}
                style={[styles.btnPrimary, { backgroundColor: Colors.primary, opacity: (!message.trim() || creating) ? 0.6 : 1 }]}
              >
                {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Send</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: { paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 24, fontFamily: 'Outfit_700Bold' },
  subtitle: { fontSize: 13, marginTop: 2 },
  list: { paddingHorizontal: 20, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 16, borderWidth: 1 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconFrame: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 12 },
  emptyText: { textAlign: 'center', fontSize: 14 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  fab: { position: 'absolute', right: 20, bottom: 90, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 18, borderWidth: 1, padding: 20 },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', marginBottom: 15 },
  label: { fontSize: 12, marginBottom: 6 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, height: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, gap: 10 },
  btnSecondary: { paddingVertical: 10, paddingHorizontal: 15 },
  btnPrimary: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }
})
