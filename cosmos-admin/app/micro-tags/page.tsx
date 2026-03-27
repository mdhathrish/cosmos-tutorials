'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import Sidebar from '@/components/Sidebar'
import { Plus, Loader2, Trash2, Search, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

interface MicroTag {
    id: string
    subject: string
    chapter: string
    concept_name: string
    full_path: string
}

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology']

export default function MicroTagsPage() {
    const supabase = createClient()
    const [tags, setTags] = useState<MicroTag[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterSubject, setFilterSubject] = useState('')
    const [showModal, setShowModal] = useState(false)

    const load = async () => {
        const { data } = await supabase.from('micro_tags').select('*').order('subject').order('chapter').order('concept_name')
        setTags(data || [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this concept tag? This will affect any questions linked to it.')) return
        const { error } = await supabase.from('micro_tags').delete().eq('id', id)
        if (error) { toast.error('Cannot delete — this tag is linked to existing questions.'); return }
        setTags(prev => prev.filter(t => t.id !== id))
        toast.success('Tag deleted')
    }

    const filtered = tags.filter(t => {
        const matchSearch = t.full_path.toLowerCase().includes(search.toLowerCase())
        const matchSubject = !filterSubject || t.subject === filterSubject
        return matchSearch && matchSubject
    })

    // Group by subject
    const grouped = SUBJECTS.reduce((acc, s) => {
        const subjectTags = filtered.filter(t => t.subject === s)
        if (subjectTags.length > 0) acc[s] = subjectTags
        return acc
    }, {} as Record<string, MicroTag[]>)

    const subjectColors: Record<string, string> = {
        Mathematics: 'badge-primary',
        Physics: 'badge-cyan',
        Chemistry: 'badge-orange',
        Biology: 'badge-green',
    }

    return (
        <div className="flex min-h-screen bg-cosmos-bg star-bg">
            <Sidebar />
            <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-20 md:pt-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="font-display text-2xl font-bold text-cosmos-primary">Concept Tags</h1>
                        <p className="text-cosmos-muted text-sm mt-0.5">{tags.length} tags · Every test question maps to one concept</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus size={15} /> New Tag
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="col-span-2 relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cosmos-muted" />
                        <input className="cosmos-input pl-9" placeholder="Search concepts…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="cosmos-input" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                        <option value="">All subjects</option>
                        {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div className="cosmos-card flex items-center justify-center py-16">
                        <Loader2 size={28} className="text-cosmos-primary animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(grouped).map(([subject, subjectTags]) => {
                            const chapters = [...new Set(subjectTags.map(t => t.chapter))]
                            return (
                                <div key={subject} className="cosmos-card">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className={subjectColors[subject] || 'badge-primary'}>{subject}</span>
                                        <span className="text-cosmos-muted text-xs">{subjectTags.length} concepts</span>
                                    </div>
                                    {chapters.map(chapter => (
                                        <div key={chapter} className="mb-4 last:mb-0">
                                            <div className="text-xs font-semibold text-cosmos-subtle uppercase tracking-wider mb-2 pl-1">{chapter}</div>
                                            <div className="flex flex-wrap gap-2">
                                                {subjectTags.filter(t => t.chapter === chapter).map(tag => (
                                                    <div key={tag.id} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cosmos-surface border border-cosmos-border hover:border-cosmos-primary/30 transition-colors">
                                                        <Tag size={11} className="text-cosmos-muted" />
                                                        <span className="text-sm text-cosmos-text">{tag.concept_name}</span>
                                                        <button onClick={() => handleDelete(tag.id)}
                                                            className="ml-1 opacity-0 group-hover:opacity-100 text-cosmos-muted hover:text-cosmos-red transition-all">
                                                            <Trash2 size={11} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        })}
                        {Object.keys(grouped).length === 0 && (
                            <div className="cosmos-card text-center py-16 text-cosmos-muted">No concept tags found.</div>
                        )}
                    </div>
                )}

                {showModal && (
                    <TagModal onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false) }} />
                )}
            </main>
        </div>
    )
}

function TagModal({ onClose, onSaved }: any) {
    const supabase = createClient()
    const [form, setForm] = useState({ subject: 'Mathematics', chapter: '', concept_name: '' })
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!form.chapter || !form.concept_name) { toast.error('Fill all fields'); return }
        setSaving(true)
        const { error } = await supabase.from('micro_tags').insert(form)
        if (error) { toast.error(friendlyError(error)); setSaving(false); return }
        toast.success('Tag created!')
        onSaved()
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
            <div className="bg-cosmos-card border border-cosmos-border rounded-2xl w-full max-w-md">
                <div className="p-6 border-b border-cosmos-border flex items-center justify-between">
                    <h2 className="font-display font-bold text-cosmos-primary">New Concept Tag</h2>
                    <button onClick={onClose} className="text-cosmos-muted hover:text-cosmos-text">✕</button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs text-cosmos-muted mb-1">Subject</label>
                        <select className="cosmos-input" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}>
                            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-cosmos-muted mb-1">Chapter</label>
                        <input className="cosmos-input" placeholder="e.g. Algebra" value={form.chapter} onChange={e => setForm(p => ({ ...p, chapter: e.target.value }))} />
                    </div>
                    <div>
                        <label className="block text-xs text-cosmos-muted mb-1">Concept Name</label>
                        <input className="cosmos-input" placeholder="e.g. Linear Equations" value={form.concept_name} onChange={e => setForm(p => ({ ...p, concept_name: e.target.value }))} />
                    </div>
                    <div className="bg-cosmos-surface rounded-lg p-3 text-xs text-cosmos-muted">
                        Preview: <span className="text-cosmos-primary">{form.subject} → {form.chapter || '...'} → {form.concept_name || '...'}</span>
                    </div>
                </div>
                <div className="p-6 border-t border-cosmos-border flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Create Tag
                    </button>
                </div>
            </div>
        </div>
    )
}