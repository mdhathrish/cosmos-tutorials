'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Loader2, Plus, UserPlus, Trash2, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGlobalContext } from '@/lib/GlobalContext'

interface Teacher {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  institute_id: string
}

interface Batch {
  id: string
  batch_name: string
  grade: number
}

export default function TeachersPage() {
  const supabase = createClient()
  const { selectedInstituteId, role } = useGlobalContext()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ full_name: '', email: '', password: '' })
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [assignedBatches, setAssignedBatches] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedInstituteId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true)
    
    // 1. Fetch teachers
    let tQuery = supabase
      .from('users')
      .select('id, full_name, email, phone, institute_id')
      .eq('role', 'teacher')
    
    if (selectedInstituteId !== 'all') {
      tQuery = tQuery.eq('institute_id', selectedInstituteId)
    }
    
    const { data: tData } = await tQuery
    if (tData) setTeachers(tData as Teacher[])

    // 2. Fetch batches
    let bQuery = supabase
      .from('batches')
      .select('id, batch_name, grade')
      .eq('is_active', true)

    if (selectedInstituteId !== 'all') {
      bQuery = bQuery.eq('institute_id', selectedInstituteId)
    }
    
    const { data: bData } = await bQuery
    if (bData) setBatches(bData)

    setLoading(false)
  }

  const loadAssignments = async (teacherId: string) => {
    const { data } = await supabase
      .from('teacher_batches')
      .select('batch_id')
      .eq('teacher_id', teacherId)
    if (data) setAssignedBatches(data.map(d => d.batch_id))
    else setAssignedBatches([])
  }

  const handleOpenAssign = (t: Teacher) => {
    setSelectedTeacher(t)
    loadAssignments(t.id)
    setShowModal(true)
  }

  const handleSaveAssignments = async () => {
    if (!selectedTeacher) return
    setSaving(true)

    // Delete existing
    await supabase.from('teacher_batches').delete().eq('teacher_id', selectedTeacher.id)

    // Insert new
    if (assignedBatches.length > 0) {
      const inserts = assignedBatches.map(bId => ({
        teacher_id: selectedTeacher.id,
        batch_id: bId
      }))
      const { error } = await supabase.from('teacher_batches').insert(inserts)
      if (error) toast.error(error.message)
      else toast.success('Assignments updated!')
    } else {
      toast.success('Assignments updated!')
    }

    setSaving(false)
    setShowModal(false)
  }

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.full_name || !createForm.email || !createForm.password) return

    setCreating(true)
    const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...createForm,
            role: 'teacher',
            institute_id: selectedInstituteId === 'all' ? null : selectedInstituteId
        })
    })
    const result = await res.json()

    if (result.success) {
      toast.success('Teacher account created!')
      setCreateForm({ full_name: '', email: '', password: '' })
      setShowCreateModal(false)
      loadData()
    } else {
      toast.error(result.error || 'Failed to create teacher')
    }
    setCreating(false)
  }

  const toggleBatch = (id: string) => {
    setAssignedBatches(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    )
  }

  return (
    <div className="flex min-h-screen bg-cosmos-bg">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-cosmos-text">Teachers & Access</h1>
            <p className="text-cosmos-muted text-sm mt-1">Manage staff privileges and access scopes for {selectedInstituteId === 'all' ? 'all institutes' : 'this center'}.</p>
          </div>
          <button 
            onClick={() => {
                if(selectedInstituteId === 'all') {
                    toast.error('Select an institute to add a teacher')
                } else {
                    setShowCreateModal(true)
                }
            }} 
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <UserPlus size={16} /> Add Teacher
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-cosmos-primary" /></div>
        ) : teachers.length === 0 ? (
          <div className="cosmos-card text-center py-12 text-cosmos-muted">No teachers found in this scope. Add a teacher or change center.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers.map(t => (
              <div key={t.id} className="cosmos-card border border-cosmos-border/50 group hover:border-cosmos-primary/40 p-5 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-cosmos-primary/10 flex items-center justify-center font-bold text-cosmos-primary">
                    {t.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-cosmos-text text-sm leading-none">{t.full_name}</h3>
                    <p className="text-cosmos-muted text-xs mt-1">{t.email || t.phone || 'No contact'}</p>
                  </div>
                </div>

                <div className="border-t border-cosmos-border/40 pt-3 mt-3 flex items-center justify-between">
                  <span className="text-xs text-cosmos-muted">Assigned Scopes</span>
                  <button onClick={() => handleOpenAssign(t)} className="text-xs font-semibold text-cosmos-primary hover:underline">
                    Manage Batches
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && selectedTeacher && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
            <div className="bg-cosmos-card border border-cosmos-border rounded-2xl w-full max-w-md">
              <div className="p-5 border-b border-cosmos-border flex items-center justify-between">
                <h2 className="font-display font-bold text-sm">Assign Batches to {selectedTeacher.full_name}</h2>
                <button onClick={() => setShowModal(false)} className="text-cosmos-muted hover:text-cosmos-text">✕</button>
              </div>
              <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                {batches.map(b => (
                  <label key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-cosmos-border/60 hover:bg-cosmos-primary/[0.03] cursor-pointer">
                    <div>
                      <p className="font-semibold text-sm text-cosmos-text">{b.batch_name}</p>
                      <p className="text-xs text-cosmos-muted">Grade {b.grade}</p>
                    </div>
                    <input type="checkbox" className="rounded border-cosmos-border text-cosmos-primary focus:ring-cosmos-primary bg-transparent w-4 h-4"
                      checked={assignedBatches.includes(b.id)} onChange={() => toggleBatch(b.id)} />
                  </label>
                ))}
                {batches.length === 0 && (
                    <div className="text-center py-6 text-cosmos-muted text-xs">No batches available to assign.</div>
                )}
              </div>
              <div className="p-5 border-t border-cosmos-border flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary text-xs">Cancel</button>
                <button onClick={handleSaveAssignments} disabled={saving} className="btn-primary text-xs flex items-center gap-2">
                  {saving && <Loader2 size={12} className="animate-spin" />} Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
            <div className="bg-cosmos-card border border-cosmos-border rounded-2xl w-full max-w-sm">
              <div className="p-5 border-b border-cosmos-border flex items-center justify-between">
                <h2 className="font-display font-bold text-sm">Add New Teacher</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-cosmos-muted hover:text-cosmos-text">✕</button>
              </div>
              <form onSubmit={handleCreateTeacher} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs text-cosmos-muted mb-1">Full Name *</label>
                  <input type="text" className="cosmos-input text-sm" placeholder="e.g. John Doe"
                    value={createForm.full_name} onChange={e => setCreateForm(p => ({ ...p, full_name: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs text-cosmos-muted mb-1">Email Address *</label>
                  <input type="email" className="cosmos-input text-sm" placeholder="teacher@cosmos.com"
                    value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs text-cosmos-muted mb-1">Password *</label>
                  <input type="password" minLength={6} className="cosmos-input text-sm" placeholder="Min 6 characters"
                    value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} required />
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary text-xs">Cancel</button>
                  <button type="submit" disabled={creating} className="btn-primary text-xs flex items-center gap-2">
                    {creating && <Loader2 size={12} className="animate-spin" />} Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
