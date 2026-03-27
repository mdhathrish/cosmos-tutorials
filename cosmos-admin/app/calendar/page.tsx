'use client'
import { useEffect, useState } from 'react'
import { createClient, type Batch } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Calendar as CalendarIcon, Plus, Trash2, Loader2, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface CalendarEvent {
  id: string
  title: string
  description: string
  event_type: 'exam' | 'holiday' | 'event' | 'class'
  event_date: string
  batch_id: string | null
  batches?: { batch_name: string }
}

export default function CalendarPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'class' as any, event_date: '', batch_id: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: bData } = await supabase.from('batches').select('*').eq('is_active', true)
    if (bData) setBatches(bData)

    const { data: eData } = await supabase
      .from('calendar_events')
      .select('*, batches(batch_name)')
      .order('event_date', { ascending: true })

    if (eData) setEvents(eData)
    setLoading(false)
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.event_date) return

    setSending(true)
    const { error } = await supabase
      .from('calendar_events')
      .insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_type: form.event_type,
        event_date: form.event_date,
        batch_id: form.batch_id === '' ? null : form.batch_id
      })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Event scheduled successfully!')
      setForm({ title: '', description: '', event_type: 'class', event_date: '', batch_id: '' })
      setShowForm(false)
      loadData()
    }
    setSending(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    const { error } = await supabase.from('calendar_events').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Event removed')
      setEvents(prev => prev.filter(e => e.id !== id))
    }
  }

  const getEventBadgeClass = (type: string) => {
    switch(type) {
      case 'exam': return 'bg-rose-100 text-rose-700 border-rose-200'
      case 'holiday': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'event': return 'bg-purple-100 text-purple-700 border-purple-200'
      default: return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  return (
    <div className="flex min-h-screen bg-cosmos-bg">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-20 md:pt-8">
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-cosmos-text">Academic Calendar</h1>
            <p className="text-cosmos-muted text-sm mt-1">Schedule tests, batches schedules, or holidays for parents.</p>
          </div>

          <button 
            onClick={() => setShowForm(!showForm)} 
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> {showForm ? 'Cancel' : 'Schedule Event'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreateEvent} className="cosmos-card max-w-xl mb-6 border border-cosmos-border/60">
            <h3 className="font-display font-bold text-sm mb-4">New Calendar Event</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-cosmos-muted mb-1">Title *</label>
                <input type="text" className="cosmos-input text-sm" placeholder="e.g. Mathematics Unit Test"
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-cosmos-muted mb-1">Type *</label>
                  <select className="cosmos-input text-sm" value={form.event_type} onChange={e => setForm(p => ({ ...p, event_type: e.target.value as any }))}>
                    <option value="class">Class</option>
                    <option value="exam">Examination</option>
                    <option value="holiday">Holiday</option>
                    <option value="event">General Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-cosmos-muted mb-1">Date *</label>
                  <input type="date" className="cosmos-input text-sm" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="block text-xs text-cosmos-muted mb-1">Target Batch (Optional)</label>
                <select className="cosmos-input text-sm" value={form.batch_id} onChange={e => setForm(p => ({ ...p, batch_id: e.target.value }))}>
                  <option value="">Global (All Parents)</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name} (Grade {b.grade})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-cosmos-muted mb-1">Description</label>
                <input type="text" className="cosmos-input text-sm" placeholder="Details (Syllabus, timings etc.)"
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <button type="submit" className="btn-primary w-full text-sm flex items-center justify-center gap-2 py-2" disabled={sending}>
                {sending ? <Loader2 size={16} className="animate-spin" /> : <CalendarIcon size={16} />}
                Schedule
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-cosmos-primary" /></div>
        ) : events.length === 0 ? (
          <div className="cosmos-card text-center py-12 text-cosmos-muted">No scheduled items. Add tests or holidays to start.</div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {events.map(event => (
              <div key={event.id} className="cosmos-card border border-cosmos-border/50 group hover:shadow-sm transition-all flex items-start gap-4 p-5">
                <div className="bg-cosmos-surface border border-cosmos-border/80 rounded-xl p-3 text-center min-w-[70px]">
                  <p className="text-xs font-bold text-cosmos-primary uppercase">{new Date(event.event_date).toLocaleDateString('en-IN', { month: 'short' })}</p>
                  <p className="text-2xl font-black text-cosmos-text mt-0.5">{new Date(event.event_date).toLocaleDateString('en-IN', { day: '2-digit' })}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getEventBadgeClass(event.event_type)}`}>
                      {event.event_type.toUpperCase()}
                    </span>
                    {event.batches?.batch_name && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold bg-neutral-100 border-neutral-200 text-neutral-600">
                        {event.batches.batch_name}
                      </span>
                    )}
                  </div>
                  <h4 className="font-display font-bold text-cosmos-text text-sm">{event.title}</h4>
                  {event.description && <p className="text-cosmos-muted text-xs mt-1 leading-relaxed">{event.description}</p>}
                </div>
                <button onClick={() => handleDelete(event.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-cosmos-red/10 text-cosmos-muted hover:text-cosmos-red transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
