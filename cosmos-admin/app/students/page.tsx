// app/students/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient, type Student, type Batch } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import Sidebar from '@/components/Sidebar'
import { Plus, Search, Loader2, UserPlus, Pencil, Trash2, Eye, EyeOff, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

interface StudentWithBatch extends Student {
  batches?: { batch_name: string; grade: number; subject: string }
  users?: { id: string, auth_id: string, email: string | null; full_name: string }
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
      .select('*, batches(batch_name, grade, subject), users(id, auth_id, email, full_name)')
      .eq('is_active', true)

      .order('full_name')
    setStudents(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadStudents()
    supabase.from('batches').select('*').eq('is_active', true).then(({ data }) => setBatches(data || []))
  }, [])

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.users?.email || '').toLowerCase().includes(search.toLowerCase())
  )

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
      <main className="md:ml-60 flex-1 p-4 md:p-6 w-full max-w-[100vw]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-cosmos-primary">Students</h1>
            <p className="text-cosmos-muted text-sm mt-0.5">{students.length} active students</p>
          </div>
          <button onClick={() => { setEditStudent(null); setShowModal(true) }} className="btn-primary flex items-center gap-2 text-sm">
            <UserPlus size={15} /> Add Student
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cosmos-muted" />
          <input className="cosmos-input pl-9" placeholder="Search students or parent email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="cosmos-card bg-cosmos-blue/5 border-cosmos-blue/20 mb-4">
          <p className="text-xs text-cosmos-muted">
            <span className="text-cosmos-primary font-semibold">Login system:</span>{' '}
            Parents log in with email + password. Share credentials via WhatsApp. No OTP, no SMS — free forever.
          </p>
        </div>

        {loading ? (
          <div className="cosmos-card flex items-center justify-center py-16">
            <Loader2 size={28} className="text-cosmos-primary animate-spin" />
          </div>
        ) : (
          <div className="cosmos-card p-0 overflow-hidden">
            <table className="cosmos-table">
              <thead>
                <tr>
                  <th>Student</th><th>Grade</th><th>Batch</th>
                  <th>Parent Email</th><th>Enrolled</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td className="font-medium text-cosmos-text">{s.full_name}</td>
                    <td><span className="badge-blue">Grade {s.grade}</span></td>
                    <td className="text-cosmos-cyan">{s.batches?.batch_name || '—'}</td>
                    <td>
                      {s.users?.email ? (
                        <div className="flex items-center gap-2">
                          <span className="text-cosmos-muted text-sm font-mono">{s.users.email}</span>
                          <button onClick={() => { navigator.clipboard.writeText(s.users?.email || ''); toast.success('Copied!') }}
                            className="p-1 rounded hover:bg-cosmos-surface text-cosmos-subtle hover:text-cosmos-primary transition-colors">
                            <Copy size={11} />
                          </button>
                        </div>
                      ) : <span className="text-cosmos-subtle text-xs">No email</span>}
                    </td>
                    <td className="text-cosmos-muted text-sm">
                      {s.enrollment_date ? new Date(s.enrollment_date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditStudent(s); setShowModal(true) }}
                          className="p-1.5 rounded-lg hover:bg-cosmos-surface text-cosmos-muted hover:text-cosmos-primary transition-colors">
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
            {filtered.length === 0 && <div className="text-center py-12 text-cosmos-muted">No students found.</div>}
          </div>
        )}

        {showModal && (
          <StudentModal batches={batches} student={editStudent}
            onClose={() => setShowModal(false)}
            onSaved={() => { loadStudents(); setShowModal(false) }} />
        )}
      </main>
    </div>
  )
}

