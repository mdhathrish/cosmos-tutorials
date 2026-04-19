'use client'
import { useEffect, useState } from 'react'
import { createClient, type Batch, type AttendanceLog } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import Sidebar from '@/components/Sidebar'
import { LogIn, LogOut, AlertCircle, Loader2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface Student { id: string; full_name: string; batch_id: string; parent_id: string; is_active: boolean }
interface AttendanceRow { student: Student; log: AttendanceLog | null }

import { useGlobalContext } from '@/lib/GlobalContext'

export default function AttendancePage() {
  const supabase = createClient()
  const { selectedInstituteId, role } = useGlobalContext()
  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    let query = supabase.from('batches').select('*').eq('is_active', true)
    if (selectedInstituteId !== 'all') {
      query = query.eq('institute_id', selectedInstituteId)
    }
    
    query.then(({ data }) => {
        const list = data || []
        setBatches(list)
        if (selectedBatch && !list.find(b => b.id === selectedBatch)) {
            setSelectedBatch('')
        }
    })
  }, [selectedInstituteId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedBatch) return
    setLoading(true)
    supabase.from('students').select('*').eq('batch_id', selectedBatch).eq('is_active', true).order('full_name')
      .then(({ data: students }) => {
        if (!students || students.length === 0) { setRows([]); setLoading(false); return }
        const ids = students.map(s => s.id)
        supabase.from('attendance_logs').select('*').eq('log_date', selectedDate).in('student_id', ids)
          .then(({ data: logs }) => {
            setRows(students.map(s => ({ student: s, log: (logs || []).find(l => l.student_id === s.id) || null })))
            setLoading(false)
          })
      })
  }, [selectedBatch, selectedDate])

  const handleCheckIn = async (studentId: string) => {
    setSaving(studentId)
    const { data, error } = await supabase.from('attendance_logs')
      .upsert({ student_id: studentId, log_date: selectedDate, check_in_time: new Date().toISOString(), status: 'present' }, { onConflict: 'student_id,log_date' })
      .select().single()
    if (error) { toast.error(friendlyError(error)); setSaving(null); return }
    setRows(prev => prev.map(r => r.student.id === studentId ? { ...r, log: data } : r))
    toast.success('Checked in ✓'); setSaving(null)
  }

  const handleCheckOut = async (studentId: string, logId: string) => {
    setSaving(studentId)
    const { data, error } = await supabase.from('attendance_logs')
      .update({ check_out_time: new Date().toISOString() }).eq('id', logId).select().single()
    if (error) { toast.error(friendlyError(error)); setSaving(null); return }
    setRows(prev => prev.map(r => r.student.id === studentId ? { ...r, log: data } : r))
    toast.success('Checked out ✓'); setSaving(null)
  }

  const handleMarkAbsent = async (studentId: string) => {
    setSaving(studentId)
    const { data: log, error } = await supabase.from('attendance_logs')
      .upsert({ student_id: studentId, log_date: selectedDate, status: 'absent' }, { onConflict: 'student_id,log_date' })
      .select().single()
    if (error) { toast.error(friendlyError(error)); setSaving(null); return }
    setRows(prev => prev.map(r => r.student.id === studentId ? { ...r, log } : r))
    toast.success('Marked absent')

    // Trigger Push Notification to parent
    const student = rows.find(r => r.student.id === studentId)?.student;
    if (student?.parent_id) {
        supabase.from('users').select('push_token').eq('id', student.parent_id).not('push_token', 'is', null).single()
        .then(({ data: parent }) => {
            if (parent?.push_token) {
                fetch('/api/send-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: parent.push_token,
                        title: '⚠️ Attendance Alert',
                        body: `${student.full_name} was marked ABSENT today.`
                    })
                }).catch(e => console.error('Absent push failed:', e))
            }
        })
    }
    setSaving(null)
  }

  const fmt = (ts: string | null) => ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
  const stats = { present: rows.filter(r => r.log?.status === 'present').length, absent: rows.filter(r => r.log?.status === 'absent').length, notMarked: rows.filter(r => !r.log).length }

  return (
    <div className="flex min-h-screen bg-cosmos-bg star-bg">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-cosmos-primary">Attendance</h1>
          <p className="text-cosmos-muted text-sm mt-0.5">Check-in and check-out · push notifications sent automatically</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-cosmos-muted uppercase tracking-wider mb-1.5">Batch</label>
            <div className="relative">
              <select className="cosmos-input appearance-none pr-8 cursor-pointer" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                <option value="">Select batch…</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name} — Grade {b.grade}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-cosmos-muted pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-cosmos-muted uppercase tracking-wider mb-1.5">Date</label>
            <input type="date" className="cosmos-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>
        </div>
        {selectedBatch && !loading && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="cosmos-card bg-cosmos-green/5 border-cosmos-green/20 text-center"><div className="text-2xl font-bold text-cosmos-green">{stats.present}</div><div className="text-xs text-cosmos-muted">Present</div></div>
            <div className="cosmos-card bg-cosmos-red/5 border-cosmos-red/20 text-center"><div className="text-2xl font-bold text-cosmos-red">{stats.absent}</div><div className="text-xs text-cosmos-muted">Absent</div></div>
            <div className="cosmos-card bg-cosmos-orange/5 border-cosmos-orange/20 text-center"><div className="text-2xl font-bold text-cosmos-orange">{stats.notMarked}</div><div className="text-xs text-cosmos-muted">Not Marked</div></div>
          </div>
        )}
        {loading ? (
          <div className="cosmos-card flex items-center justify-center py-16"><Loader2 size={28} className="text-cosmos-primary animate-spin" /></div>
        ) : rows.length > 0 ? (
          <div className="cosmos-card p-0 overflow-x-auto">
            <table className="cosmos-table min-w-[600px]">
              <thead><tr><th>Student</th><th className="text-center">Status</th><th className="text-center">Check-In</th><th className="text-center">Check-Out</th><th className="text-center">Actions</th></tr></thead>
              <tbody>
                {rows.map(({ student, log }) => (
                  <tr key={student.id}>
                    <td className="font-medium text-cosmos-text">{student.full_name}</td>
                    <td className="text-center">
                      {!log ? <span className="badge bg-cosmos-muted/10 text-cosmos-muted border border-cosmos-muted/20">Not Marked</span>
                        : log.status === 'present' ? <span className="badge-green">Present</span>
                          : log.status === 'absent' ? <span className="badge-red">Absent</span>
                            : <span className="badge-amber">Late</span>}
                    </td>
                    <td className="text-center font-mono text-sm text-cosmos-cyan">{fmt(log?.check_in_time ?? null)}</td>
                    <td className="text-center font-mono text-sm text-cosmos-muted">{fmt(log?.check_out_time ?? null)}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {saving === student.id ? <Loader2 size={16} className="text-cosmos-primary animate-spin" /> : (
                          <>
                            {(!log || log.status === 'absent') && (
                              <button onClick={() => handleCheckIn(student.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cosmos-green/10 border border-cosmos-green/20 text-cosmos-green text-xs hover:bg-cosmos-green/20 transition-colors">
                                <LogIn size={13} /> Check In
                              </button>
                            )}
                            {log?.check_in_time && !log.check_out_time && (
                              <button onClick={() => handleCheckOut(student.id, log.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cosmos-cyan/10 border border-cosmos-cyan/20 text-cosmos-cyan text-xs hover:bg-cosmos-cyan/20 transition-colors">
                                <LogOut size={13} /> Check Out
                              </button>
                            )}
                            {!log && (
                              <button onClick={() => handleMarkAbsent(student.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cosmos-red/10 border border-cosmos-red/20 text-cosmos-red text-xs hover:bg-cosmos-red/20 transition-colors">
                                <AlertCircle size={13} /> Absent
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : selectedBatch ? (
          <div className="cosmos-card text-center py-16 text-cosmos-muted">No students found in this batch.</div>
        ) : (
          <div className="cosmos-card text-center py-16 text-cosmos-muted">Select a batch to view attendance.</div>
        )}
      </main>
    </div>
  )
}