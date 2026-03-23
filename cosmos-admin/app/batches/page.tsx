// app/batches/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient, type Batch } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import Sidebar from '@/components/Sidebar'
import { Plus, Loader2, Pencil, Trash2, Clock, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function BatchesPage() {
  const supabase = createClient()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editBatch, setEditBatch] = useState<Batch | null>(null)
  const [studentCounts, setStudentCounts] = useState<{ [id: string]: number }>({})

  const load = async () => {
    const { data } = await supabase.from('batches').select('*').eq('is_active', true).order('grade')
    if (data) {
      setBatches(data)
      // Get student counts per batch
      const counts: { [id: string]: number } = {}
      await Promise.all(data.map(async (b) => {
        const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('batch_id', b.id).eq('is_active', true)
        counts[b.id] = count || 0
      }))
      setStudentCounts(counts)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this batch?')) return
    const { error } = await supabase.from('batches').update({ is_active: false }).eq('id', id)
    if (error) { toast.error(friendlyError(error)); return }
    setBatches(prev => prev.filter(b => b.id !== id))
    toast.success('Batch deactivated')
  }

  const subjectColors: { [s: string]: string } = {
    Mathematics: 'badge-purple', Physics: 'badge-cyan', Chemistry: 'badge-gold', Biology: 'badge-green',
  }

  return (
    <div className="flex min-h-screen bg-cosmos-bg star-bg">
      <Sidebar />
      <main className="md:ml-60 flex-1 p-4 md:p-6 w-full max-w-[100vw]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-cosmos-text">Batches</h1>
            <p className="text-cosmos-muted text-sm mt-0.5">{batches.length} active batches · Max 10 students each</p>
          </div>
          <button onClick={() => { setEditBatch(null); setShowModal(true) }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> New Batch
          </button>
        </div>

        {loading ? (
          <div className="cosmos-card flex items-center justify-center py-16">
            <Loader2 size={28} className="text-cosmos-blue animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {batches.map(b => {
              const count = studentCounts[b.id] || 0
              const fillPct = (count / b.capacity) * 100
              return (
                <div key={b.id} className="cosmos-card hover:border-cosmos-blue/40 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-display font-bold text-cosmos-text">{b.batch_name}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="badge-purple">Grade {b.grade}</span>
                        <span className={subjectColors[b.subject] || 'badge-cyan'}>{b.subject}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditBatch(b); setShowModal(true) }}
                        className="p-1.5 rounded-lg hover:bg-cosmos-surface text-cosmos-muted hover:text-cosmos-blue transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(b.id)}
                        className="p-1.5 rounded-lg hover:bg-cosmos-red/10 text-cosmos-muted hover:text-cosmos-red transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-cosmos-muted mb-3">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} />
                      {b.timing_start?.slice(0, 5)} – {b.timing_end?.slice(0, 5)}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {b.days_of_week?.map(d => (
                        <span key={d} className="text-xs bg-cosmos-surface px-1.5 py-0.5 rounded text-cosmos-blue font-medium">{d}</span>
                      ))}
                    </span>
                  </div>

                  {/* Capacity bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1 text-cosmos-muted"><Users size={11} /> Students</span>
                      <span className={`font-mono font-bold ${fillPct >= 90 ? 'text-cosmos-red' : fillPct >= 70 ? 'text-cosmos-gold' : 'text-cosmos-green'}`}>
                        {count}/{b.capacity}
                      </span>
                    </div>
                    <div className="h-1.5 bg-cosmos-surface rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${fillPct >= 90 ? 'bg-cosmos-red' : fillPct >= 70 ? 'bg-cosmos-gold' : 'bg-cosmos-green'}`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            {batches.length === 0 && (
              <div className="col-span-2 cosmos-card text-center py-16 text-cosmos-muted">
                No batches yet. Create your first batch.
              </div>
            )}
          </div>
        )}

        {showModal && (
          <BatchModal batch={editBatch} onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false) }} />
        )}
      </main>
    </div>
  )
}

function BatchModal({ batch, onClose, onSaved }: any) {
  const supabase = createClient()
  const [form, setForm] = useState({
    batch_name: batch?.batch_name || '',
    grade: batch?.grade || 8,
    subject: batch?.subject || 'Mathematics',
    timing_start: batch?.timing_start || '16:00',
    timing_end: batch?.timing_end || '17:30',
    days_of_week: batch?.days_of_week || ['Mon', 'Wed', 'Fri'],
    capacity: batch?.capacity || 10,
  })
  const [saving, setSaving] = useState(false)

  const toggleDay = (d: string) => setForm(p => ({
    ...p,
    days_of_week: p.days_of_week.includes(d) ? p.days_of_week.filter((x: string) => x !== d) : [...p.days_of_week, d]
  }))

  const handleSave = async () => {
    if (!form.batch_name.trim()) { toast.error('Please enter a batch name'); return }
    if (!form.timing_start || !form.timing_end) { toast.error('Please set start and end times'); return }
    if (form.days_of_week.length === 0) { toast.error('Please select at least one day'); return }
    setSaving(true)
    if (batch) {
      const { error } = await supabase.from('batches').update(form).eq('id', batch.id)
      if (error) { toast.error(friendlyError(error)); setSaving(false); return }
    } else {
      const { error } = await supabase.from('batches').insert(form)
      if (error) { toast.error(friendlyError(error)); setSaving(false); return }
    }
    toast.success(batch ? 'Batch updated!' : 'Batch created!')
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-cosmos-card border border-cosmos-border rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-cosmos-border flex items-center justify-between">
          <h2 className="font-display font-bold">{batch ? 'Edit Batch' : 'New Batch'}</h2>
          <button onClick={onClose} className="text-cosmos-muted hover:text-cosmos-text">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-cosmos-muted mb-1">Batch Name</label>
            <input className="cosmos-input" placeholder="e.g. 9A Morning Maths" value={form.batch_name} onChange={e => setForm(p => ({ ...p, batch_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">Grade</label>
              <select className="cosmos-input" value={form.grade} onChange={e => setForm(p => ({ ...p, grade: parseInt(e.target.value) }))}>
                {[8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">Subject</label>
              <select className="cosmos-input" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}>
                {['Mathematics','Physics','Chemistry','Biology','All Subjects'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">Start Time</label>
              <input type="time" className="cosmos-input" value={form.timing_start} onChange={e => setForm(p => ({ ...p, timing_start: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">End Time</label>
              <input type="time" className="cosmos-input" value={form.timing_end} onChange={e => setForm(p => ({ ...p, timing_end: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-cosmos-muted mb-2">Days</label>
            <div className="flex gap-2">
              {DAYS.map(d => (
                <button key={d} onClick={() => toggleDay(d)} type="button"
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    form.days_of_week.includes(d) ? 'bg-cosmos-blue text-white' : 'bg-cosmos-surface text-cosmos-muted border border-cosmos-border'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-cosmos-muted mb-1">Capacity (max 10)</label>
            <input type="number" min={1} max={10} className="cosmos-input w-24" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: Math.min(10, parseInt(e.target.value)) }))} />
          </div>
        </div>
        <div className="p-6 border-t border-cosmos-border flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {batch ? 'Update' : 'Create Batch'}
          </button>
        </div>
      </div>
    </div>
  )
}