function StudentModal({ batches, student, onClose, onSaved }: any) {
  const supabase = createClient()
  const [form, setForm] = useState({
    full_name: student?.full_name || '', grade: student?.grade || '',
    batch_id: student?.batch_id || '', parent_name: student?.users?.full_name || '',
    parent_email: student?.users?.email || '', parent_password: '',
    address: student?.address || '', parent_number: student?.parent_number || '',
    student_number: student?.student_number || '', school_name: student?.school_name || '',
    school_board: student?.school_board || '',
    monthly_fee: student?.monthly_fee !== undefined ? student.monthly_fee : 2000,
  })

  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)

  const generatePassword = () => {
    const adj = ['Swift', 'Bright', 'Bold', 'Smart', 'Sharp', 'Cool', 'Grand', 'Quick']
    const noun = ['Star', 'Moon', 'Comet', 'Nova', 'Orbit', 'Sky', 'Sun', 'Mars']
    const num = Math.floor(100 + Math.random() * 900)
    setForm(p => ({ ...p, parent_password: `${adj[Math.floor(Math.random() * 8)]}${noun[Math.floor(Math.random() * 8)]}${num}!` }))
    setShowPass(true)
  }

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Enter student name'); return }
    if (!form.grade) { toast.error('Select a grade'); return }
    if (!form.batch_id) { toast.error('Select a batch'); return }
    setSaving(true)

    if (student) {
      if (form.parent_email.trim() && student.users?.auth_id) {
         let shouldUpdateAuth = form.parent_email !== student.users.email || form.parent_password !== '' || form.parent_name !== student.users.full_name
         if (shouldUpdateAuth) {
           const res = await fetch('/api/update-parent', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               auth_id: student.users.auth_id,
               email: form.parent_email.trim().toLowerCase(),
               password: form.parent_password || undefined,
               full_name: form.parent_name || undefined
             })
           })
           if (!res.ok) {
             const result = await res.json()
             toast.error(result.error)
             setSaving(false)
             return
           }
         }
      }
      if (student.parent_id && form.parent_email.trim() && (form.parent_email !== student.users?.email || form.parent_name !== student.users?.full_name)) {
         await supabase.from('users').update({
           email: form.parent_email.trim().toLowerCase(),
           full_name: form.parent_name || `Parent of ${form.full_name}`
         }).eq('id', student.parent_id)
      }

      const { error } = await supabase.from('students').update({
        full_name: form.full_name, grade: parseInt(String(form.grade)), batch_id: form.batch_id,
        address: form.address, parent_number: form.parent_number, student_number: form.student_number,
        school_name: form.school_name, school_board: form.school_board, monthly_fee: parseInt(String(form.monthly_fee)) || 0
      }).eq('id', student.id)
      if (error) { toast.error(friendlyError(error)); setSaving(false); return }
      toast.success('Student updated!'); onSaved(); return
    }

    if (!form.parent_email.trim()) { toast.error('Enter parent email'); setSaving(false); return }

    if (!form.parent_password.trim()) { toast.error('Set a password'); setSaving(false); return }
    if (form.parent_password.length < 6) { toast.error('Password min 6 characters'); setSaving(false); return }

    // Step 1: Create auth user via API route (uses service role key server-side)
    const res = await fetch('/api/create-parent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.parent_email.trim().toLowerCase(),
        password: form.parent_password,
        full_name: form.parent_name || `Parent of ${form.full_name}`,
      }),
    })
    const result = await res.json()
    if (!res.ok) {
      toast.error(result.error?.includes('already registered') ? 'This email is already registered.' : result.error)
      setSaving(false); return
    }

    // Step 2: Wait for trigger, then find/create parent in public.users
    await new Promise(r => setTimeout(r, 1000))

    let parentId: string | null = null
    const { data: existingUser } = await supabase.from('users').select('id')
      .eq('email', form.parent_email.trim().toLowerCase()).single()

    if (existingUser) {
      parentId = existingUser.id
    } else {
      const { data: newUser, error: userError } = await supabase.from('users').insert({
        auth_id: result.user_id, role: 'parent',
        full_name: form.parent_name || `Parent of ${form.full_name}`,
        email: form.parent_email.trim().toLowerCase(),
      }).select('id').single()
      if (userError) { toast.error(friendlyError(userError)); setSaving(false); return }
      parentId = newUser.id
    }

    // Step 3: Create student
    const { error: studentError } = await supabase.from('students').insert({
      full_name: form.full_name, grade: parseInt(String(form.grade)),
      batch_id: form.batch_id, parent_id: parentId,
      address: form.address, parent_number: form.parent_number, student_number: form.student_number,
      school_name: form.school_name, school_board: form.school_board, monthly_fee: parseInt(String(form.monthly_fee)) || 0
    })
    if (studentError) { toast.error(friendlyError(studentError)); setSaving(false); return }


    toast.success(`✅ Student added! Login created.`, { duration: 5000 })
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-10 px-4">
      <div className="bg-cosmos-card border border-cosmos-border rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-6 border-b border-cosmos-border flex items-center justify-between sticky top-0 bg-cosmos-card z-10">
          <h2 className="font-display font-bold text-cosmos-primary">{student ? 'Edit Student' : 'Add New Student'}</h2>
          <button onClick={onClose} className="text-cosmos-muted hover:text-cosmos-text">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-xs font-semibold text-cosmos-muted uppercase tracking-wider">Student Details</div>
          <div>
            <label className="block text-xs text-cosmos-muted mb-1">Full Name *</label>
            <input className="cosmos-input" placeholder="Student's full name"
              value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">Grade *</label>
              <select className="cosmos-input" value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}>
                <option value="">Select grade</option>
                {[8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">Batch *</label>
              <select className="cosmos-input" value={form.batch_id} onChange={e => setForm(p => ({ ...p, batch_id: e.target.value }))}>
                <option value="">Select batch</option>
                {batches.map((b: Batch) => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">Student Phone</label>
              <input className="cosmos-input" placeholder="Optional"
                value={form.student_number} onChange={e => setForm(p => ({ ...p, student_number: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">Parent Phone</label>
              <input className="cosmos-input" placeholder="Optional"
                value={form.parent_number} onChange={e => setForm(p => ({ ...p, parent_number: e.target.value }))} />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-cosmos-muted mb-1">Address</label>
            <input className="cosmos-input" placeholder="Home address"
              value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">School Name</label>
              <input className="cosmos-input" placeholder="e.g. DPS"
                value={form.school_name} onChange={e => setForm(p => ({ ...p, school_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">School Board</label>
              <input className="cosmos-input" placeholder="e.g. CBSE"
                value={form.school_board} onChange={e => setForm(p => ({ ...p, school_board: e.target.value }))} />
            </div>
          </div>
          <div className="mt-3">
             <label className="block text-xs text-cosmos-muted mb-1">Monthly Fee (₹)</label>
             <input className="cosmos-input" placeholder="2000" type="number"
               value={form.monthly_fee} onChange={e => setForm(p => ({ ...p, monthly_fee: e.target.value as any }))} />
          </div>

          <div className="border-t border-cosmos-border pt-4">
            <div className="text-xs font-semibold text-cosmos-muted uppercase tracking-wider mb-3">Parent Login Details</div>
            {!student && (
              <p className="text-xs text-cosmos-muted mb-3 bg-cosmos-surface rounded-lg p-3 border border-cosmos-border">
                Send these to the parent via WhatsApp. They use email + password to log in. Free forever.
              </p>
            )}
            {student && (
              <p className="text-xs text-cosmos-muted mb-3 bg-cosmos-surface rounded-lg p-3 border border-cosmos-border">
                Leave password blank if you do not wish to change it.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-cosmos-muted mb-1">Parent Name</label>
            <input className="cosmos-input" placeholder="e.g. Ramesh Kumar (optional)"
              value={form.parent_name} onChange={e => setForm(p => ({ ...p, parent_name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-cosmos-muted mb-1">Parent Email *</label>
            <input className="cosmos-input" placeholder="parent@gmail.com" type="email"
              value={form.parent_email} onChange={e => setForm(p => ({ ...p, parent_email: e.target.value }))} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-cosmos-muted">{student ? 'New Password' : 'Password *'}</label>
              <button onClick={generatePassword} className="text-xs text-cosmos-primary hover:text-cosmos-peach transition-colors">
                ✨ Generate password
              </button>
            </div>
            <div className="relative">
              <input className="cosmos-input pr-10" type={showPass ? 'text' : 'password'}
                placeholder="Min 6 characters" value={form.parent_password}
                onChange={e => setForm(p => ({ ...p, parent_password: e.target.value }))} />
              <button onClick={() => setShowPass(p => !p)} type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cosmos-muted hover:text-cosmos-text">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {!student && form.parent_email && form.parent_password && (
            <div className="bg-cosmos-green/5 border border-cosmos-green/20 rounded-lg p-3">
              <p className="text-xs text-cosmos-green font-semibold mb-1">📲 WhatsApp message to send:</p>
              <p className="text-xs text-cosmos-muted font-mono whitespace-pre-wrap">{`Hi! Your Cosmos Tutorials parent app login:\n📧 Email: ${form.parent_email}\n🔑 Password: ${form.parent_password}\n📱 Download: Cosmos Tutorials app`}</p>
              <button onClick={() => { navigator.clipboard.writeText(`Hi! Your Cosmos Tutorials parent app login:\n📧 Email: ${form.parent_email}\n🔑 Password: ${form.parent_password}\n📱 Download: Cosmos Tutorials app`); toast.success('Copied!') }}
                className="mt-2 text-xs text-cosmos-green hover:text-cosmos-text flex items-center gap-1">
                <Copy size={11} /> Copy message
              </button>
            </div>
          )}

        </div>
        <div className="p-6 border-t border-cosmos-border flex justify-end gap-3 sticky bottom-0 bg-cosmos-card">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {student ? 'Update Student' : 'Add Student & Create Login'}
          </button>
        </div>
      </div>
    </div>
  )
}