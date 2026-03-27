'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Megaphone, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Notice {
  id: string
  title: string
  content: string
  created_at: string
}

export default function NoticesPage() {
  const supabase = createClient()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadNotices()
  }, [])

  async function loadNotices() {
    setLoading(true)
    const { data } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setNotices(data)
    setLoading(false)
  }

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    setSending(true)
    try {
      const res = await fetch('/api/send-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to send')

      toast.success('Notice broadcasted to all parents!')
      setTitle('')
      setContent('')
      setShowForm(false)
      loadNotices() // Reload
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return
    const { error } = await supabase.from('notices').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Notice deleted')
      setNotices(prev => prev.filter(n => n.id !== id))
    }
  }

  return (
    <div className="flex min-h-screen bg-cosmos-bg">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-20 md:pt-8">
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-cosmos-text">Notice Board</h1>
            <p className="text-cosmos-muted text-sm mt-1">Broadcast announcements to all parent phones instantly.</p>
          </div>

          <button 
            onClick={() => setShowForm(!showForm)} 
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> {showForm ? 'Cancel' : 'New Notice'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSendNotice} className="cosmos-card max-w-xl mb-6 border border-cosmos-border/60">
            <h3 className="font-display font-bold text-sm mb-4">Create Announcement</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-cosmos-muted mb-1">Title *</label>
                <input 
                  type="text" 
                  className="cosmos-input text-sm" 
                  placeholder="e.g. Holiday Announcement"
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs text-cosmos-muted mb-1">Content *</label>
                <textarea 
                  className="cosmos-input text-sm h-28" 
                  placeholder="Type full notice description here..."
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  required 
                />
              </div>
              <button 
                type="submit" 
                className="btn-primary w-full text-sm flex items-center justify-center gap-2 py-2"
                disabled={sending}
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
                {sending ? 'Sending Broadcast...' : 'Broadcast to Parents'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-cosmos-primary" /></div>
        ) : notices.length === 0 ? (
          <div className="cosmos-card text-center py-12 text-cosmos-muted">No notices posted yet.</div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {notices.map(notice => (
              <div key={notice.id} className="cosmos-card border border-cosmos-border/60 group hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Megaphone size={16} className="text-cosmos-primary" />
                      <h4 className="font-display font-bold text-cosmos-text text-sm">{notice.title}</h4>
                    </div>
                    <p className="text-cosmos-muted text-xs mt-1">
                      {new Date(notice.created_at).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-cosmos-text text-xs mt-3 whitespace-pre-wrap leading-relaxed">{notice.content}</p>
                  </div>

                  <button 
                    onClick={() => handleDelete(notice.id)} 
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-cosmos-red/10 text-cosmos-muted hover:text-cosmos-red transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
