'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { MessageSquare, Send, Loader2, User, ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useGlobalContext } from '@/lib/GlobalContext'

interface Conversation {
  id: string
  student_id: string
  category: string
  status: string
  created_at: string
  updated_at: string
  students?: {
    full_name: string
  }
}

interface Message {
  id: string
  conversation_id: string
  sender_role: 'parent' | 'admin'
  sender_id: string | null
  content: string
  created_at: string
  is_read: boolean
}

export default function InboxPage() {
  const supabase = createClient()
  const { selectedInstituteId } = useGlobalContext()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMsg, setNewMsg] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedInstituteId) {
        loadConversations()
    }

    // Subscribe to general conversation updates or messages for alerting
    const listChannel = supabase
      .channel('conversations_tracker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        loadConversations()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // if message is from parent, we could trigger a sound or notification alert here
        if (payload.new.sender_role === 'parent') {
          // reload if not currently selected to see if unreads are needed
          loadConversations()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(listChannel)
    }
  }, [selectedInstituteId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id)
      
      const channel = supabase
        .channel(`messages:${selectedConv.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `conversation_id=eq.${selectedConv.id}` 
        }, (payload) => {
          setMessages((current) => [...current, payload.new as Message])
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations() {
    let query = supabase
      .from('conversations')
      .select(`
        *,
        students ( full_name )
      `)
      .order('updated_at', { ascending: false })
    
    if (selectedInstituteId !== 'all') {
        query = query.eq('institute_id', selectedInstituteId)
    }

    const { data, error } = await query
    
    if (!error && data) setConversations(data as any)
    setLoading(false)
  }

  async function loadMessages(convId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    if (!error && data) setMessages(data)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMsg.trim() || !selectedConv) return

    setSending(true)
    try {
      const response = await fetch('/api/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedConv.id,
          content: newMsg.trim()
        })
      })
      
      const result = await response.json()
      if (result.success) {
        setNewMsg('')
        loadConversations() // reload list to sort
      }
    } catch (err) {
      console.error('Send error:', err)
    }
    setSending(false)
  }

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'academic': return 'bg-cosmos-peach/10 text-cosmos-peach border border-cosmos-peach/20'
      case 'leave': return 'bg-cosmos-orange/10 text-cosmos-orange border border-cosmos-orange/20'
      case 'feedback_complaint': return 'bg-cosmos-red/10 text-cosmos-red border border-cosmos-red/20'
      default: return 'bg-cosmos-cyan/10 text-cosmos-cyan border border-cosmos-cyan/20'
    }
  }

  const categoryLabels: Record<string, string> = {
    academic: 'Academic',
    leave: 'Leave',
    feedback_complaint: 'Feedback / Complaint',
    general: 'General Support'
  }

  return (
    <div className="flex min-h-screen bg-cosmos-bg">
      <Sidebar />
      <main className="md:ml-64 flex-1 flex h-screen md:h-screen pt-16 md:pt-0 max-w-[100vw]">
        {/* Left Side: Conversation List */}
        <div className={`w-full md:w-80 border-r border-cosmos-border flex flex-col bg-white ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-5 border-b border-cosmos-border bg-white sticky top-0 z-10">
            <h1 className="font-display text-lg font-bold text-cosmos-text">Messages</h1>
            <p className="text-cosmos-muted text-[11px]">Parent-Teacher Helpdesk</p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-cosmos-border/50">
            {loading ? (
              <div className="p-4 flex justify-center"><Loader2 size={16} className="animate-spin text-cosmos-primary" /></div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-cosmos-muted text-sm">No messages yet</div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full text-left p-4 hover:bg-cosmos-surface transition-colors flex flex-col gap-1 ${selectedConv?.id === conv.id ? 'bg-cosmos-surface font-medium border-l-4 border-cosmos-primary' : ''}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-semibold text-cosmos-text truncate">{conv.students?.full_name || 'Anonymous Student'}</span>
                    <span className="text-[10px] text-cosmos-muted">{formatDistanceToNow(new Date(conv.updated_at))} ago</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getCategoryBadge(conv.category)}`}>
                      {categoryLabels[conv.category] || conv.category}
                    </span>
                    {conv.status === 'closed' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Closed</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Chat Thread */}
        <div className={`flex-1 flex flex-col bg-cosmos-bg ${selectedConv ? 'flex' : 'hidden md:flex'}`}>
          {selectedConv ? (
            <>
              {/* Top Bar */}
              <div className="p-4 border-b border-cosmos-border bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedConv(null)} className="md:hidden p-1 rounded-lg hover:bg-cosmos-surface text-cosmos-muted">
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h2 className="font-display text-sm font-bold text-cosmos-text">{selectedConv.students?.full_name}</h2>
                    <p className="text-cosmos-muted text-xs">Category: {categoryLabels[selectedConv.category]}</p>
                  </div>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-xl p-3 shadow-sm flex flex-col gap-0.5 ${
                      msg.sender_role === 'admin' 
                        ? 'bg-cosmos-primary text-white rounded-br-none' 
                        : 'bg-white border border-cosmos-border rounded-bl-none text-cosmos-text'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <span className={`text-[10px] self-end ${msg.sender_role === 'admin' ? 'text-white/70' : 'text-cosmos-muted'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Input */}
              {selectedConv.status === 'open' && (
                <form onSubmit={handleSend} className="p-4 border-t border-cosmos-border bg-white flex items-center gap-2">
                  <input
                    type="text"
                    className="cosmos-input flex-1"
                    placeholder="Type a message..."
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    disabled={sending}
                  />
                  <button type="submit" disabled={sending || !newMsg.trim()} className="btn-primary flex items-center justify-center p-2.5 rounded-lg h-full">
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-cosmos-muted">
              <MessageSquare size={48} className="mb-2 opacity-50" />
              <p className="text-sm">Select a conversation to reply</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
