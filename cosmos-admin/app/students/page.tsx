// app/students/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient, type Student, type Batch } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import Sidebar from '@/components/Sidebar'
import { Plus, Search, Loader2, UserPlus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface StudentWithBatch extends Student {
  batches?: { batch_name: string; grade: number; subject: string }
}

export default function StudentsPage() {
  const supabase = createClient()
  const [students, setStudents] = useState<StudentWithBatch[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editStudent, setEditStudent] = useState<StudentWithBatch | null>(null)

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('*, batches(batch_name, grade, subject)')
      .eq('is_active', true)
      .order('full_name')
    setStudents(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadStudents()
    supabase.from('batches').select('*').eq('is_active', true).then(({ data }) => setBatches(data || []))
  }, [])

  const filtered = students.filter(s => s.full_name.toLowerCase().includes(search.toLowerCase()))

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this student?')) return
    const { error } = await supabase.from('students').update({ is_active: false }).eq('id', id)
    if (error) { toast.error(friendlyError(error)); return }
    setStudents(prev => prev.filter(s => s.id !== id))
    toast.success('Student deactivated')
  }

  return (
    <div className="flex min-h-screen bg-cosmos-bg star-bg">
      <Sidebar />
      <main className="ml-60 flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-cosmos-text">Students</h1>
            <p className="text-cosmos-muted text-sm mt-0.5">{students.length} active students</p>
          </div>
          <button onClick={() => { setEditStudent(null); setShowModal(true) }} className="btn-primary flex items-center gap-2 text-sm">
            <UserPlus size={15} /> Add Student
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cosmos-muted" />
          <input className="cosmos-input pl-9" placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        {loading ? (
          <div className="cosmos-card flex items-center justify-center py-16">
            <Loader2 size={28} className="text-cosmos-blue animate-spin" />
          </div>
        ) : (
          <div className="cosmos-card p-0 overflow-hidden">
            <table className="cosmos-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Grade</th>
                  <th>Batch</th>
                  <th>Subject</th>
                  <th>Enrolled</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td className="font-medium text-cosmos-text">{s.full_name}</td>
                    <td><span className="badge-purple">Grade {s.grade}</span></td>
                    <td className="text-cosmos-cyan">{s.batches?.batch_name || '—'}</td>
                    <td className="text-cosmos-muted">{s.batches?.subject || '—'}</td>
                    <td className="text-cosmos-muted text-sm">{new Date(s.enrollment_date || '').toLocaleDateString('en-IN')}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditStudent(s); setShowModal(true) }}
                          className="p-1.5 rounded-lg hover:bg-cosmos-surface text-cosmos-muted hover:text-cosmos-blue transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(s.id)}
                          className="p-1.5 rounded-lg hover:bg-cosmos-red/10 text-cosmos-muted hover:text-cosmos-red transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-cosmos-muted">No students found.</div>
            )}
          </div>
        )}

        {showModal && (
          <StudentModal
            batches={batches}
            student={editStudent}
            onClose={() => setShowModal(false)}
            onSaved={() => { loadStudents(); setShowModal(false) }}
          />
        )}
      </main>
    </div>
  )
}

function StudentModal({ batches, student, onClose, onSaved }: any) {
  const supabase = createClient()
  const [form, setForm] = useState({
    full_name: student?.full_name || '',
    grade: student?.grade || '',
    batch_id: student?.batch_id || '',
    parent_phone: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    // Validate required fields
    if (!form.full_name.trim()) { toast.error('Please enter the student name'); return }
    if (!form.grade) { toast.error('Please select a grade'); return }
    if (!form.batch_id) { toast.error('Please select a batch'); return }
    if (!student && !form.parent_phone.trim()) { toast.error('Please enter parent phone number'); return }

    setSaving(true)
    if (student) {
      const { error } = await supabase.from('students').update({
        full_name: form.full_name,
        grade: parseInt(String(form.grade)),
        batch_id: form.batch_id,
      }).eq('id', student.id)
      if (error) { toast.error(friendlyError(error)); setSaving(false); return }
    } else {
      // Format phone: ensure +91 prefix for Supabase Auth consistency
      const formattedPhone = form.parent_phone.startsWith('+') 
        ? form.parent_phone 
        : `+91${form.parent_phone.replace(/\\s/g, '')}`

      // First create/find parent user by phone
      const { data: parentData, error: parentErr } = await supabase
        .from('users').select('id').eq('phone', formattedPhone).single()

      let parentId = parentData?.id
      if (!parentId) {
        const { data: newParent, error: newParentErr } = await supabase
          .from('users').insert({ role: 'parent', full_name: `Parent of ${form.full_name}`, phone: formattedPhone }).select().single()
        if (newParentErr) { toast.error(friendlyError(newParentErr)); setSaving(false); return }
        parentId = newParent.id
      }

      const { error } = await supabase.from('students').insert({
        full_name: form.full_name,
        grade: parseInt(String(form.grade)),
        batch_id: form.batch_id,
        parent_id: parentId,
      })
      if (error) { toast.error(friendlyError(error)); setSaving(false); return }
    }
    toast.success(student ? 'Student updated!' : 'Student added!')
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-cosmos-card border border-cosmos-border rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-cosmos-border flex items-center justify-between">
          <h2 className="font-display font-bold">{student ? 'Edit Student' : 'Add New Student'}</h2>
          <button onClick={onClose} className="text-cosmos-muted hover:text-cosmos-text">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-cosmos-muted mb-1">Full Name</label>
            <input className="cosmos-input" placeholder="Student's full name" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">Grade</label>
              <select className="cosmos-input" value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}>
                <option value="">Select grade</option>
                {[8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">Batch</label>
              <select className="cosmos-input" value={form.batch_id} onChange={e => setForm(p => ({ ...p, batch_id: e.target.value }))}>
                <option value="">Select batch</option>
                {batches.map((b: Batch) => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
              </select>
            </div>
          </div>
          {!student && (
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">Parent Phone Number</label>
              <input className="cosmos-input" placeholder="+91 XXXXX XXXXX" value={form.parent_phone} onChange={e => setForm(p => ({ ...p, parent_phone: e.target.value }))} />
              <p className="text-xs text-cosmos-muted mt-1">Parent account will be auto-created if new.</p>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-cosmos-border flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {student ? 'Update' : 'Add Student'}
          </button>
        </div>
      </div>
    </div>
  )
}
