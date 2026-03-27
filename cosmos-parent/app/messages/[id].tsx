import { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useColors } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Send } from 'lucide-react-native'

interface Message {
  id: string
  conversation_id: string
  sender_role: 'parent' | 'admin'
  sender_id: string | null
  content: string
  created_at: string
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const Colors = useColors()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (!id) return
    loadMessages()

    const channel = supabase
      .channel(`chat:${id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `conversation_id=eq.${id}` 
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  async function loadMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (data) setMessages(data)
    setLoading(false)
  }

  const handleSend = async () => {
    if (!content.trim() || !id) return

    setSending(true)
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_role: 'parent',
        content: content.trim()
      })

    if (!error) {
      setContent('')
      // Bump conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id)
    }
    setSending(false)
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.bg, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: Colors.bg }] as any} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors.card, borderColor: Colors.border }] as any}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: Colors.text }] as any}>Conversation</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list as any}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isAdmin = item.sender_role === 'admin'
          return (
            <View style={[styles.messageRow, isAdmin ? styles.rowLeft : styles.rowRight] as any}>
              <View style={[
                styles.bubble, 
                isAdmin 
                  ? { backgroundColor: Colors.card, borderColor: Colors.border, borderBottomLeftRadius: 4 } 
                  : { backgroundColor: Colors.primary, borderBottomRightRadius: 4 }
              ] as any}>
                <Text style={[styles.text, { color: isAdmin ? Colors.text : '#FFF' }] as any}>{item.content}</Text>
                <Text style={[styles.time, { color: isAdmin ? Colors.muted : 'rgba(255,255,255,0.7)' }] as any}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          )
        }}
      />

      {/* Input Bar */}
      <View style={[styles.inputBar, { backgroundColor: Colors.card, borderTopColor: Colors.border }] as any}>
        <TextInput
          style={[styles.input, { backgroundColor: Colors.bg, color: Colors.text, borderColor: Colors.border }] as any}
          placeholder="Type a message..."
          placeholderTextColor={Colors.muted}
          value={content}
          onChangeText={setContent}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendBtn, { backgroundColor: Colors.primary }] as any} 
          onPress={handleSend}
          disabled={sending || !content.trim()}
        >
          {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={16} color="#FFF" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 60, paddingBottom: 15, borderBottomWidth: 1 },
  backButton: { padding: 10 },
  headerTitle: { fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  list: { padding: 15, gap: 10 },
  messageRow: { flexDirection: 'row', width: '100%' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' },
  text: { fontSize: 13, fontFamily: 'Outfit_500Medium', lineHeight: 18 },
  time: { fontSize: 9, alignSelf: 'flex-end', marginTop: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, gap: 10, paddingBottom: 30 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }
})
