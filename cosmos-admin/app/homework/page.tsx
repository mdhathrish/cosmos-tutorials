'use client'
import { useEffect, useState } from 'react'
import { createClient, type Batch } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Plus, Loader2, Trash2, ChevronDown, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

interface Homework {
    id: string
    batch_id: string
    title: string
    description: string | null
    due_date: string
    created_at: string
    batches?: { batch_name: string; grade: number }
}

export default function HomeworkPage() {
    const supabase = createClient()
    const [homeworks, setHomeworks] = useState<Homework[]>([])
    const [batches, setBatches] = useState<Batch[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

    const load = async () => {
        const { data } = await supabase
            .from('homework')
            .select('*, batches(batch_name, grade)')
            .order('due_date', { ascending: true })
        setHomeworks(data || [])
        setLoading(false)
    }

    useEffect(() => {
        load()
        supabase.from('batches').select('*').eq('is_active', true).then(({ data }) => setBatches(data || []))
    }, [])

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this homework?')) return
        await supabase.from('homework').delete().eq('id', id)
        setHomeworks(prev => prev.filter(h => h.id !== id))
        toast.success('Deleted')
    }

    const isOverdue = (due: string) => new Date(due) < new Date()
    const isDueToday = (due: string) => new Date(due).toDateString() === new Date().toDateString()

    return (
        <div className="flex min-h-screen bg-cosmos-bg star-bg">
            <Sidebar />
            <main className="ml-60 flex-1 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="font-display text-2xl font-bold text-cosmos-primary">Homework</h1>
                        <p className="text-cosmos-muted text-sm mt-0.5">Assign homework to batches</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus size={15} /> Assign Homework
                    </button>
                </div>

                {loading ? (
                    <div className="cosmos-card flex items-center justify-center py-16">
                        <Loader2 size={28} className="text-cosmos-primary animate-spin" />
                    </div>
                ) : homeworks.length === 0 ? (
                    <div className="cosmos-card text-center py-20">
                        <BookOpen size={36} className="mx-auto mb-3 text-cosmos-muted opacity-40" />
                        <p className="text-cosmos-muted">No homework assigned yet.</p>
                        <button onClick={() => setShowModal(true)} className="btn-primary text-sm mt-4 inline-flex items-center gap-2">
                            <Plus size={14} /> Assign First Homework
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {homeworks.map(hw => {
                            const overdue = isOverdue(hw.due_date) && !isDueToday(hw.due_date)
                            const today = isDueToday(hw.due_date)
                            return (
                                <div key={hw.id} className={`cosmos-card hover:border-cosmos-primary/30 transition-colors ${overdue ? 'border-cosmos-red/30 bg-cosmos-red/5' :
                                        today ? 'border-cosmos-orange/30 bg-cosmos-orange/5' : ''
                                    }`}>
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <h3 className="font-display font-bold text-cosmos-text">{hw.title}</h3>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {overdue && <span className="badge-red">Overdue</span>}
                                            {today && <span className="badge-amber">Due Today</span>}
                                            {!overdue && !today && <span className="badge-primary">Upcoming</span>}
                                            <button onClick={() => handleDelete(hw.id)}
                                                className="p-1.5 rounded-lg hover:bg-cosmos-red/10 text-cosmos-muted hover:text-cosmos-red transition-colors">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                    {hw.description && (
                                        <p className="text-cosmos-muted text-sm mb-3 line-clamp-2">{hw.description}</p>
                                    )}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="badge-blue">{hw.batches?.batch_name} · Grade {hw.batches?.grade}</span>
                                        <span className={`font-mono font-semibold ${overdue ? 'text-cosmos-red' : today ? 'text-cosmos-orange' : 'text-cosmos-muted'}`}>
                                            Due: {new Date(hw.due_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {showModal && (
                    <HomeworkModal batches={batches} onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false) }} />
                )}
            </main>
        </div>
    )
}

function HomeworkModal({ batches, onClose, onSaved }: any) {
    const supabase = createClient()
    const [form, setForm] = useState({
        batch_id: '',
        title: '',
        description: '',
        due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    })
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!form.batch_id || !form.title || !form.due_date) { toast.error('Fill all required fields'); return }
        setSaving(true)
        const { data: hw, error } = await supabase.from('homework').insert({
            batch_id: form.batch_id,
            title: form.title,
            description: form.description || null,
            due_date: form.due_date,
        }).select().single()
        if (error) { toast.error(error.message); setSaving(false); return }

        // Auto-create pending submissions for all students in the batch
        const { data: students } = await supabase.from('students').select('id').eq('batch_id', form.batch_id).eq('is_active', true)
        if (students && students.length > 0) {
            await supabase.from('homework_submissions').insert(
                students.map(s => ({ homework_id: hw.id, student_id: s.id, status: 'pending' }))
            )
        }
        toast.success(`Homework assigned to ${students?.length || 0} students!`)
        onSaved()
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
            <div className="bg-cosmos-card border border-cosmos-border rounded-2xl w-full max-w-md">
                <div className="p-6 border-b border-cosmos-border flex items-center justify-between">
                    <h2 className="font-display font-bold text-cosmos-primary">Assign Homework</h2>
                    <button onClick={onClose} className="text-cosmos-muted hover:text-cosmos-text">✕</button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs text-cosmos-muted mb-1">Batch <span className="text-cosmos-red">*</span></label>
                        <select className="cosmos-input" value={form.batch_id} onChange={e => setForm(p => ({ ...p, batch_id: e.target.value }))}>
                            <option value="">Select batch…</option>
                            {batches.map((b: Batch) => <option key={b.id} value={b.id}>{b.batch_name} — Grade {b.grade}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-cosmos-muted mb-1">Title <span className="text-cosmos-red">*</span></label>
                        <input className="cosmos-input" placeholder="e.g. Chapter 3 Exercises — Q1 to Q15"
                            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div>
                        <label className="block text-xs text-cosmos-muted mb-1">Description</label>
                        <textarea className="cosmos-input resize-none" rows={3} placeholder="Additional instructions (optional)…"
                            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div>
                        <label className="block text-xs text-cosmos-muted mb-1">Due Date <span className="text-cosmos-red">*</span></label>
                        <input type="date" className="cosmos-input" value={form.due_date}
                            onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                    </div>
                </div>
                <div className="p-6 border-t border-cosmos-border flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Assign to Batch
                    </button>
                </div>
            </div>
        </div>
    )
}